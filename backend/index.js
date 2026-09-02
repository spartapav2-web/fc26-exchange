const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

require('dotenv').config();
const { Pool } = require('pg');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const DB_PATH = path.join(__dirname, 'db.json');

let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Using Postgres:', process.env.DATABASE_URL.replace(/:\/\/.*@/, '://***@'));
} else {
  console.log('No DATABASE_URL provided, using JSON file DB');
}

let orderQueue = null;
let redisConnection = null;
if (process.env.REDIS_URL) {
  redisConnection = new IORedis(process.env.REDIS_URL);
  orderQueue = new Queue('orders', { connection: redisConnection });
  console.log('Connected to Redis:', process.env.REDIS_URL);
}

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

app.get('/api/orders', async (req, res) => {
  if (pool) {
    const result = await pool.query('SELECT id, type, amount, platform, username, status, created_at FROM orders ORDER BY created_at DESC LIMIT 100');
    return res.json(result.rows);
  }
  const db = readDB();
  res.json(db.orders);
});

app.post('/api/orders', async (req, res) => {
  const { type, amount, platform, username } = req.body;
  if (!type || !amount || !platform) {
    return res.status(400).json({ error: 'type, amount, platform required' });
  }
  const order = {
    id: Date.now().toString(),
    type,
    amount: Number(amount),
    platform,
    username: username || null,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  if (pool) {
    await pool.query(
      'INSERT INTO orders(id, type, amount, platform, username, status, created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [order.id, order.type, order.amount, order.platform, order.username, order.status, order.created_at]
    );
  } else {
    const db = readDB();
    db.orders.unshift(order);
    writeDB(db);
  }

  // enqueue job for automation (simulated bot)
  if (orderQueue) {
    orderQueue.add(order.id, { orderId: order.id, type: order.type, amount: order.amount, platform: order.platform }, { removeOnComplete: true, removeOnFail: true });
  }

  res.json(order);
});

// ADMIN: list orders (protected by x-admin-key)
app.get('/api/admin/orders', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (pool) {
    const result = await pool.query('SELECT id, type, amount, platform, username, status, created_at FROM orders ORDER BY created_at DESC LIMIT 1000');
    return res.json(result.rows);
  }
  const db = readDB();
  res.json(db.orders);
});

// ADMIN: update order status
app.post('/api/admin/update-order', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ error: 'id and status required' });

  if (pool) {
    await pool.query('UPDATE orders SET status=$1 WHERE id=$2', [status, id]);
    const r = await pool.query('SELECT id, type, amount, platform, username, status, created_at FROM orders WHERE id=$1', [id]);
    return res.json(r.rows[0]);
  }

  const db = readDB();
  const idx = db.orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  db.orders[idx].status = status;
  writeDB(db);
  res.json(db.orders[idx]);
});

// BOT API: get next pending order (protected by x-bot-key)
app.get('/api/bot/next-order', async (req, res) => {
  const key = req.headers['x-bot-key'];
  if (!process.env.BOT_KEY || key !== process.env.BOT_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (pool) {
    // select one pending order
    const result = await pool.query("SELECT id, type, amount, platform, username FROM orders WHERE status='pending' ORDER BY created_at ASC LIMIT 1");
    const order = result.rows[0];
    if (!order) return res.json({});
    await pool.query("UPDATE orders SET status='assigned' WHERE id=$1", [order.id]);
    return res.json(order);
  }

  const db = readDB();
  const idx = db.orders.findIndex(o => o.status === 'pending');
  if (idx === -1) return res.json({});
  const order = db.orders[idx];
  order.status = 'assigned';
  writeDB(db);
  res.json(order);
});

// BOT API: report status for order
app.post('/api/bot/report', async (req, res) => {
  const key = req.headers['x-bot-key'];
  if (!process.env.BOT_KEY || key !== process.env.BOT_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ error: 'id and status required' });

  if (pool) {
    await pool.query('UPDATE orders SET status=$1 WHERE id=$2', [status, id]);
    const r = await pool.query('SELECT id, type, amount, platform, username, status, created_at FROM orders WHERE id=$1', [id]);
    return res.json(r.rows[0]);
  }

  const db = readDB();
  const idx = db.orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  db.orders[idx].status = status;
  writeDB(db);
  res.json(db.orders[idx]);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Backend listening on', PORT);
});
