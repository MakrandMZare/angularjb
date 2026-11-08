const {
  applicationDefault,
  getApps,
  initializeApp
} = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function getFirebaseAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is required');
  }

  const app =
    getApps().find((registeredApp) => registeredApp.options.projectId === projectId) ||
    initializeApp(
      {
        credential: applicationDefault(),
        projectId
      },
      `janbazar-auth-${projectId}`
    );

  return getAuth(app);
}

async function verifyFirebasePhoneIdToken(idToken) {
  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw new Error('A Firebase ID token is required');
  }

  const decodedToken = await getFirebaseAuth().verifyIdToken(idToken);
  if (
    decodedToken.firebase?.sign_in_provider !== 'phone' ||
    typeof decodedToken.phone_number !== 'string' ||
    !decodedToken.phone_number
  ) {
    throw new Error('Firebase ID token is not from phone authentication');
  }

  return {
    uid: decodedToken.uid,
    phoneNumber: decodedToken.phone_number
  };
}

module.exports = { verifyFirebasePhoneIdToken };
