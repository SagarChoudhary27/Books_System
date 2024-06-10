const cloudinary = require("cloudinary").v2;
const multer = require('multer');
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "Books",
        format: "pdf",
    },
});

// const storage = multer.diskStorage({
//     destination: './uploads/',
//     filename: function(req, file, cb) {
//       cb(null, file.originalname);
//     }
//   });

module.exports = {
    cloudinary,
    storage,
};
