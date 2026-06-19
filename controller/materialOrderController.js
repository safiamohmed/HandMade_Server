const Material = require("../model/Material");
const MaterialOrder = require("../model/MaterialOrder");
const logActivity = require("../utils/logActivity");


const calculateTotals = (items, shipping = 45) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shippingCost = subtotal > 1000 ? 0 : shipping;
  const totalAmount = subtotal + shippingCost;
  return { subtotal, shipping: shippingCost, totalAmount };
};

exports.createMaterialOrder = async (req, res) => {
  try {
    const {
      customerName,
      email,
      phone,
      address,
      items,
      paymentMethod = "cash_on_delivery",
    } = req.body;

    if (!customerName || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Please provide customerName, phone, and address",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one material",
      });
    }

    const orderItems = [];

    for (const item of items) {
      const material = await Material.findById(item.materialId || item.id);

      if (!material) {
        return res.status(400).json({
          success: false,
          message: `Material not found: ${item.materialId || item.id}`,
        });
      }

      const quantity = Number(item.quantity) || 1;

      if (material.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `${material.name} is out of stock (Available: ${material.stock})`,
        });
      }

      orderItems.push({
        materialId: material._id,
        name: material.name,
        quantity,
        price: material.price,
        image: material.image,
      });
    }

    const { subtotal, shipping, totalAmount } = calculateTotals(orderItems);

    const order = await MaterialOrder.create({
      user: req.user.id,
      customerName,
      email: email || "",
      phone,
      address,
      items: orderItems,
      subtotal,
      shipping,
      totalAmount,
      paymentMethod,
      status: "pending",
    });

    for (const item of orderItems) {
      await Material.findByIdAndUpdate(item.materialId, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(201).json({
      success: true,
      message: "Material order created successfully",
      data: order,
    });
  } catch (err) {
    console.error("Create material order error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
  await logActivity({
    user: req.user,
    action: "Created material order",
    entity: "material-order",
    entityId: order.orderNumber,
    details: `Total: ${order.totalAmount} EGP — ${orderItems.length} item(s)`,
    ip: req.ip,
  });
};

exports.getMaterialOrders = async (req, res) => {
  try {
    const orders = await MaterialOrder.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMaterialOrderById = async (req, res) => {
  try {
    const order = await MaterialOrder.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMaterialOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const order = await MaterialOrder.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = status;
    await order.save();
    await logActivity({
      user: req.user,
      action: `Material order status → ${status}`,
      entity: "material-order",
      entityId: order.orderNumber,
      details: `Order ${order.orderNumber} updated to ${status}`,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Order status updated",
      data: order,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
