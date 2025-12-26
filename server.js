const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

/* ===============================
   MIDDLEWARE
================================ */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   DATABASE
================================ */
const db = new sqlite3.Database("./database.db");

/* ===============================
   TABLES
================================ */

// USERS
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
  )
`);

// CUSTOMERS
db.run(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT
  )
`);

// PRODUCTS
db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    code TEXT,
    category TEXT,
    stock INTEGER,
    sale_price REAL,
    purchase_price REAL,
    gst REAL
  )
`);

// INVOICES
db.run(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total_amount REAL,
    created_at TEXT
  )
`);

/* ===============================
   DEFAULT OWNER
================================ */
db.get("SELECT * FROM users WHERE role = 'owner'", (err, row) => {
  if (!row) {
    console.log("Creating default owner user...");
    db.run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      ["Owner", "owner@admin.com", "admin123", "owner"],
      () => console.log("Owner user created successfully")
    );
  } else {
    console.log("Owner user already exists");
  }
});

/* ===============================
   AUTH
================================ */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, user) => {
      if (user) {
        res.json({
          success: true,
          role: user.role,
          name: user.name
        });
      } else {
        res.status(401).json({ success: false });
      }
    }
  );
});

/* ===============================
   CUSTOMERS
================================ */

// GET customers + total spent
app.get("/api/customers", (req, res) => {
  db.all(
    `
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.email,
      IFNULL(SUM(i.total_amount), 0) AS total_spent
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

// UPSERT customer
app.post("/api/customers", (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.get(
    "SELECT id FROM customers WHERE phone = ?",
    [phone],
    (err, row) => {
      if (row) {
        db.run(
          "UPDATE customers SET name = ?, email = ? WHERE phone = ?",
          [name, email, phone],
          err => {
            if (err) return res.status(500).json({ error: "Update failed" });
            res.json({ success: true, updated: true });
          }
        );
      } else {
        db.run(
          "INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)",
          [name, phone, email],
          err => {
            if (err) return res.status(500).json({ error: "Insert failed" });
            res.json({ success: true, created: true });
          }
        );
      }
    }
  );
});

/* ===============================
   PRODUCTS
================================ */
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products ORDER BY id DESC", [], (err, rows) => {
    res.json(rows);
  });
});

app.post("/api/products", (req, res) => {
  const p = req.body;
  db.run(
    `
    INSERT INTO products
    (name, code, category, stock, sale_price, purchase_price, gst)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      p.name,
      p.code,
      p.category,
      p.stock,
      p.sale_price,
      p.purchase_price,
      p.gst
    ],
    err => {
      if (err) return res.status(500).json({ error: "Product insert failed" });
      res.json({ success: true });
    }
  );
});

/* ===============================
   INVOICES
================================ */
app.post("/api/invoices", (req, res) => {
  const { customerName, customerPhone, total } = req.body;

  db.get(
    "SELECT id FROM customers WHERE phone = ?",
    [customerPhone],
    (err, row) => {
      if (row) {
        createInvoice(row.id);
      } else {
        db.run(
          "INSERT INTO customers (name, phone) VALUES (?, ?)",
          [customerName, customerPhone],
          function () {
            createInvoice(this.lastID);
          }
        );
      }
    }
  );

  function createInvoice(customerId) {
    db.run(
      `
      INSERT INTO invoices (customer_id, total_amount, created_at)
      VALUES (?, ?, datetime('now'))
      `,
      [customerId, total],
      err => {
        if (err) return res.status(500).json({ error: "Invoice failed" });
        res.json({ success: true });
      }
    );
  }
});

/* ===============================
   DASHBOARD
================================ */
app.get("/api/dashboard", (req, res) => {
  db.get(
    "SELECT IFNULL(SUM(total_amount),0) AS monthlySales FROM invoices",
    [],
    (err, monthly) => {
      res.json({
        monthlySales: monthly.monthlySales
      });
    }
  );
});

/* ===============================
   SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
