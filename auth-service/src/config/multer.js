const multer = require('multer');
const path = require("path");
const fs = require("fs");

// We will save all uploaded files into an "uploads" folder
const uploadDir = path.join(__dirname, "../../uploads");

// Automatically create the folder if it doesn't exist yet
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure how Multer saves the files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // We make the filename totally unique so two users uploading "avatar.png" don't overwrite each other!

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, req.user.userId + "-" + uniqueSuffix + path.extname(file.originalname));

    },

});

// Create the final upload middleware (and restrict file size to 5MB max)
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;