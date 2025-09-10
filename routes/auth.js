// This file handles login and register requests

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// REGISTER ROUTE - When someone wants to sign up
router.post('/register', async (req, res) => {
    try {
        // Get data from the form
        const { username, email, password } = req.body;

        // Check if all fields are filled
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill all fields' 
            });
        }

        // Check if password is long enough
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters' 
            });
        }

        // Check if username already exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already taken' 
            });
        }

        // Create the new user
        const userId = await User.create(username, email, password);
        
        // Send success response
        res.status(201).json({ 
            success: true, 
            message: 'Account created successfully!'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Something went wrong' 
        });
    }
});

// LOGIN ROUTE - When someone wants to log in
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if fields are filled
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter username and password' 
            });
        }

        // Find the user
        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        // Check if password is correct
        const isValidPassword = await User.validatePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        // Create a token (like a temporary pass)
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Token expires in 24 hours
        );

        // Send success response with token
        res.json({ 
            success: true, 
            message: 'Login successful!',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Something went wrong' 
        });
    }
});

// MIDDLEWARE - Checks if user is logged in (has valid token)
const requireAuth = (req, res, next) => {
    // Get token from header
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'You must be logged in' 
        });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Save user info to request
        next(); // Continue to next function
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// PROTECTED ROUTE - Only logged-in users can access
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findByUsername(req.user.username);
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                created_at: user.created_at
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error getting profile' 
        });
    }
});

module.exports = router;