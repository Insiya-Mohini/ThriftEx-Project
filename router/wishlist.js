const express = require("express");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const router = express.Router();

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ✅ Add Product to Wishlist
router.post("/add", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }

  let { product_id, size, color, image_url, price } = req.body;
  const user_id = req.session.user.id;

  if (!product_id || !image_url || !price) {
    return res.status(400).json({ success: false, message: "Missing required product details." });
  }

  size = size || "M"; // Default size
  color = color || "Black"; // Default color

  try {
    const connection = await pool.getConnection();

    // Check if product already exists in wishlist
    const [existing] = await connection.query(
      "SELECT * FROM wishlist WHERE user_id = ? AND product_id = ? AND size = ? AND color = ?",
      [user_id, product_id, size, color]
    );

    if (existing.length > 0) {
      connection.release();
      return res.json({ success: false, message: "Product is already in your wishlist." });
    }

    // Insert into wishlist
    await connection.query(
      "INSERT INTO wishlist (user_id, product_id, size, color, image_url, price) VALUES (?, ?, ?, ?, ?, ?)",
      [user_id, product_id, size, color, image_url, price]
    );

    connection.release();
    res.json({ success: true, message: "Product added to wishlist successfully!" });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ✅ Fetch Wishlist Items
router.get("/", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }

  const user_id = req.session.user.id;

  try {
    const connection = await pool.getConnection();

    const [wishlistItems] = await connection.query(
      `SELECT w.id AS wishlist_id, w.product_id, l.title, w.image_url, w.size, w.color, w.price
       FROM wishlist w 
       JOIN listings l ON w.product_id = l.id 
       WHERE w.user_id = ?`,
      [user_id]
    );

    connection.release();

    if (wishlistItems.length === 0) {
      return res.json({ success: true, data: [], message: "Your wishlist is empty." });
    }

    res.json({ success: true, data: wishlistItems });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ✅ Remove Item from Wishlist
router.delete("/remove/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }

  const wishlist_id = req.params.id;
  const user_id = req.session.user.id;

  try {
    const connection = await pool.getConnection();

    const [result] = await connection.query("DELETE FROM wishlist WHERE id = ? AND user_id = ?", [
      wishlist_id,
      user_id
    ]);

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Wishlist item not found or already removed." });
    }

    res.json({ success: true, message: "Product removed from wishlist successfully." });
  } catch (error) {
    console.error("Error removing wishlist item:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ✅ Clear Entire Wishlist
router.delete("/clear", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }

  const user_id = req.session.user.id;

  try {
    const connection = await pool.getConnection();

    const [result] = await connection.query("DELETE FROM wishlist WHERE user_id = ?", [user_id]);

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Your wishlist is already empty." });
    }

    res.json({ success: true, message: "All items removed from wishlist." });
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
