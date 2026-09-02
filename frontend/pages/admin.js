import { useState } from 'react'

export default function Admin() {
  const [key, setKey] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/orders', { headers: { 'x-admin-key': key } })
    if (res.status === 401) {
      alert('Unauthorized — wrong admin key')
      setLoading(false)
      return
    }
    const data = await res.json()
    setOrders(data)
    setLoading(false)
  }

  async function update(id, status) {
    const res = await fetch('/api/admin/update-order', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': key }, body: JSON.stringify({ id, status }) })
    if (res.status === 401) { alert('Unauthorized'); return }
    const updated = await res.json()
    setOrders(o => o.map(x => x.id === updated.id ? updated : x))
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Admin</h1>
      <p>Введите admin key и нажмите Load</p>
      <div style={{ marginBottom: 12 }}>
        <input value={key} onChange={e=>setKey(e.target.value)} placeholder="admin key" style={{ padding:8 }} />
        <button onClick={load} style={{ marginLeft: 8, padding: '8px 12px' }}>{loading ? 'Loading...' : 'Load'}</button>
      </div>

      <div>
        {orders.length === 0 ? <div>No orders</div> : orders.map(o => (
          <div key={o.id} style={{ border:'1px solid #eee', padding:8, marginBottom:8 }}>
            <div><strong>#{o.id}</strong> {o.type} {o.amount} ({o.platform})</div>
            <div>Status: {o.status}</div>
            <div style={{ marginTop:8 }}>
              <button onClick={()=>update(o.id, 'paid')} style={{ marginRight:8 }}>Mark paid</button>
              <button onClick={()=>update(o.id, 'cancelled')}>Cancel</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
