# HRMS

Responsive Human Resources Management System with an Express/MongoDB API and React/Vite web application.

## Features

- Employee mobile workspace for attendance, leave, claims, payroll, profiles, teams, and announcements.
- LAN-restricted attendance actions with attendance history and location metadata support.
- Two-level leave and excuse approvals: direct manager, then general manager.
- Sick, Personal, Vacation, Emergency, Funeral, half-day, timed leave, and monthly two-hour excuses.
- Administration for employees, attendance, fingerprint synchronization, leave, payroll, performance, onboarding, benefits, recruitment, company settings, and analytics.

## Local setup

### API

```powershell
cd hrms
Copy-Item .env.example .env
npm install
npm run seed
npm start
```

Fill in a strong `JWT_SECRET` and the correct MongoDB/fingerprint values before starting the API. Never commit `.env`.

### Web application

```powershell
cd frontend
npm install
npm run dev
```

For production deployment and IIS recovery, see [MOBILE-SUITE-V7.md](MOBILE-SUITE-V7.md) and `REPAIR-IISNODE.ps1`.

## Tests

```powershell
cd hrms
node --test tests/*.test.js
```
