const Material = require("../model/Material");
const {
  parseCatalogBody,
  applyUploadedImage,
  removeOldImage,
  formatCatalogItem,
} = require("../utils/catalogUpload.utils");

const DEFAULT_MATERIALS = [
  {
    name: "Fabric",
    description: "High-quality cotton fabric suitable for handmade crafts and sewing projects.",
    price: 120, 
    stock: 50,
    category: "Textiles",
    image: "",
    specifications: ["100% Cotton", "Width: 150cm", "Machine washable"],
    rating: 4.5,
    reviewCount: 12,
    sellerName: "Cairo Textiles Co.",
    sellerPhone: "+20 100 123 4567",
  },
  {
    name: "Scissors",
    description: "Professional-grade craft scissors with ergonomic grip.",
    price: 85,
    stock: 30,
    category: "Tools",
    image: "",
    specifications: ["Stainless steel blades", "Soft grip handle", "Length: 20cm"],
    rating: 4.7,
    reviewCount: 8,
    sellerName: "Craft Tools Egypt",
    sellerPhone: "+20 101 234 5678",
  },
  {
    name: "Needles",
    description: "Assorted hand-sewing needles for embroidery and general stitching.",
    price: 25,
    stock: 100,
    category: "Sewing",
    image: "",
    specifications: ["Pack of 20", "Various sizes", "Nickel-plated"],
    rating: 4.3,
    reviewCount: 15,
    sellerName: "Sewing Essentials",
    sellerPhone: "+20 102 345 6789",
  },
  {
    name: "Sewing Thread",
    description: "Durable polyester thread in assorted colors for all sewing needs.",
    price: 35,
    stock: 80,
    category: "Sewing",
    image: "",
    specifications: ["Polyester", "200m per spool", "12 color pack"],
    rating: 4.6,
    reviewCount: 20,
    sellerName: "Thread Masters",
    sellerPhone: "+20 103 456 7890",
  },
  {
    name: "Wire",
    description: "Flexible craft wire for jewelry making and sculpture projects.",
    price: 45,
    stock: 60,
    category: "Jewelry",
    image: "",
    specifications: ["Copper wire", "0.8mm gauge", "10m roll"],
    rating: 4.4,
    reviewCount: 6,
    sellerName: "Wire & Bead Supply",
    sellerPhone: "+20 104 567 8901",
  },
  {
    name: "Beads",
    description: "Colorful glass beads for bracelets, necklaces, and decorative crafts.",
    price: 55,
    stock: 120,
    category: "Jewelry",
    image: "",
    specifications: ["Glass beads", "500 pieces", "Mixed colors"],
    rating: 4.8,
    reviewCount: 25,
    sellerName: "Bead Paradise",
    sellerPhone: "+20 105 678 9012",
  },
  {
    name: "Buttons",
    description: "Assorted wooden and plastic buttons for clothing and craft projects.",
    price: 30,
    stock: 90,
    category: "Sewing",
    image: "",
    specifications: ["Mixed sizes", "100 pieces", "Wood & plastic"],
    rating: 4.2,
    reviewCount: 10,
    sellerName: "Button World",
    sellerPhone: "+20 106 789 0123",
  },
  {
    name: "Glue Gun",
    description: "Electric hot glue gun with high-temperature adhesive sticks.",
    price: 150,
    stock: 25,
    category: "Tools",
    image: "",
    specifications: ["60W power", "Includes 5 glue sticks", "Safety stand included"],
    rating: 4.5,
    reviewCount: 18,
    sellerName: "Craft Tools Egypt",
    sellerPhone: "+20 101 234 5678",
  },
  {
    name: "Wood Pieces",
    description: "Natural unfinished wood pieces for carving, painting, and DIY crafts.",
    price: 95,
    stock: 40,
    category: "Woodcraft",
    image: "",
    specifications: ["Pine wood", "Assorted shapes", "Sanded smooth"],
    rating: 4.6,
    reviewCount: 9,
    sellerName: "Woodcraft Supplies",
    sellerPhone: "+20 107 890 1234",
  },
  {
    name: "Paint Brushes",
    description: "Set of fine art brushes for acrylic, watercolor, and craft painting.",
    price: 65,
    stock: 55,
    category: "Art Supplies",
    image: "",
    specifications: ["12 brush set", "Synthetic bristles", "Various tip sizes"],
    rating: 4.7,
    reviewCount: 14,
    sellerName: "Art Supply Hub",
    sellerPhone: "+20 108 901 2345",
  },
];

async function ensureSeedMaterials() {
  const count = await Material.countDocuments();
  if (count === 0) {
    await Material.insertMany(DEFAULT_MATERIALS);
  }
}

exports.getMaterials = async (req, res) => {
  try {
    await ensureSeedMaterials();
    const materials = await Material.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials.map(formatCatalogItem),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMaterialById = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    res.status(200).json({ success: true, data: formatCatalogItem(material) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const body = parseCatalogBody(req.body);
    applyUploadedImage(body, req.file, "materials");

    const material = await Material.create(body);
    res.status(201).json({ success: true, data: formatCatalogItem(material) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    const body = parseCatalogBody(req.body);
    applyUploadedImage(body, req.file, "materials");

    if (req.file && material.image) {
      removeOldImage(material.image);
    }

    Object.assign(material, body);
    await material.save();

    res.status(200).json({ success: true, data: formatCatalogItem(material) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    if (material.image) {
      removeOldImage(material.image);
    }

    res.status(200).json({ success: true, message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
