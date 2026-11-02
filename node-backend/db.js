require('dotenv'.config();

const MySQL = require('mysql2/promise');

const pool = MySQL.createPool({
connection: env(DATABASE_URL),
waitForConnections: true,
connectionLimit: 10,
charset: 'utf8mb4'
});