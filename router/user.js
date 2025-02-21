// Fetch user details
app.get("/user/details", ensureUserLoggedIn, async (req, res) => {
    try {
      const query = "SELECT username, email FROM user WHERE id = ?";
      const [rows] = await db.query(query, [req.session.userId]);
  
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
  
      const user = rows[0];
      return res.json({ success: true, data: user });
    } catch (err) {
      console.error("Error fetching user details:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  
  // Fetch user orders
  app.get("/user/orders", ensureUserLoggedIn, async (req, res) => {
    try {
      const query = "SELECT * FROM orders WHERE user_id = ?";
      const [rows] = await db.query(query, [req.session.userId]);
  
      return res.json({ success: true, data: rows });
    } catch (err) {
      console.error("Error fetching user orders:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  