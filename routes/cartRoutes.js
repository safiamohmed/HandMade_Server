const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  toggleSelectItem
} = require('../controller/cartController');
const { protect } = require('../middleware/auth.middleware');

// جميع مسارات السلة تحتاج إلى مصادقة
router.use(protect);

router.route('/')
  .get(getCart)
  .delete(clearCart);

router.route('/items')
  .post(addToCart);

router.route('/items/:itemIndex')
  .put(updateCartItemQuantity)
  .delete(removeFromCart)
  .patch(toggleSelectItem); 

module.exports = router;