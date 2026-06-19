const mongoose = require("mongoose");
const Product = require("../model/Product");
// const Review = require("../model/Review");
exports.getArtistDashboard = async (req, res) => {
    try {
        // const { artistId } = req.params;
        // const id = new mongoose.Types.ObjectId(artistId);

        // products
       const products = await Product.find({ artist: id });

const totalProducts = products.length;

const totalStock = products.reduce(
    (sum, p) => sum + (p.stock || 0),
    0
);

const totalRevenue = products.reduce(
    (sum, p) => sum + ((p.price || 0) * (p.sold || 0)),
    0
);

const totalOrders = products.reduce(
    (sum, p) => sum + (p.sold || 0),
    0
);
const topSellingProducts = [...products]
.sort((a,b)=>(b.sold||0)-(a.sold||0))
.slice(0,5)
.map(p=>({
    name:p.name,
    sold:p.sold
}));
const reviews = products.flatMap(p =>
    (p.reviews || []).map(r=>({
        reviewer:r.author,
        rating:r.rating,
        comment:r.comment,
        date:r.date,
        product:p.name
    }))
);
const totalReviews = reviews.length;

const averageRating =
totalReviews
? reviews.reduce((s,r)=>s+r.rating,0)/totalReviews
:0;
const recentReviews = [...reviews]
.sort((a,b)=>new Date(b.date)-new Date(a.date))
.slice(0,5);
const categoryMap = {};

products.forEach(p=>{
    categoryMap[p.category] =
        (categoryMap[p.category]||0)+1;
});

const categoryBreakdown =
Object.entries(categoryMap).map(
([name,value])=>({
    name,
    value
}));
const salesTrend = {
    labels:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    data:[12,18,15,25,17,20,30]
};
const visitorStats = {
    today:0,
    week:0,
    month:0
};
res.json({
    summary:{
        totalRevenue,
        totalProducts,
        totalStock,
        totalOrders,
        averageRating,
        totalReviews
    },

    salesTrend,

    topSellingProducts,

    categoryBreakdown,

    visitorStats,

    recentReviews,

    latestProducts
});

    } catch (err) {
        res.status(500).json({
            message: "Dashboard error",
            error: err.message,
        });
    }
};