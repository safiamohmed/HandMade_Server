const express = require("express");
const router = express.Router();

const {
    getArtistDashboard,
} = require("../controller/artistDashbaord");

router.get("/artist/:artistId", getArtistDashboard);

module.exports = router;    
