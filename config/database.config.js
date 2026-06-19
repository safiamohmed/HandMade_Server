const mongoose = require("mongoose");
const connectDB = async () => {
    try {
        const connectionString = process.env.MONGODB_URI;
        await mongoose.connect(connectionString);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
} 
module.exports = connectDB; 
