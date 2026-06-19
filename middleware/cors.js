const cors = require("cors");
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");
//console.log(allowedOrigins);

const corsOption = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true); //مفيش ايرور و عدي حاجة شبه error
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("cors policy,origin not allowed"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
module.exports = cors(corsOption);
