const Cart = require("../model/Cart");
const Product = require("../model/Product");

// ==============================
// Helper: find cart item
// ==============================
const resolveCartItem = (cart, itemKey) => {
  const numericIndex = Number(itemKey);

  if (!isNaN(numericIndex) && cart.items[numericIndex]) {
    return { item: cart.items[numericIndex], index: numericIndex };
  }

  const indexById = cart.items.findIndex(
    i => i._id.toString() === String(itemKey)
  );

  if (indexById > -1) {
    return { item: cart.items[indexById], index: indexById };
  }

  const indexByProduct = cart.items.findIndex(
    i => i.product.toString() === String(itemKey)
  );

  if (indexByProduct > -1) {
    return { item: cart.items[indexByProduct], index: indexByProduct };
  }

  return { item: null, index: -1 };
};

// ==============================
// Recalculate cart totals
// ==============================

const recalcCart = (cart) => {
  let subtotal = 0;
  let totalItems = 0;

  cart.items.forEach(item => {
    // أعد حساب totalPrice
    item.totalPrice = item.unitPrice * item.quantity;
    
    if (item.selected) {
      subtotal += item.totalPrice;
      totalItems += item.quantity;
    }
  });

  cart.subtotal = subtotal;
  cart.totalItems = totalItems;
  cart.total = subtotal - (cart.discount || 0);
};

// ==============================
// GET CART
// ==============================
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product", "name price image inStock artist currency");

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    recalcCart(cart);
    await cart.save();

    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// ADD TO CART
// ==============================

// ==============================
// ADD TO CART
// ==============================
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.inStock < quantity) {
      return res.status(400).json({
        message: `Only ${product.inStock} available`
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      i => i.product.toString() === productId
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;

      if (newQty > product.inStock) {
        return res.status(400).json({
          message: "Not enough stock"
        });
      }

      cart.items[existingIndex].quantity = newQty;
      cart.items[existingIndex].totalPrice = product.price * newQty; // ← أضف هذا
    } else {
      cart.items.push({
        product: productId,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity, // ← أضف هذا
        selected: true
      });
    }

    recalcCart(cart);
    await cart.save();

    const updated = await Cart.findById(cart._id)
      .populate("items.product", "name price image inStock artist currency");

    res.json({
      success: true,
      message: "Added to cart",
      data: updated
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// UPDATE QUANTITY
// ==============================

exports.updateCartItemQuantity = async (req, res) => {
  try {
    const { itemIndex } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: "Min quantity is 1" });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const { item, index } = resolveCartItem(cart, itemIndex);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const product = await Product.findById(item.product);

    if (product.inStock < quantity) {
      return res.status(400).json({
        message: "Not enough stock"
      });
    }

    cart.items[index].quantity = quantity;
    cart.items[index].totalPrice = cart.items[index].unitPrice * quantity; // ← أضف هذا

    recalcCart(cart);
    await cart.save();

    const updated = await Cart.findById(cart._id)
      .populate("items.product", "name price image inStock artist currency");

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// REMOVE ITEM
// ==============================
exports.removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const { index } = resolveCartItem(cart, req.params.itemIndex);

    if (index === -1) {
      return res.status(404).json({ message: "Item not found" });
    }

    cart.items.splice(index, 1);

    recalcCart(cart);
    await cart.save();

    res.json({ success: true, message: "Removed from cart", data: cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// CLEAR CART
// ==============================
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    cart.totalItems = 0;
    cart.subtotal = 0;
    cart.total = 0;
    cart.discount = 0;

    await cart.save();

    res.json({
      success: true,
      message: "Cart cleared",
      data: cart
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// TOGGLE SELECT ITEM
// ==============================
exports.toggleSelectItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const { index } = resolveCartItem(cart, req.params.itemIndex);

    if (index === -1) {
      return res.status(404).json({ message: "Item not found" });
    }

    cart.items[index].selected = !cart.items[index].selected;

    recalcCart(cart);
    await cart.save();

    res.json({
      success: true,
      message: "Updated",
      data: cart
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};