// This file connects to our database

const mysql = require('mysql2');
require('dotenv').config(); // This loads our .env file

// Create a connection pool (fancy way to connect to database)
const pool = mysql.createPool({
    host: process.env.DB_HOST,        // Where is database? (localhost)
    user: process.env.DB_USER,        // Database username
    password: process.env.DB_PASSWORD, // Database password
    database: process.env.DB_NAME,    // Database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export this so other files can use it
module.exports = pool.promise();