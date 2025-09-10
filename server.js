const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const fs = require('fs');

// Ensure public directories exist for file uploads
const publicDirs = ['public/units', 'public/lessons', 'public/tests'];
publicDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use a temporary directory first, we'll move the file later
        const tempPath = path.join(__dirname, 'public', 'temp');
        
        // Ensure temp directory exists
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }
        
        cb(null, tempPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        const newFilename = `${baseName}_${timestamp}${extension}`;
        cb(null, newFilename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept common file types based on mimetype
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/zip', 'application/x-rar-compressed',
            'video/mp4', 'audio/mpeg'
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            return cb(null, true);
        } else {
            cb(new Error('File type not allowed'));
        }
    }
});

// Import auth routes if available
const authRoutes = (() => {
    try {
        return require('./routes/auth');
    } catch (error) {
        return null;
    }
})();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Add debugging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Auth routes (if available)
if (authRoutes) {
    app.use('/api/auth', authRoutes);
}

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!', 
        timestamp: new Date().toISOString(),
        server: 'File Upload Server'
    });
});

// API route to list files in folders
app.get('/api/list-files/:folder', (req, res) => {
    const folder = req.params.folder;
    const allowedFolders = ['units', 'lessons', 'tests'];
    
    if (!allowedFolders.includes(folder)) {
        return res.status(400).json({ error: 'Invalid folder' });
    }
    
    const dirPath = path.join(__dirname, 'public', folder);
    fs.readdir(dirPath, (err, files) => {
        if (err) {
            console.error('Error reading folder:', err);
            return res.status(500).json({ error: 'Unable to read folder' });
        }
        
        const allFiles = files.filter(f => !f.startsWith('.'));
        res.json(allFiles);
    });
});

// File upload route
app.post('/api/upload', (req, res, next) => {
    console.log('DEBUG - Upload route hit');
    console.log('DEBUG - Content-Type:', req.headers['content-type']);
    next();
}, upload.single('filename'), (req, res) => {
    console.log('DEBUG - After multer processing');
    console.log('DEBUG - req.file:', req.file);
    console.log('DEBUG - req.body:', req.body);
    
    try {
        if (!req.file) {
            console.log('ERROR - No file received');
            return res.status(400).json({ 
                success: false, 
                error: 'No file was selected' 
            });
        }

        const category = req.body.category;
        if (!category || !['units', 'lessons', 'tests'].includes(category)) {
            console.log('ERROR - Invalid category:', category);
            return res.status(400).json({ 
                success: false, 
                error: 'No category was selected' 
            });
        }

        // Now move the file to the correct category folder
        const tempFilePath = req.file.path;
        const finalDirectory = path.join(__dirname, 'public', category);
        const finalFilePath = path.join(finalDirectory, req.file.filename);
        
        // Ensure final directory exists
        if (!fs.existsSync(finalDirectory)) {
            fs.mkdirSync(finalDirectory, { recursive: true });
        }
        
        // Move file from temp to final location
        fs.renameSync(tempFilePath, finalFilePath);
        
        console.log('SUCCESS - File moved to:', finalFilePath);

        const { filename, originalname, size, mimetype } = req.file;

        const result = {
            success: true,
            message: 'File uploaded successfully',
            file: {
                originalName: originalname,
                filename: filename,
                category: category,
                size: size,
                mimetype: mimetype,
                url: `/${category}/${filename}`
            }
        };
        
        res.json(result);

    } catch (error) {
        console.error('CATCH ERROR:', error);
        res.status(500).json({
            success: false,
            error: 'Upload failed: ' + error.message
        });
    }
});

// Route to serve the upload form
app.get('/upload', (req, res) => {
    console.log('Upload page requested');
    const uploadPath = path.join(__dirname, 'public', 'upload.html');
    console.log('Looking for file at:', uploadPath);
    
    if (fs.existsExists(uploadPath)) {
        console.log('File found, sending...');
        res.sendFile(uploadPath);
    } else {
        console.log('File not found!');
        res.status(404).json({ error: 'Upload form not found' });
    }
});

// Route for home page
app.get('/', (req, res) => {
    const homePath = path.join(__dirname, 'public', 'home.html');
    
    if (fs.existsSync(homePath)) {
        res.sendFile(homePath);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>File Upload Server</title></head>
            <body>
                <h1>File Upload Server</h1>
                <p>Server is running successfully!</p>
                <ul>
                    <li><a href="/upload">Upload Files</a></li>
                    <li><a href="/api/test">Test API</a></li>
                    <li><a href="/api/list-files/units">List Units</a></li>
                    <li><a href="/api/list-files/lessons">List Lessons</a></li>
                    <li><a href="/api/list-files/tests">List Tests</a></li>
                </ul>
            </body>
            </html>
        `);
    }
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
    console.error('Error middleware triggered:', error.message);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: 'Upload error'
        });
    }
    
    if (error) {
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
    
    next();
});

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});

// Start the server
app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
 console.log('Upload directories created:', publicDirs.join(', '));
   if (authRoutes) {
     console.log('Auth routes loaded');
    }
});
