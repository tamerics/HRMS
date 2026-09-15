# HRMS API

A small Express + MongoDB backend for the HRMS mobile web app: core HR, attendance,
leave, payslips, performance goals, onboarding, benefits, and recruitment openings —
plus JWT-based login.

## 1. Prerequisites

- Node.js 18+
- A MongoDB instance — either:
  - installed locally (`mongodb://127.0.0.1:27017`), or
  - a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) (gives you a connection string)

## 2. Setup

```bash
cd hrms-backend
npm install
cp .env.example .env
```

Open `.env` and set:
- `MONGO_URI` — your local or Atlas connection string
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)

## 3. Load sample data (optional but recommended)

```bash
npm run seed
```

This creates 6 employees. Log in as the main demo user:
- **email:** `sara@example.com`
- **password:** `password123`

## 4. Run the server

```bash
npm run dev      # with auto-reload (nodemon)
# or
npm start
```

The API runs at `http://localhost:4000`. Check `GET /api/health` to confirm it's up.

## 5. Authentication

Every route except `/api/auth/*` and `/api/health` requires a JWT.

1. `POST /api/auth/login` with `{ email, password }` → returns `{ token, employee }`
2. Send that token on every other request:
   `Authorization: Bearer <token>`

## API reference

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, get a token |
| GET | `/api/employees/me` | Logged-in employee's profile |
| GET | `/api/employees?q=` | Search the directory |
| GET | `/api/attendance` | This employee's attendance history |
| POST | `/api/attendance/clock-in` | Clock in for today |
| POST | `/api/attendance/clock-out` | Clock out for today |
| GET | `/api/leave` | This employee's leave requests |
| POST | `/api/leave` | Submit a leave request |
| PATCH | `/api/leave/:id` | Approve/decline (managers only) |
| GET | `/api/payslips` | This employee's payslips |
| GET | `/api/goals` | This employee's performance goals |
| POST | `/api/goals` | Add a goal |
| PATCH | `/api/goals/:id` | Update goal progress |
| GET | `/api/onboarding` | This employee's onboarding checklist |
| PATCH | `/api/onboarding/:id` | Mark a step done/undone |
| GET | `/api/benefits` | This employee's enrolled benefits |
| GET | `/api/openings` | Open job requisitions |

## 6. Connecting the frontend

In the React app, replace the sample-data arrays with `fetch` calls to these
endpoints, storing the JWT (e.g. in memory or `sessionStorage` — never
`localStorage` inside a Claude.ai artifact preview) after login and attaching
it as a Bearer token on every request.

## Project structure

```
hrms-backend/
├── server.js           # app entry point
├── seed.js             # sample data loader
├── config/db.js        # MongoDB connection
├── middleware/auth.js  # JWT verification
├── models/              # Mongoose schemas (one per module)
└── routes/               # Express routers (one per module)
```
