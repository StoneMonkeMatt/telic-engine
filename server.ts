import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("simulations.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS simulations (
    id TEXT PRIMARY KEY,
    name TEXT,
    timestamp TEXT,
    config TEXT,
    summary TEXT,
    trajectories TEXT,
    scientific_data TEXT,
    dataset_type TEXT DEFAULT 'full'
  )
`);

// Migration: Ensure columns exist for existing databases
try {
  db.exec("ALTER TABLE simulations ADD COLUMN scientific_data TEXT");
} catch (e) {
  // Column likely already exists
}

try {
  db.exec("ALTER TABLE simulations ADD COLUMN dataset_type TEXT DEFAULT 'full'");
} catch (e) {
  // Column likely already exists
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));

  // API Routes
  app.post("/api/simulations", (req, res) => {
    try {
      const payloadSize = JSON.stringify(req.body).length;
      console.log(`Received simulation save request. Size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);
      
      const { experiment_info, summary, trajectories, scientific_data, dataset_type = 'full' } = req.body;
      
      if (!experiment_info) {
        console.error("Save Error: Missing experiment_info");
        return res.status(400).json({ error: "Missing required field: experiment_info" });
      }

      const id = `${experiment_info.name || 'sim'}_${dataset_type}_${Date.now()}`;
      const displayName = dataset_type === 'full' 
        ? (experiment_info.name || "Untitled Simulation")
        : `${experiment_info.name || "Untitled Simulation"} (${dataset_type === 'data_logger' ? 'Logger' : dataset_type})`;

      console.log(`Archiving simulation: ${id} (Display: ${displayName})`);

      const stmt = db.prepare(`
        INSERT INTO simulations (id, name, timestamp, config, summary, trajectories, scientific_data, dataset_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        displayName,
        experiment_info.timestamp || new Date().toISOString(),
        JSON.stringify(experiment_info.config || {}),
        summary ? JSON.stringify(summary) : null,
        trajectories ? JSON.stringify(trajectories) : null,
        scientific_data ? JSON.stringify(scientific_data) : null,
        dataset_type
      );
      
      res.json({ status: "success", id });
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/simulations", (req, res) => {
    try {
      const rows = db.prepare("SELECT id, name, timestamp, dataset_type, (scientific_data IS NOT NULL) as has_scientific FROM simulations ORDER BY timestamp DESC").all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/simulations/:id", (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM simulations WHERE id = ?").get(req.params.id);
      if (row) {
        res.json({
          id: row.id,
          experiment_info: {
            name: row.name,
            timestamp: row.timestamp,
            config: JSON.parse(row.config)
          },
          summary: row.summary ? JSON.parse(row.summary) : null,
          trajectories: row.trajectories ? JSON.parse(row.trajectories) : null,
          scientific_data: row.scientific_data ? JSON.parse(row.scientific_data) : undefined,
          dataset_type: row.dataset_type
        });
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
