const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { orders: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/orders', (req, res) => {
  const db = readDB();
  res.json(db.orders);
});

app.post('/api/orders', (req, res) => {
  const { type, amount, platform, username } = req.body;
  if (!type || !amount || !platform) {
    return res.status(400).json({ error: 'type, amount, platform required' });
  }
  const db = readDB();
  const order = {
    id: Date.now().toString(),
    type,
    amount: Number(amount),
    platform,
    username: username || null,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.orders.unshift(order);
  writeDB(db);
  res.json(order);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Backend listening on', PORT);
});
