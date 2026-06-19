const path = require("path");
const fs = require("fs");

function parseCatalogBody(body) {
  const parsed = { ...body };

  const numberFields = ["price", "stock", "rating", "reviewCount", "inStock"];
  numberFields.forEach((field) => {
    if (parsed[field] !== undefined && parsed[field] !== "") {
      parsed[field] = Number(parsed[field]);
    }
  });

  if (typeof parsed.specifications === "string") {
    try {
      parsed.specifications = JSON.parse(parsed.specifications);
    } catch {
      parsed.specifications = parsed.specifications
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return parsed;
}

function applyUploadedImage(body, file, folder) {
  if (file) {
    body.image = `/uploads/${folder}/${file.filename}`;
  }
  return body;
}

function removeOldImage(imagePath) {
  if (!imagePath || imagePath.startsWith("http")) return;

  const relative = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  const fullPath = path.join(process.cwd(), relative);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function sanitizeCatalogImage(image) {
  if (!image || typeof image !== "string") return "";
  if (/^https?:\/\//i.test(image)) return "";
  if (image.startsWith("/uploads/")) return image;
  if (image.startsWith("uploads/")) return `/${image}`;
  return "";
}

function formatCatalogItem(item) {
  const doc = item.toObject ? item.toObject() : { ...item };
  doc.image = sanitizeCatalogImage(doc.image);
  return doc;
}

module.exports = {
  parseCatalogBody,
  applyUploadedImage,
  removeOldImage,
  sanitizeCatalogImage,
  formatCatalogItem,
};
