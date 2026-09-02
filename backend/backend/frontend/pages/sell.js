import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Sell() {
  const [amount, setAmount] = useState('10000')
  const [platform, setPlatform] = useState('ps5')
  const [username, setUsername] = useState('')
  const [result, setResult] = useState(null)
  const router = useRouter()

  async function submit(e) {
    e.preventDefault()
    setResult('Отправка...')
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sell', amount, platform, username })
    })
    const data = await res.json()
    // create sandbox payment
    const pay = await fetch('/api/payments/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: data.id, method: 'sandbox' }) })
    const payData = await pay.json()
    // redirect to mock payment page
    router.push(payData.paymentUrl)
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Продать монеты</h1>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <label>Сумма монет (число)<br />
          <input value={amount} onChange={e=>setAmount(e.target.value)} style={{ width: '100%', padding:8 }}/>
        </label>
        <label>Платформа<br />
          <select value={platform} onChange={e=>setPlatform(e.target.value)} style={{ width: '100%', padding:8 }}>
            <option value="ps5">PS5</option>
            <option value="ps4">PS4</option>
            <option value="xbox">Xbox</option>
          </select>
        </label>
        <label>Игровой ник (опционально)<br />
          <input value={username} onChange={e=>setUsername(e.target.value)} style={{ width: '100%', padding:8 }} />
        </label>
        <button type="submit" style={{ marginTop: 12, padding: '8px 16px' }}>Создать ордер и оплатить</button>
      </form>

      <pre style={{ marginTop: 16, background: '#fafafa', padding: 12 }}>{result}</pre>
    </main>
  )
}
