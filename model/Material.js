const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  author: String,
  date: { type: Date, default: Date.now },
  comment: String,
  rating: { type: Number, min: 1, max: 5, default: 5 },
});

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, required: true },
    image: { type: String, default: "" },
    specifications: [{ type: String }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    reviews: [reviewSchema],
    sellerName: { type: String, default: "HandMade Supplier" },
    sellerEmail: { type: String, default: "" },
    sellerPhone: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);
 