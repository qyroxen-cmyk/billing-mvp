const path = require("path");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = "billing_mvp_secret";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database(
  path.join(__dirname, "database.db")
);

/* ---------- DATABASE INIT ---------- */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      code TEXT,
      category TEXT,
      stock INTEGER,
      low_stock INTEGER,
      low_stock_alert INTEGER,
      sale_price REAL,
      purchase_price REAL,
      gst_rate REAL,
      hsn TEXT,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer TEXT,
      grand_total REAL,
      date TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.get(
    "SELECT * FROM users WHERE email = ?",
    ["owner@demo.com"],
    (err, row) => {
      if (!row) {
        console.log("Creating default owner user...");
        bcrypt.hash("123456", 10, (err, hash) => {
          if (err) {
            console.error("Bcrypt error", err);
            return;
          }
          db.run(
            "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
            ["owner@demo.com", hash, "owner"],
            () => console.log("Owner user created successfully")
          );
        });
      } else {
        console.log("Owner user already exists");
      }
    }
  );
});

/* ---------- LOGIN ---------- */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, user) => {
      if (!user) {
        console.log("User not found");
        return res.status(401).json({ error: "Invalid login" });
      }

      bcrypt.compare(password, user.password, (err, match) => {
        console.log("Password match:", match);

        if (!match) {
          return res.status(401).json({ error: "Invalid login" });
        }

        const token = jwt.sign(
          { id: user.id, role: user.role },
          SECRET
        );

        res.json({ token, role: user.role });
      });
    }
  );
});

/* ---------- SIGN UP ---------- */
app.post("/signup", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: "Server error" });

    db.run(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hash, "owner"],
      function (err) {
        if (err) {
          return res.status(400).json({ error: "User already exists" });
        }

        const token = jwt.sign(
          { id: this.lastID, role: "owner" },
          SECRET
        );

        res.json({ token, role: "owner" });
      }
    );
  });
});

/* ---------- DASHBOARD STATS (SAFE) ---------- */
app.get("/dashboard/stats", (req, res) => {
  db.get(
    `
    SELECT IFNULL(SUM(grand_total), 0) AS monthlySales
    FROM invoices
    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `,
    (err, monthly) => {
      if (err) return res.json({ monthlySales: 0, dailySales: 0, profit: 0 });

      db.get(
        `
        SELECT IFNULL(SUM(grand_total), 0) AS dailySales
        FROM invoices
        WHERE date(date) = date('now')
        `,
        (err, daily) => {
          if (err) return res.json({ monthlySales: 0, dailySales: 0, profit: 0 });

          const monthlySales = monthly?.monthlySales || 0;
          const dailySales = daily?.dailySales || 0;

          res.json({
            monthlySales,
            dailySales,
            profit: Math.round(monthlySales * 0.25) // MVP profit
          });
        }
      );
    }
  );
});

/* ---------- DASHBOARD GRAPH (SAFE) ---------- */
app.get("/dashboard/graph", (req, res) => {
  db.all(
    `
    SELECT date(date) AS day, IFNULL(SUM(grand_total), 0) AS total
    FROM invoices
    GROUP BY date(date)
    ORDER BY date(date) ASC
    LIMIT 7
    `,
    (err, rows) => {
      if (err || !rows) return res.json([]);
      res.json(rows);
    }
  );
});

/* ---------- PRODUCTS (API) ---------- */
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json([]);
    res.json(rows || []);
  });
});

app.post("/api/products", (req, res) => {
  const p = req.body;

  // Accept both snake_case and camelCase payloads for compatibility
  const lowStockVal = p.lowStock ?? p.low_stock ?? 0;
  const salePriceVal = p.salePrice ?? p.sale_price ?? 0;
  const purchasePriceVal = p.purchasePrice ?? p.purchase_price ?? 0;
  const gstVal = p.gst ?? p.gst_rate ?? 0;

  db.run(`
    INSERT INTO products
    (name, code, category, stock, low_stock, description, sale_price, purchase_price, hsn, gst_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    p.name,
    p.code,
    p.category,
    p.stock,
    lowStockVal,
    p.description,
    salePriceVal,
    purchasePriceVal,
    p.hsn,
    gstVal
  ], err => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

/* ---------- CUSTOMERS ---------- */
app.post("/customers", (req, res) => {
  const { name, phone } = req.body;
  db.run(
    "INSERT INTO customers (name, phone) VALUES (?, ?)",
    [name, phone],
    () => res.json({ success: true })
  );
});

app.get("/customers", (req, res) => {
  db.all(
    `
    SELECT 
      c.name,
      c.phone,
      COUNT(i.id) AS invoiceCount,
      IFNULL(SUM(i.grand_total), 0) AS totalSpent
    FROM customers c
    LEFT JOIN invoices i ON i.customer_name = c.name
    GROUP BY c.id
    `,
    (err, rows) => {
      res.json(rows || []);
    }
  );
});

/* ---------- INVOICES ---------- */
app.post("/invoices", (req, res) => {
  const { customerName, customerPhone, total } = req.body;

  function createInvoice(customerId) {
    db.run(
      "INSERT INTO invoices (customer, grand_total) VALUES (?, ?)",
      [customerId, total],
      () => res.json({ success: true })
    );
  }

  db.get(
    "SELECT id FROM customers WHERE phone = ?",
    [customerPhone],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (row) {
        createInvoice(row.id);
      } else {
        db.run(
          "INSERT INTO customers (name, phone) VALUES (?, ?)",
          [customerName, customerPhone],
          function (err) {
            if (err) return res.status(500).json({ error: "Database error" });
            createInvoice(this.lastID);
          }
        );
      }
    }
  );
});

app.get("/invoices", (req, res) => {
  db.all("SELECT * FROM invoices ORDER BY id DESC", (err, rows) => {
    res.json(rows || []);
  });
});

app.get("/products", (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    res.json(rows || []);
  });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
/* ---------- CUSTOMERS ---------- */

app.get("/api/customers", (req, res) => {
  db.all(
    `
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.email,
      IFNULL(SUM(i.total), 0) AS total_spent
    FROM customers c
    LEFT JOIN invoices i ON i.customer_id = c.id
    GROUP BY c.id
    ORDER BY c.id DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json(rows);
    }
  );
});

app.post("/api/customers", (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.get(
    "SELECT id FROM customers WHERE phone = ?",
    [phone],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
      }

      if (row) {
        // Customer exists → update
        db.run(
          "UPDATE customers SET name = ?, email = ? WHERE phone = ?",
          [name, email, phone],
          err => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Update failed" });
            }
            res.json({ success: true, updated: true });
          }
        );
      } else {
        // New customer → insert
        db.run(
          "INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)",
          [name, phone, email],
          err => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Insert failed" });
            }
            res.json({ success: true, created: true });
          }
        );
      }
    }
  );
});

