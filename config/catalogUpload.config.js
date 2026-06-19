const multer = require("multer");
const path = require("path");
const fs = require("fs");

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
  }
};

function createCatalogUpload(folder) {
  const uploadDir = path.join("uploads", folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      const safeName = `${folder}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, safeName);
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  });
}

const productUpload = createCatalogUpload("products");
const materialUpload = createCatalogUpload("materials");

const formatCatalogItem = (item) => {
  return {
    id: item._id, // مهم جداً لتوحيد الـ frontend
    name: item.name,
    artist: item.artist,
    price: item.price,
    currency: item.currency,
    rating: item.rating,
    reviewCount: item.reviewCount,
    category: item.category,
    material: item.material,
    inStock: item.inStock,
    image: item.image,
    description: item.description,
    aboutArtist: item.aboutArtist,
    specifications: item.specifications,
    reviews: item.reviews,
  };
};

module.exports = {
  productUpload,
  materialUpload,
  formatCatalogItem,
};
