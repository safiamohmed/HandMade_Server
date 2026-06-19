const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const materialOrderItemSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    image: String,
  },
  { _id: false }
);

const materialOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: { type: String, unique: true },
    customerName: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    items: {
      type: [materialOrderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Order must contain at least one material",
      },
    },
    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 45 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "card", "fawry"],
      default: "cash_on_delivery",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

materialOrderSchema.pre("save", async function () {
  if (this.orderNumber) return;
  this.orderNumber = `MAT-${uuidv4().slice(0, 8).toUpperCase()}`;
});

module.exports = mongoose.model("MaterialOrder", materialOrderSchema);
