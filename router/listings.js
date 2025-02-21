const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MySQL connection setup
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Endpoint to create a new listing
router.post("/", upload.array("images", 3), async (req, res) => {
  const { title, category, condition1, description, price, gender, material, color, size } = req.body;
  const sellerId = req.session.sellerId;

  if (!sellerId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please sign in." });
  }

  if (!title || !category || !condition1 || !description || !price) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  try {
    let imageUrls = [null, null, null];
    if (req.files) {
      for (let i = 0; i < req.files.length && i < 3; i++) {
        const file = req.files[i];
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });
        imageUrls[i] = uploadResult.secure_url;
      }
    }

    const query = `
      INSERT INTO listings 
      (sellerid, title, category, condition1, description, price, gender, material, color, size, image_url, image2_url, image3_url, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')
    `;

    const connection = await pool.getConnection();
    await connection.query(query, [
      sellerId,
      title,
      category,
      condition1,
      description,
      parseFloat(price),
      gender,
      material,
      color,
      size,
      imageUrls[0],
      imageUrls[1],
      imageUrls[2],
    ]);
    connection.release();

    res
      .status(201)
      .json({ success: true, message: "Listing created successfully!" });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Endpoint to fetch all listings for the current seller
router.get("/seller", async (req, res) => {
  const sellerId = req.session.sellerId;

  if (!sellerId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please sign in." });
  }

  try {
    const query = `
      SELECT id, title, category, price, condition1, gender, material, color, size, status, created_at
      FROM listings
      WHERE sellerid = ?
      ORDER BY created_at DESC
    `;

    const connection = await pool.getConnection();
    const [listings] = await connection.query(query, [sellerId]);
    connection.release();

    res.json({ success: true, listings });
  } catch (error) {
    console.error("Error fetching seller listings:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Endpoint to update the status of a listing
router.patch("/status/:id", async (req, res) => {
  const sellerId = req.session.sellerId;
  const { id } = req.params;
  const { status } = req.body;

  if (!sellerId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please sign in." });
  }

  if (!["Available", "Sold"].includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value." });
  }

  try {
    const query = `
      UPDATE listings
      SET status = ?
      WHERE id = ? AND sellerid = ?
    `;

    const connection = await pool.getConnection();
    const [result] = await connection.query(query, [status, id, sellerId]);
    connection.release();

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Listing not found or unauthorized.",
        });
    }

    res.json({
      success: true,
      message: "Listing status updated successfully.",
    });
  } catch (error) {
    console.error("Error updating listing status:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Analytics endpoint
router.get("/analytics", async (req, res) => {
  const sellerId = req.session.sellerId;

  if (!sellerId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please sign in." });
  }

  try {
    const [distribution] = await pool.query(
      `
      SELECT 
          SUM(CASE WHEN status = 'Sold' THEN 1 ELSE 0 END) AS Sold,
          SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS Available
      FROM listings
      WHERE sellerid = ?
    `,
      [sellerId]
    );

    const [monthlySales] = await pool.query(
      `
      SELECT 
          DATE_FORMAT(created_at, '%Y-%m') AS yearMonth,
          SUM(price) AS totalSales
      FROM listings
      WHERE sellerid = ? AND status = 'Sold'
      GROUP BY yearMonth
      ORDER BY yearMonth
    `,
      [sellerId]
    );

    const salesDistribution = [
      distribution[0]?.Sold || 0,
      distribution[0]?.Available || 0,
    ];
    const monthlySalesData = monthlySales.reduce((acc, item) => {
      acc[item.yearMonth] = item.totalSales;
      return acc;
    }, {});

    res.json({
      success: true,
      salesDistribution,
      monthlySales: monthlySalesData,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Endpoint to fetch unsold items
router.get("/unsold", async (req, res) => {
  const sellerId = req.session.sellerId;

  if (!sellerId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please sign in." });
  }

  try {
    const query = `
      SELECT id, title, category, CAST(price AS DECIMAL(10,2)) AS price, condition1,gender, material, size, created_at
      FROM listings
      WHERE sellerid = ? AND status = 'Available'
      ORDER BY created_at DESC
    `;

    const connection = await pool.getConnection();
    const [unsoldListings] = await connection.query(query, [sellerId]);
    connection.release();

    res.json({ success: true, unsoldListings });
  } catch (error) {
    console.error("Error fetching unsold items:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Endpoint to fetch dashboard data
router.get("/dashboard", async (req, res) => {
  const sellerId = req.session.sellerId;

  if (!sellerId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please sign in." });
  }

  try {
    const [dashboardData] = await pool.query(
      `
      SELECT
        (SELECT IFNULL(SUM(price), 0) FROM listings WHERE sellerid = ? AND status = 'Sold') AS totalSales,
        (SELECT COUNT(*) FROM listings WHERE sellerid = ?) AS totalListings,
        (SELECT COUNT(*) FROM listings WHERE sellerid = ? AND status = 'Available') AS unsoldItems,
        (SELECT IFNULL(AVG(price), 0) FROM listings WHERE sellerid = ? AND status = 'Sold') AS avgSellingPrice
    `,
      [sellerId, sellerId, sellerId, sellerId]
    );

    const [recentListings] = await pool.query(
      `
      SELECT title, category, price, status
      FROM listings
      WHERE sellerid = ?
      ORDER BY created_at DESC
      LIMIT 5
    `,
      [sellerId]
    );

    const [unsoldListings] = await pool.query(
      `
      SELECT title, category, price, condition1, created_at
      FROM listings
      WHERE sellerid = ? AND status = 'Available'
    `,
      [sellerId]
    );

    const [salesDistribution] = await pool.query(
      `
      SELECT 
        SUM(CASE WHEN status = 'Sold' THEN 1 ELSE 0 END) AS Sold,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS Unsold
      FROM listings
      WHERE sellerid = ?
    `,
      [sellerId]
    );

    const [monthlySales] = await pool.query(
      `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(price) AS totalSales
      FROM listings
      WHERE sellerid = ? AND status = 'Sold'
      GROUP BY month
    `,
      [sellerId]
    );

    const salesData = salesDistribution[0];
    res.json({
      success: true,
      dashboardData: dashboardData[0],
      recentListings,
      unsoldListings,
      salesDistribution: [salesData.Sold || 0, salesData.Unsold || 0],
      monthlySales: monthlySales.reduce((acc, curr) => {
        acc[curr.month] = curr.totalSales;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
