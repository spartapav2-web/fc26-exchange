export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>FC26 Exchange (MVP)</h1>
      <p>Прототип площадки для продажи/покупки монет FC26.</p>
      <p>
        Перейдите на страницу <a href="/sell">Продать монеты</a> чтобы создать ордер.
      </p>
      <section style={{ marginTop: 24 }}>
        <h2>Текущие ордера</h2>
        <div id="orders">Загрузка...</div>
      </section>
      <script dangerouslySetInnerHTML={{ __html: `
        fetch('/api/orders').then(r=>r.json()).then(data=>{
          const el = document.getElementById('orders');
          if(!data.length) { el.innerText = 'Пока нет ордеров'; return }
          el.innerHTML = data.map(o => `<div style="border:1px solid #eee;padding:8px;margin:8px 0">#${o.id} ${o.type} ${o.amount} (${o.platform}) — ${o.status}</div>`).join('')
        })
      `}} />
    </main>
  )
}
