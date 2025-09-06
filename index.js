// index.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// DB connection (crea el archivo si no existe)
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Error al abrir la base de datos:", err.message);
  } else {
    console.log("Conectado a SQLite.");
    db.run(
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT CHECK(status IN ('pending','in_progress','done')) DEFAULT 'pending',
        due_date TEXT
      )`
    );
  }
});


/* ---------------------- RUTAS CRUD ---------------------- */

// GET /tasks - listar todas
app.get("/tasks", (req, res) => {
  db.all("SELECT * FROM tasks ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /tasks/:id - obtener una
app.get("/tasks/:id", (req, res) => {
  db.get("SELECT * FROM tasks WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Task no encontrada" });
    res.json(row);
  });
});

// POST /tasks - crear
app.post("/tasks", (req, res) => {
  const { title, description, status, due_date } = req.body;
  if (!title) return res.status(400).json({ error: "title es requerido" });

  const sql =
    "INSERT INTO tasks (title, description, status, due_date) VALUES (?, ?, COALESCE(?, 'pending'), ?)";
  db.run(sql, [title, description ?? null, status ?? null, due_date ?? null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, title, description, status: status ?? "pending", due_date });
  });
});

// PUT /tasks/:id - actualizar completa
app.put("/tasks/:id", (req, res) => {
  const { title, description, status, due_date } = req.body;
  if (!title) return res.status(400).json({ error: "title es requerido" });

  const sql =
    "UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ? WHERE id = ?";
  db.run(sql, [title, description ?? null, status ?? "pending", due_date ?? null, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Task no encontrada" });
    res.json({ id: Number(req.params.id), title, description, status: status ?? "pending", due_date });
  });
});

// PATCH /tasks/:id - actualización parcial (opcional y útil)
app.patch("/tasks/:id", (req, res) => {
  const fields = ["title", "description", "status", "due_date"];
  const updates = [];
  const params = [];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (updates.length === 0) return res.status(400).json({ error: "Nada que actualizar" });

  params.push(req.params.id);
  const sql = `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`;
  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Task no encontrada" });
    res.json({ id: Number(req.params.id), changes: this.changes });
  });
});

// DELETE /tasks/:id - eliminar
app.delete("/tasks/:id", (req, res) => {
  db.run("DELETE FROM tasks WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Task no encontrada" });
    res.json({ deletedID: Number(req.params.id) });
  });
});

/* ---------------------- ARRANQUE ---------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API corriendo en http://0.0.0.0:${PORT}`);
});
