const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,
  artist: String,
  quantity: Number,
  unitPrice: Number,
  totalPrice: Number,
  image: String
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  orderNumber: { type: String, unique: true },
  items: [orderItemSchema],

  subtotal: Number,
  shippingCost: Number,
  tax: Number,
  discount: Number,
  total: Number,

  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending"
  },

  paymentMethod: {
    type: String,
    enum: ["credit_card", "paypal", "cash_on_delivery", "vodafone_cash"]
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending"
  },

  shippingAddress: {
    fullName: String,
    phone: String,
    city: String,
    street: String,
    building: String,
    floor: String,
    apartment: String,
    landmark: String
  },
  notes: String,
  couponCode: String,
  deliveredAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// ✅ Generate order number before saving (fixed)
orderSchema.pre("save", async function() {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);