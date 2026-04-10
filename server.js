import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const rooms = new Map();

app.use(express.json());

app.get("/api/room/:code", (req, res) => {
  const data = rooms.get(req.params.code.toUpperCase()) ?? null;
  res.json(data);
});

app.post("/api/room/:code", (req, res) => {
  rooms.set(req.params.code.toUpperCase(), req.body);
  res.json({ ok: true });
});

app.use(express.static(join(__dirname, "dist")));
app.get("/{*path}", (_, res) => res.sendFile(join(__dirname, "dist", "index.html")));

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => console.log(`Serving on http://0.0.0.0:${PORT}`));
