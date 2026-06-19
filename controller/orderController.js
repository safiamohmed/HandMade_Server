const Order = require("../model/Order");
const Cart = require("../model/Cart");
const Product = require("../model/Product");
const logActivity = require("../utils/logActivity");

const calculateTotals = (items, discount = 0) => {
  const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const shippingCost = subtotal > 1000 ? 0 : 45;
  const tax = (subtotal + shippingCost) * 0.14;
  const total = subtotal + shippingCost + tax - discount;

  return { subtotal, shippingCost, tax, total };
};

// ==============================
// CREATE ORDER
// ==============================
exports.createOrder = async (req, res) => {
  try {
    const { paymentMethod, shippingAddress, notes, couponCode } = req.body;

    // ✅ Validate shipping address
    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.city ||
      !shippingAddress.street
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide complete shipping address (fullName, phone, city, street)",
      });
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const selectedItems = cart.items.filter((item) => item.selected);

    if (!selectedItems.length) {
      return res.status(400).json({
        success: false,
        message: "No items selected",
      });
    }

    // Check stock
    for (const item of selectedItems) {
      const product = await Product.findOne({
        _id: item.product._id,
        inStock: { $gte: item.quantity },
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `${item.product.name} is out of stock (Available: ${product?.inStock || 0})`,
        });
      }
    }

    const orderItems = selectedItems.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      artist: item.product.artist,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      image: item.product.image,
    }));

    const { subtotal, shippingCost, tax, total } = calculateTotals(
      orderItems,
      cart.discount || 0,
    );

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      discount: cart.discount || 0,
      total,
      paymentMethod,
      shippingAddress,
      notes,
      couponCode,
      status: "pending",
      paymentStatus: "pending",
    });

    // Update stock
    for (const item of selectedItems) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: {
          inStock: -item.quantity,
        },
      });
    }

    // Remove selected items from cart
    cart.items = cart.items.filter((item) => !item.selected);

    // Recalculate cart totals
    let newSubtotal = 0;
    let newTotalItems = 0;

    cart.items.forEach((item) => {
      newSubtotal += item.totalPrice;
      newTotalItems += item.quantity;
    });

    cart.subtotal = newSubtotal;
    cart.totalItems = newTotalItems;
    cart.discount = 0;
    cart.couponCode = null;
    cart.total = newSubtotal;

    await cart.save();
    await logActivity({
      user: req.user,
      action: "Created order",
      entity: "order",
      entityId: order.orderNumber,
      details: `Total: ${order.total} EGP — ${orderItems.length} item(s)`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (err) {
    console.error("Create order error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// GET ALL ORDERS
// ==============================
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate("items.product", "name image");

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    console.error("Get orders error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// GET ORDER BY ID
// ==============================
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user.id,
    }).populate("items.product", "name image description");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error("Get order error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// UPDATE ORDER STATUS
// ==============================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // ✅ Validate status
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ✅ Prevent status changes on cancelled/delivered orders
    if (order.status === "cancelled" || order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: `Cannot update status of ${order.status} order`,
      });
    }

    order.status = status;

    if (status === "delivered") {
      order.deliveredAt = Date.now();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (err) {
    console.error("Update order error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// CANCEL ORDER
// ==============================
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "pending" && order.status !== "processing") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled",
      });
    }

    order.status = "cancelled";
    order.cancelledAt = Date.now();

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          inStock: item.quantity,
        },
      });
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (err) {
    console.error("Cancel order error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// GET orders that contain the artist's products (Order Management)
exports.getArtistOrders = async (req, res) => {
  try {
    const artistName = req.user.shopName || req.user.name;
    const orders = await Order.find({ "items.artist": artistName })
      .sort({ createdAt: -1 })
      .populate("items.product", "name image");

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH order status by artist (only their products' orders)
exports.updateOrderStatusByArtist = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["processing", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const artistName = req.user.shopName || req.user.name;
    const order = await Order.findOne({
      _id: req.params.orderId,
      "items.artist": artistName,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.status === "cancelled" || order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: `Cannot update a ${order.status} order`,
      });
    }

    order.status = status;
    if (status === "delivered") order.deliveredAt = Date.now();
    await order.save();
    await logActivity({
      user: req.user,
      action: `Updated order status to ${status}`,
      entity: "order",
      entityId: order.orderNumber,
      details: `Order ${order.orderNumber} → ${status}`,
      ip: req.ip,
    });

    res
      .status(200)
      .json({ success: true, message: "Status updated", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
