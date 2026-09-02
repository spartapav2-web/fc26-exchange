# FC26 Exchange - MVP

Простой scaffold для платформы покупки/продажи монет FC26.

Что есть в репозитории:
- frontend/ — Next.js приложение с простыми страницами (главная, продать).
- backend/ — Node.js + Express API (микро‑БД в JSON для MVP).
- docker-compose.yml — локальный запуск frontend + backend.

Как запустить (требуется Docker и Docker Compose):

1) Запуск через docker-compose (рекомендуется):

```bash
docker-compose up --build
```

- Frontend будет доступен по: http://localhost:3000
- Backend API: http://localhost:4000/api

2) Локальная разработка (без Docker):
- Для backend:
  cd backend
  npm install
  npm start

- Для frontend:
  cd frontend
  npm install
  npm run dev

Описание API (минимальный набор):
- GET /api/health — статус сервиса
- GET /api/orders — список ордеров
- POST /api/orders — создать ордер (JSON body: { type: 'sell'|'buy', amount: number, platform: 'ps5'|'ps4'|'xbox', username: string })

Дальше я продолжу развёртывание, подключу базу данных (Postgres), очереди (Redis/BullMQ), интеграции с ботами и платёжными провайдерами. Это начальный быстрый прототип, чтобы можно было уже проверять основной UX.

Если хотите — могу сразу задеплоить на staging (Render/DigitalOcean) и подключить HTTPS.
.
