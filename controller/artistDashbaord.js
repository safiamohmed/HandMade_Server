const mongoose = require("mongoose");
const Product = require("../model/Product");
// const Review = require("../model/Review");
exports.getArtistDashboard = async (req, res) => {
    try {
        const { artistId } = req.params;
        const id = new mongoose.Types.ObjectId(artistId);

        // products
        const products = await Product.find({ artist: id });

        const totalProducts = products.length;

        const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

        const latestProducts = await Product.find({ artist: id })
            .sort({ createdAt: -1 })
            .limit(5);
        // const categoryDistribution = await Product.aggregate([
        //   { $match: { artist: id } },
        //   {
        //     $group: {
        //       _id: "$category",
        //       count: { $sum: 1 }
        //     }
        //   }
        // ]);

        // ⭐ reviews من المنتجات (مش Collection منفصل)
        const allReviews = products.flatMap((p) =>
            (p.reviews || []).map((r) => ({
                ...r.toObject?.() || r,
                productId: p._id,
                productName: p.name,
            }))
        );

        const totalReviews = allReviews.length;

        const averageRating =
            totalReviews === 0
                ? 0
                : allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
                totalReviews;

        const recentReviews = allReviews
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .slice(0, 5);
        const totalOrders = products.reduce(
            (sum, p) => sum + (p.sales || 0),
            0
        );
        const totalSales = products.reduce(
            (sum, p) => sum + (p.price * (p.sales || 0)),
            0
        );
        const monthlySales = Array.from({ length: 7 }, (_, i) =>
            Math.floor(Math.random() * 80) + 10
        );

        const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
        res.json({
            products,
            totalProducts,
            totalStock,
            averageRating,
            totalReviews,
            recentReviews,
            latestProducts,
            categoryDistribution: [],
            // ✨ NEW
            monthlySales: [28, 45, 32, 60, 42, 55, 78],
  months: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"],
  totalSales: "18,400 EGP",
  totalOrders: 84,
        });

    } catch (err) {
        res.status(500).json({
            message: "Dashboard error",
            error: err.message,
        });
    }
};