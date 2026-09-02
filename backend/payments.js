module.exports = function setupPayments(app, pool, redisConnection) {
  // simple in-memory/payments DB if Postgres not present
  const paymentsPath = require('path').join(__dirname, 'payments.json');
  const fs = require('fs');

  function readPayments() {
    try { return JSON.parse(fs.readFileSync(paymentsPath, 'utf-8')); } catch (e) { return { payments: [] }; }
  }
  function writePayments(p) { fs.writeFileSync(paymentsPath, JSON.stringify(p, null, 2)); }

  // create a payment for an order (sandbox)
  app.post('/api/payments/create', async (req, res) => {
    const { orderId, method } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    // ensure order exists
    let order = null;
    if (pool) {
      const r = await pool.query('SELECT id, status FROM orders WHERE id=$1', [orderId]);
      order = r.rows[0];
      if (!order) return res.status(404).json({ error: 'order not found' });
    } else {
      const p = readPayments();
      const db = require('fs').readFileSync(require('path').join(__dirname, 'db.json'), 'utf-8');
      const dbj = JSON.parse(db);
      order = dbj.orders.find(o=>o.id===orderId);
      if (!order) return res.status(404).json({ error: 'order not found' });
    }

    const paymentId = 'pay_' + Date.now().toString();
    const payment = { id: paymentId, orderId, method: method || 'sandbox', status: 'pending', created_at: new Date().toISOString() };

    if (pool) {
      await pool.query('CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, order_id TEXT, method TEXT, status TEXT, created_at TIMESTAMPTZ)');
      await pool.query('INSERT INTO payments(id, order_id, method, status, created_at) VALUES($1,$2,$3,$4,$5)', [payment.id, payment.orderId, payment.method, payment.status, payment.created_at]);
    } else {
      const pj = readPayments(); pj.payments.unshift(payment); writePayments(pj);
    }

    // return a mock payment URL (frontend route)
    const paymentUrl = `/payment/${paymentId}`;
    res.json({ paymentId, paymentUrl });
  });

  // webhook/simulator: mark payment status and update order
  app.post('/api/payments/webhook', async (req, res) => {
    const { paymentId, status } = req.body;
    if (!paymentId || !status) return res.status(400).json({ error: 'paymentId and status required' });

    let payment = null;
    if (pool) {
      const r = await pool.query('SELECT id, order_id, status FROM payments WHERE id=$1', [paymentId]);
      payment = r.rows[0];
      if (!payment) return res.status(404).json({ error: 'payment not found' });
      await pool.query('UPDATE payments SET status=$1 WHERE id=$2', [status, paymentId]);
      if (status === 'paid') {
        await pool.query("UPDATE orders SET status='paid' WHERE id=$1", [payment.order_id]);
      }
    } else {
      const pj = readPayments();
      const idx = pj.payments.findIndex(p=>p.id===paymentId);
      if (idx===-1) return res.status(404).json({ error: 'payment not found' });
      pj.payments[idx].status = status; writePayments(pj);
      if (status === 'paid') {
        const db = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'db.json'), 'utf-8'));
        const oi = db.orders.findIndex(o=>o.id===pj.payments[idx].orderId);
        if (oi!==-1) { db.orders[oi].status = 'paid'; fs.writeFileSync(require('path').join(__dirname, 'db.json'), JSON.stringify(db, null,2)); }
      }
    }

    res.json({ ok: true });
  });

  // get payment status
  app.get('/api/payments/:id', async (req, res) => {
    const id = req.params.id;
    if (pool) {
      const r = await pool.query('SELECT id, order_id, method, status, created_at FROM payments WHERE id=$1', [id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'not found' });
      return res.json(r.rows[0]);
    }
    const pj = readPayments();
    const p = pj.payments.find(x=>x.id===id);
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
  });
}
