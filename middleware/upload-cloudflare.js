// Upload Middleware cho Cloudflare Images
const multer = require('multer');

// Cấu hình memory storage (không lưu file local, chỉ lưu trong memory)
const storage = multer.memoryStorage();

// Filter file types cho Cloudflare Images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/; // Cloudflare Images hỗ trợ các format này
  const mimetype = allowedTypes.test(file.mimetype);
  const ext = /\.(jpeg|jpg|png|gif|webp)$/i.test(file.originalname);

  if (mimetype && ext) {
    return cb(null, true);
  }
  cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
};

const uploadCloudflare = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB (Cloudflare Images limit)
  },
  fileFilter: fileFilter
});

module.exports = uploadCloudflare;
