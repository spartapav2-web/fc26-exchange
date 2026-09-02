import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PaymentPage() {
  const router = useRouter()
  const { id } = router.query
  const [status, setStatus] = useState('loading')
  const [payment, setPayment] = useState(null)

  useEffect(()=>{
    if (!id) return
    fetch('/api/payments/' + id).then(r=>r.json()).then(p=>setPayment(p)).catch(()=>setPayment(null))
  }, [id])

  async function simulate() {
    // call webhook to mark payment paid
    await fetch('/api/payments/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: id, status: 'paid' }) })
    setStatus('paid')
  }

  return (
    <main style={{ padding:24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Платёж (sandbox)</h1>
      {!payment && <div>Загрузка...</div>}
      {payment && (
        <div>
          <div>Payment ID: {payment.id}</div>
          <div>Order: {payment.order_id || payment.orderId}</div>
          <div>Status: {payment.status}</div>
          <div style={{ marginTop:12 }}>
            <button onClick={simulate} style={{ padding: '8px 12px' }}>Simulate payment (mark as paid)</button>
          </div>
        </div>
      )}
      {status === 'paid' && <div style={{ marginTop:12, color: 'green' }}>Платёж подтверждён — ордер помечен как paid.</div>}
    </main>
  )
}
