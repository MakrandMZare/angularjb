const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const authenticateToken = require('../middleware/authenticateToken');
const pool = require('../db');

const router = express.Router();
const photoDirectory = path.join(__dirname, '..', '..', 'uploads', 'profile-photos');
const imageTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(photoDirectory, { recursive: true }).then(
        () => callback(null, photoDirectory),
        callback
      );
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${imageTypes.get(file.mimetype)}`);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!imageTypes.has(file.mimetype)) {
      return callback(new Error('Choose a JPEG, PNG, or WebP profile photo'));
    }
    return callback(null, true);
  }
});

function parseProfileUpload(req, res, next) {
  upload.single('photo')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Profile photos must be 3 MB or smaller' });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Choose one valid profile photo' });
    }
    if (error.message === 'Choose a JPEG, PNG, or WebP profile photo') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Receiving profile photo failed:', error.message);
    return res.status(500).json({ error: 'Could not receive profile photo' });
  });
}

function isValidImage(filePath, mimeType) {
  return fs.readFile(filePath).then((bytes) => {
    if (mimeType === 'image/jpeg') {
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    return (
      mimeType === 'image/webp' &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP'
    );
  });
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function validImagePath(imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.startsWith('profile-photos/')) {
    return null;
  }

  const filename = path.basename(imagePath);
  if (filename !== imagePath.slice('profile-photos/'.length)) {
    return null;
  }

  return path.join(photoDirectory, filename);
}

async function removePhotoFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Removing profile photo failed:', error.message);
    }
  }
}

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT user_id, username, email, mobile, role, date_of_birth, gender,
              profile_image_path, created_at
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.sub]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: rows[0] });
  } catch (error) {
    console.error('Loading authenticated user failed:', error.message);
    return res.status(500).json({ error: 'Could not load user' });
  }
});

router.put('/me', authenticateToken, parseProfileUpload, async (req, res) => {
  const { dateOfBirth, gender } = req.body;
  const normalizedDate = typeof dateOfBirth === 'string' ? dateOfBirth.trim() : '';
  const normalizedGender = typeof gender === 'string' ? gender.trim() : '';
  const allowedGenders = new Set(['female', 'male', 'non-binary', 'prefer-not-to-say']);
  const uploadedPhotoPath = req.file?.path;

  if (!normalizedDate || !isValidDate(normalizedDate)) {
    await removePhotoFile(uploadedPhotoPath);
    return res.status(400).json({ error: 'Enter a valid date of birth' });
  }
  if (!normalizedGender || !allowedGenders.has(normalizedGender)) {
    await removePhotoFile(uploadedPhotoPath);
    return res.status(400).json({ error: 'Choose a valid gender option' });
  }
  if (normalizedDate > new Date().toISOString().slice(0, 10)) {
    await removePhotoFile(uploadedPhotoPath);
    return res.status(400).json({ error: 'Date of birth cannot be in the future' });
  }

  let profileSaved = false;
  try {
    if (req.file && !(await isValidImage(req.file.path, req.file.mimetype))) {
      await removePhotoFile(req.file.path);
      return res.status(400).json({ error: 'The uploaded file is not a valid image' });
    }

    const [existingRows] = await pool.execute(
      'SELECT profile_image_path FROM users WHERE user_id = ? LIMIT 1',
      [req.user.sub]
    );
    if (existingRows.length === 0) {
      await removePhotoFile(uploadedPhotoPath);
      return res.status(404).json({ error: 'User not found' });
    }

    const imagePath = req.file
      ? path.posix.join('profile-photos', path.basename(req.file.filename))
      : null;
    await pool.execute(
      `UPDATE users
       SET date_of_birth = ?, gender = ?,
           profile_image_path = COALESCE(?, profile_image_path)
       WHERE user_id = ?`,
      [normalizedDate, normalizedGender, imagePath, req.user.sub]
    );
    profileSaved = true;

    const [rows] = await pool.execute(
      `SELECT user_id, username, email, mobile, role, date_of_birth, gender,
              profile_image_path, created_at
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.sub]
    );

    if (req.file) {
      const previousPhotoPath = validImagePath(existingRows[0].profile_image_path);
      if (previousPhotoPath && previousPhotoPath !== req.file.path) {
        await removePhotoFile(previousPhotoPath);
      }
    }
    return res.json({ user: rows[0] });
  } catch (error) {
    if (!profileSaved) await removePhotoFile(uploadedPhotoPath);
    console.error('Saving authenticated user profile failed:', error.message);
    return res.status(500).json({ error: 'Could not save your profile' });
  }
});

router.get('/me/photo', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT profile_image_path FROM users WHERE user_id = ? LIMIT 1',
      [req.user.sub]
    );
    const photoPath = validImagePath(rows[0]?.profile_image_path);
    if (!photoPath) {
      return res.status(404).json({ error: 'Profile photo not found' });
    }

    return res.sendFile(photoPath, (error) => {
      if (error && !res.headersSent) {
        console.error('Loading authenticated profile photo failed:', error.message);
        res.status(error.statusCode || 500).json({ error: 'Could not load profile photo' });
      }
    });
  } catch (error) {
    console.error('Loading authenticated profile photo failed:', error.message);
    return res.status(500).json({ error: 'Could not load profile photo' });
  }
});

module.exports = router;
