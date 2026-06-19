// models/Product.js
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  author: String,
  date: Date,
  comment: String,
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    // artist: {
    //   type: String,
    //   required: true,
    // },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
   
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "EGP",
    },
    rating: {
      type: Number,
      default: 0,
    },
    inStock: {
      type: Number,
      default: 0,
      required: true,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    material: String,
    inStock: Number,
    image: String,

    description: String,
    aboutArtist: String,

    specifications: {
      dimensions: String,
      materials: String,
      shipping: String,
    },

    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  },
);

const PRODUCT_TAGS = {
  occasions: ["birthday", "wedding", "anniversary", "graduation"],

  gender: ["male", "female"],

  age: ["child", "teen", "adult"],

  type: ["gift", "decor", "fashion", "accessory"],
};
module.exports.PRODUCT_TAGS = PRODUCT_TAGS;
module.exports = mongoose.model("Product", productSchema);
