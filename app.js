const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const bcrypt = require("bcryptjs");

// Routers
const listingsRouter = require("./router/listings");
const productsRouter = require("./router/products");
const cartRouter = require("./router/cart");
const wishlistRouter = require("./router/wishlist");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Middleware to parse JSON data
app.use(cors());
app.use(express.static("public"));
app.use(express.static("router"));

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "90046e12300f77373d350f06ac3d9733ae6b6a373bdb9569547239323bef4b9d", // Load secret from environment variable
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true }, // Set secure: true if using HTTPS
  })
);

// Database Connection (pooled connection)
const db = require("./config/db"); // Shared db configuration file

// Test database connection
(async () => {
  try {
    const [rows] = await db.query("SELECT 1");
    console.log("Database connection tested successfully!");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1); // Exit the application if the database connection fails
  }
})();

// Middleware to ensure the user is signed in
function ensureUserLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please log in." });
  }
  next();
}

// Middleware to ensure the seller is signed in
function ensureSellerLoggedIn(req, res, next) {
  if (!req.session.sellerId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please sign in." });
  }
  next();
}

// User Signup
app.post("/U-signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Please fill in all fields." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = "INSERT INTO user (username, email, password) VALUES (?, ?, ?)";
    const [result] = await db.query(query, [username, email, hashedPassword]);

    if (result.affectedRows > 0) {
      return res.json({
        success: true,
        message: "User registered successfully!",
      });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "User registration failed." });
    }
  } catch (err) {
    console.error("Error inserting user:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while registering the user.",
    });
  }
});

// User Signin
app.post("/U-signin", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide both username and password.",
    });
  }

  try {
    const query = "SELECT * FROM user WHERE username = ?";
    const [rows] = await db.query(query, [username]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    req.session.userId = user.id;
    console.log("User logged in, session ID:", req.session.userId);

    return res.json({
      success: true,
      message: "User authenticated successfully!",
    });
  } catch (err) {
    console.error("Error during sign-in:", err);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred while signing in." });
  }
});

// Seller Signup
app.post("/S-signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Please fill in all fields." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = "INSERT INTO seller (username, email, password) VALUES (?, ?, ?)";
    const [result] = await db.query(query, [username, email, hashedPassword]);

    if (result.affectedRows > 0) {
      return res.json({
        success: true,
        message: "Seller registered successfully!",
      });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Seller registration failed." });
    }
  } catch (err) {
    console.error("Error inserting seller:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while registering the seller.",
    });
  }
});

// Seller Signin
app.post("/S-signin", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide both username and password.",
    });
  }

  try {
    const query = "SELECT * FROM seller WHERE username = ?";
    const [rows] = await db.query(query, [username]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found." });
    }

    const seller = rows[0];
    const isPasswordValid = await bcrypt.compare(password, seller.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    req.session.sellerId = seller.id;
    console.log("Seller logged in, session ID:", req.session.sellerId);

    return res.json({
      success: true,
      message: "Seller authenticated successfully!",
    });
  } catch (err) {
    console.error("Error during sign-in:", err);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred while signing in." });
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during session destruction:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while logging out.",
      });
    }
    res.clearCookie("connect.sid");
    return res.json({ success: true, message: "Logged out successfully!" });
  });
});

// Protected Routes
app.use("/api/listings", ensureSellerLoggedIn, listingsRouter);
app.use("/api/products", productsRouter);
app.use("/api/cart", ensureUserLoggedIn, cartRouter);
app.use("/api/wishlist", wishlistRouter);


// Home Route
app.get("/", (req, res) => {
  res.send("ThriftEx API is running!");
});

// Handle 404 Errors
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

const PORT = process.env.PORT || 3000;

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
