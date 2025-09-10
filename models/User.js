// This file has all the functions to work with users in the database

const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    
    // Function to create a new user
    static async create(username, email, password) {
        // Hash (encrypt) the password so it's safe to store
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user into database
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        
        return result.insertId; // Return the new user's ID
    }

    // Function to find a user by username
    static async findByUsername(username) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0]; // Return the user (or undefined if not found)
    }

    // Function to check if password is correct
    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = User;