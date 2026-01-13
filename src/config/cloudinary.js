const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "cmms/photos",
    resource_type: "image",
  },
});

const signatureStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "cmms/signatures",
    resource_type: "image",
    format: "png", // 🔥 QUAN TRỌNG NHẤT
    public_id: `signature_${Date.now()}`, // 🔥 TRÁNH LỖI
  }),
});

exports.uploadImage = multer({ storage: imageStorage });
exports.uploadSignature = multer({ storage: signatureStorage });
