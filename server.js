import express from "express";
import cors from "cors";

const app = express();
const rooms = new Map();

app.use(cors());
app.use(express.json());

app.get("/api/room/:code", (req, res) => {
  const data = rooms.get(req.params.code.toUpperCase()) ?? null;
  res.json(data);
});

app.post("/api/room/:code", (req, res) => {
  rooms.set(req.params.code.toUpperCase(), req.body);
  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => console.log(`Room server on :${PORT}`));
