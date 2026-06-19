const express = require("express");
const router = express.Router();
const { materialUpload } = require("../config/catalogUpload.config");
const {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} = require("../controller/materialController");

router.get("/", getMaterials);
router.get("/:id", getMaterialById);
router.post("/", materialUpload.single("image"), createMaterial);
router.put("/:id", materialUpload.single("image"), updateMaterial);
router.delete("/:id", deleteMaterial);

module.exports = router;
