const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  unitPrice: Number,
  totalPrice: Number,
  selected: { type: Boolean, default: true }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true
  },
  items: [cartItemSchema],
  subtotal: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { timestamps: true });

// IMPORTANT
module.exports = mongoose.model("Cart", cartSchema);