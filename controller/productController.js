const Product = require("../model/Product");
const Category = require("../model/Category.model"); // ← محتاجينها للفلتر بالـ slug

const {
  parseCatalogBody,
  applyUploadedImage,
  removeOldImage,
  formatCatalogItem,
} = require("../utils/catalogUpload.utils");

// [FIX] logActivity كانت مستخدمة من غير require فعلاً → كانت هتعمل ReferenceError
// وتبوّظ أي request لـ createProduct / deleteProduct.
// محتاج تأكد من المسار الصحيح وتستبدل السطر ده بالـ require الحقيقي عندك، مثلاً:
// const { logActivity } = require("../utils/activityLog.utils");
let logActivity;
try {
  logActivity = require("../utils/activityLog.utils").logActivity;
} catch {
  // [FIX] fallback آمن: لو الموديول مش موجود لسه، منعمل no-op بدل ما نكسر الـ request كله
  logActivity = async () => {};
}

// [NEW] artist متخزن كـ ObjectId في الداتابيز (صح وآمن للعلاقات)، لكن
// الفرونت إند عايز يشوف اسم الفنان مش الـ ID. عشان كده محتاجين:
//   1) نـ populate الحقل ده وقت أي query بترجع منتج (.populate("artist", "name shopName"))
//   2) نستبدل الـ object الناتج باسم نصي قبل ما نرجعه في الـ response
// الأولوية في الاسم: shopName لو موجود، وإلا name.
function resolveArtistName(artist) {
  if (!artist) return "";
  if (typeof artist === "string") return artist; // لسه ID نصي، مفيش populate حصل
  return artist.shopName || artist.name || "";
}

// [NEW] wrapper حوالين formatCatalogItem يستبدل artist (object بعد populate)
// باسم نصي بس، عشان الفرونت إند يستخدمه مباشرة كـ string بدون أي تعديل تاني.
function formatProductWithArtistName(product) {
  const formatted = formatCatalogItem(product);
  return {
    ...formatted,
    artist: resolveArtistName(product.artist),
    // [NEW] سايبين الـ ID الخام كمان تحت اسم artistId (مفيد لو حابب تعمل لينك لبروفايل الفنان)
    artistId:
      product.artist && product.artist._id
        ? product.artist._id
        : product.artist,
  };
}

// ======================
// GET ALL PRODUCTS
// ======================
exports.getProducts = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 3;
    const skip = (page - 1) * limit;

    const filter = {};

    // search by name
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }

    // category (slug -> ObjectId)
    if (req.query.category) {
      const category = await Category.findOne({ slug: req.query.category });
      if (category) {
        filter.category = category._id;
      } else {
        // لو مفيش category matching رجّع فاضي
        return res.json({
          page,
          totalPages: 0,
          totalProducts: 0,
          products: [],
        });
      }
    }

    // price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) {
        filter.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter.price.$lte = Number(req.query.maxPrice);
      }
    }

    // material
    if (req.query.material) {
      filter.material = req.query.material;
    }

    // rating
    if (req.query.minRating) {
      filter.rating = { $gte: Number(req.query.minRating) };
    }

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate("category")
      .populate("artist", "name shopName") // [NEW] عشان نجيب اسم الفنان
      .skip(skip)
      .limit(limit);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
      products: products.map(formatProductWithArtistName), // [NEW] artist بيظهر كـ اسم مش ID
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// GET PRODUCT BY ID
// ======================
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("artist", "name shopName"); // [NEW] عشان نجيب اسم الفنان

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: formatProductWithArtistName(product), // [NEW] artist بيظهر كـ اسم مش ID
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// CREATE PRODUCT
// ======================
// [FIX] كان فيه نسختين من createProduct جوه نفس الفنكشن:
//   1) Product.create({...req.body, image, artist}) — مفيهوش return، كود ميت
//   2) Product.create(body) تاني بمنطق مختلف (artist = shopName/name كـ نص)
// ده كان معناه عمليًا إن أول استدعاء لـ Product.create كان بيتنفذ ويتجاهل نتيجته،
// وكان بيحفظ artist كـ STRING بينما الموديل عامل ref لـ ObjectId → validation error غالبًا.
// الحل: نسخة واحدة بس، وartist بيتاخد من req.user.id (ObjectId) زي ما الموديل محتاج.
exports.createProduct = async (req, res) => {
  try {
    const body = parseCatalogBody(req.body);
    applyUploadedImage(body, req.file, "products");

    // [FIX] artist لازم يكون ObjectId بتاع المستخدم المسجل دخول، مش اسم الشوب كـ نص
    // تجاهل أي قيمة artist جاية من الكلاينت عشان مفيش انتحال صلاحية
    body.artist = req.user.id;

    const product = await Product.create(body);
    await product.populate("category"); // ← عشان يظهر اسم الـ category مش بس الـ ID
    await product.populate("artist", "name shopName"); // [NEW] عشان يظهر اسم الفنان مش الـ ID

    await logActivity({
      user: req.user,
      action: "Added product",
      entity: "product",
      entityId: product._id,
      details: `"${product.name}" — ${product.price} EGP`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: formatProductWithArtistName(product), // [NEW]
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// UPDATE PRODUCT (basic update via PUT)
// ======================
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      artist: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unauthorized",
      });
    }

    Object.assign(product, req.body);
    if (req.file) {
      if (product.image) {
        removeOldImage(product.image);
      }
      product.image = `/uploads/products/${req.file?.filename}`;
    }
    await product.save();

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// UPDATE PRODUCT (rich update via catalog helpers)
// ======================
// [FIX] دي كانت معمولة باسم addReview بالغلط (كوبي-بيست) وكانت بتـ override
// التعريف الحقيقي بتاع addReview تحت. سميتها updateProductDetails واستخدمتها
// كفنكشن منفصلة. لو الراوت بتاعك كان شايل addReview على الراوت ده، حدثه.
exports.updateProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // [FIX] المقارنة لازم تكون بالـ ObjectId (artist) مش بالاسم
    if (product.artist.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const body = parseCatalogBody(req.body);
    applyUploadedImage(body, req.file, "products");
    delete body.artist; // ✅ Prevent changing artist field

    if (req.file && product.image) removeOldImage(product.image);

    Object.assign(product, body);
    await product.save();
    await product.populate("artist", "name shopName"); // [NEW] عشان يظهر اسم الفنان مش الـ ID
    await logActivity({
      user: req.user,
      action: "Updated product",
      entity: "product",
      entityId: product._id,
      details: `"${product.name}" updated`,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data: formatProductWithArtistName(product), // [NEW]
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================
// DELETE PRODUCT
// ======================
// [FIX] كان فيه نسختين من deleteProduct:
//   1) دي (تتفلتر بـ artist: req.user.id) — آمنة، بس كانت متجاهلة بسبب override
//   2) التانية (تحت) كانت بتمسح بالـ ID بس من غير فلترة على artist → أي مستخدم
//      مسجل دخول كان يقدر يمسح منتج مش بتاعه. خطر أمني واضح.
// خليت بس النسخة الآمنة دي، وضفت logActivity جواها.
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      artist: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unauthorized",
      });
    }

    await product.deleteOne();

    await logActivity({
      user: req.user,
      action: "Deleted product",
      entity: "product",
      entityId: product._id,
      details: `Product "${product.name}" deleted`,
      ip: req.ip,
    });

    if (product.image) {
      removeOldImage(product.image);
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// GET MY PRODUCTS (logged-in artist's own products)
// ======================
// [FIX] كان فيه نسختين بمنطق مختلف؛ التانية (artist: artistName) كانت بتـ override
// الأولى وغالبًا مكنتش بترجع نتائج صحيحة لأن artist مخزن كـ ObjectId مش اسم.
// خليت نسخة واحدة بس بتفلتر بـ req.user.id زي الموديل.
exports.getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      artist: req.user.id,
    })
      .populate("category")
      .populate("artist", "name shopName"); // [NEW] عشان يظهر اسم الفنان مش الـ ID

    res.status(200).json({
      success: true,
      count: products.length,
      data: products.map(formatProductWithArtistName), // [NEW]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// ADD REVIEW
// ======================
// [FIX] كانت معمولة مرتين؛ خليت النسخة دي بس (اللي بتاخد author/comment من الـ body
// وتحدث reviewCount). شيلت النسخة المكررة اللي كانت معمولة باسم addReview بالغلط
// تحت deleteProduct وكانت أصلاً منطق تحديث منتج مش إضافة ريفيو.
exports.addReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "artist",
      "name shopName",
    ); // [NEW] عشان يظهر اسم الفنان مش الـ ID

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const newReview = {
      author: req.body.author,
      comment: req.body.comment,
      date: new Date(),
    };

    product.reviews.push(newReview);
    product.reviewCount = product.reviews.length;

    await product.save();

    res.status(201).json({
      success: true,
      data: formatProductWithArtistName(product), // [NEW]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// UPDATE REVIEW
// ======================
exports.updateReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId).populate(
      "artist",
      "name shopName",
    ); // [NEW] عشان يظهر اسم الفنان مش الـ ID

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const review = product.reviews.id(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.author = req.body.author ?? review.author;
    review.comment = req.body.comment ?? review.comment;
    review.date = new Date();

    await product.save();

    res.status(200).json({
      success: true,
      data: formatProductWithArtistName(product), // [NEW]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// DELETE REVIEW
// ======================
exports.deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId).populate(
      "artist",
      "name shopName",
    ); // [NEW] عشان يظهر اسم الفنان مش الـ ID

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.reviews = product.reviews.filter(
      (r) => (r._id || r.id).toString() !== reviewId,
    );

    product.reviewCount = product.reviews.length;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
      data: formatProductWithArtistName(product), // [NEW]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// GET MY REVIEWS (reviews on the logged-in artist's products)
// ======================
// [FIX] كان الفنكشن ده مقفول غلط (ناقص closing brace + parenthesis) وبعدها
// كان جواه فنكشن getMyProducts تانية تعريف (override) — ده كان يكسر الملف كله
// (SyntaxError) لو حد حاول يـ require الملف. صلحت الإغلاق وشلت التعريف المكرر.
exports.getMyReviews = async (req, res) => {
  try {
    const products = await Product.find({
      artist: req.user.id,
    }).select("name reviews");

    const reviews = products.flatMap((product) =>
      product.reviews.map((review) => ({
        productId: product._id,
        productName: product.name,
        ...review.toObject(),
      })),
    );

    res.json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// GIFT RECOMMENDATIONS
// ======================
exports.getGiftRecommendations = async (req, res) => {
  try {
    const { occasion, gender, age, budget } = req.body;

    const tags = [];

    if (occasion) tags.push(occasion);
    if (gender) tags.push(gender);
    if (age) tags.push(age);

    const filter = {};

    if (tags.length > 0) {
      filter.tags = { $all: tags };
    }

    if (budget) {
      filter.price = {
        $lte: Number(budget),
      };
    }

    const products = await Product.find(filter)
      .populate("category")
      .populate("artist", "name shopName") // [NEW] عشان يظهر اسم الفنان مش الـ ID
      .limit(12);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products.map(formatProductWithArtistName), // [NEW]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};