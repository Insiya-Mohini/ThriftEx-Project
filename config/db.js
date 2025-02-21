const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
    connectionLimit: 10, // Maximum number of connections in the pool
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 0, // Unlimited queue limit
});

// Handle unexpected disconnections
pool.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection was closed. Reconnecting...');
        handleReconnect();
    } else {
        throw err;
    }
});

// Expose pool with promise wrapper for async/await
const db = pool.promise();

module.exports = db;
