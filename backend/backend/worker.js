const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { Pool } = require('pg');
require('dotenv').config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

const worker = new Worker('orders', async job => {
  const { orderId } = job.data;
  console.log('Worker processing order', orderId);
  // simulate some processing time
  await new Promise(r => setTimeout(r, 2000));
  // mark order as completed in DB
  if (pool) {
    await pool.query("UPDATE orders SET status='completed' WHERE id=$1", [orderId]);
    console.log('Order', orderId, 'marked completed in Postgres');
  } else {
    // update JSON DB
    const fs = require('fs');
    const path = require('path');
    const DB_PATH = path.join(__dirname, 'db.json');
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(raw);
    const idx = db.orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      db.orders[idx].status = 'completed';
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
      console.log('Order', orderId, 'marked completed in JSON DB');
    }
  }
}, { connection });

worker.on('completed', job => {
  console.log('Job completed', job.id);
});
worker.on('failed', (job, err) => {
  console.error('Job failed', job.id, err);
});

console.log('Worker started');
