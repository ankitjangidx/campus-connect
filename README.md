# Campus Connect

Campus Connect is now organized as a React frontend, an Express API backed by Sequelize, and a MySQL database. Docker is used for MySQL and the backend only.

## Structure

- `frontend/`: React + Tailwind single-page application built with Vite
- `backend/`: Express API using Sequelize + MySQL
- `backend/docker/mysql/init/`: MySQL schema and seed data
- `backend/docker-compose.yml`: local Docker stack for MySQL and backend

## Seeded accounts

- `neha24` / `mentor123`
- `rohit22` / `forum123`
- `ananya25` / `career123`

## Signup and Realtime Messaging

- Users can sign up directly (no OTP email step)
- Direct messaging uses Socket.IO and is limited to users already connected with you

## Run with Docker

```bash
cd backend
docker compose up --build
```

Apps:

- Backend API: `http://localhost:3000/api`
- MySQL: `localhost:3306`

Run the frontend locally:

```bash
cd frontend
npm install
npm run dev
```

## Run locally

1. Start MySQL:

```bash
cd backend
docker compose up mysql -d
```

2. Install backend dependencies and run the API:

```bash
cd backend
npm install
npm run dev
```

3. Install frontend dependencies and run the UI locally:

```bash
cd frontend
npm install
npm run dev
```

## Environment

Copy these files if you want custom values:

- `backend/.env.example`
- `frontend/.env.example`
