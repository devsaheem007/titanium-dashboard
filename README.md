# Titanium — Full-Stack Admin Dashboard (MERN)

A production-oriented admin dashboard with a **Titanium Gray / Smoky Black** glass theme.
React + Vite + Tailwind on the front, Express + MongoDB (Mongoose) on the back, JWT in secure HTTP-only cookies.

## Contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [Project structure](#project-structure)
4. [How the important parts work (and why)](#how-the-important-parts-work-and-why)
5. [Roles and permissions](#roles-and-permissions)
6. [Feature checklist](#feature-checklist)
7. [API overview](#api-overview)
8. [Deploying](#deploying)
9. [Honest notes and known limitations](#honest-notes-and-known-limitations)

---

## Quick start

**Requirements:** Node.js 18+ and a MongoDB Atlas free cluster (or any MongoDB).

### 1. Create the database (MongoDB Atlas)
1. Create a free cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add your IP (or `0.0.0.0/0` while learning).
4. **Connect → Drivers** → copy the connection string. Replace `<password>` and add a database name:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/titanium?retryWrites=true&w=majority`

### 2. Install and configure
```bash
cd titanium
npm run install:all            # installs server/ and client/

cp server/.env.example server/.env
# open server/.env and set MONGODB_URI and JWT_SECRET
# generate a secret:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Run (two terminals)
```bash
npm run dev:server    # API on http://localhost:5000
npm run dev:client    # App on http://localhost:5173
```
Open <http://localhost:5173>.

### 4. Create your first account
* **Easiest:** click **Create an account**. *The very first account becomes the admin automatically.*
* **Or** seed sample data (admin + 3 users, 2 projects, 5 tasks) so the charts have something to show:
  ```bash
  npm run seed            # admin@titanium.local / ChangeMe123  (change it in .env first!)
  npm run seed -- --reset # wipes all collections, then seeds
  ```

### Password-reset emails in development
If `SMTP_HOST` is empty, no email is sent. The reset link is **printed in the server terminal** — copy it into your browser. To send real emails, fill the `SMTP_*` values (Gmail app password, Mailtrap, Resend SMTP, etc.).

---

## Environment variables

All live in `server/.env` (see `server/.env.example`). Nothing secret is ever sent to the browser.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs login tokens. Long and random (32+ chars). The server refuses to start in production if it's shorter |
| `JWT_EXPIRES_DAYS` | Session length (default 7) |
| `CLIENT_URL` | Origin of the React app (CORS + links in emails) |
| `SMTP_*`, `EMAIL_FROM` | Nodemailer settings for password-reset and email notifications |
| `SEED_ADMIN_EMAIL/PASSWORD` | Credentials used by `npm run seed` |

---

## Project structure

```
titanium/
├── server/
│   └── src/
│       ├── config/        env validation, DB connection, roles/permissions constants
│       ├── models/        User, Project, Task, Notification, Activity,
│       │                  PasswordResetToken (+ Setting, Message)
│       ├── validators/    Zod schemas for every request body/query
│       ├── middleware/    auth (JWT cookie), validate, sanitize, rateLimit, upload, error
│       ├── controllers/   auth, users, profile, projects, tasks, analytics, reports, settings, misc
│       ├── services/      activity log, notifications, project-progress logic, access scopes
│       ├── routes/        one file wiring URLs → middleware → controllers
│       ├── app.js         Express app (security middleware, routes, error handler)
│       ├── server.js      connects to MongoDB, then starts listening
│       └── seed.js        optional starter data
└── client/
    └── src/
        ├── api/           axios instance (+ error helpers)
        ├── context/       AuthContext (session + theme), ToastContext
        ├── hooks/         useFetch (loading/error/reload), useDebounce
        ├── components/    ui.jsx (Button, Input, Modal, Badge…), Sidebar, AppLayout,
        │                  NotificationDropdown, Charts, route guards
        ├── pages/         Login, Register, ForgotPassword, ResetPassword, Overview,
        │                  Analytics, Users, UserDetail, Projects, Tasks, Messages,
        │                  Notifications, Reports, Settings, Profile, Security
        └── index.css      the Titanium design tokens (dark + light)
```

---

## How the important parts work (and why)

### Authentication: JWT in an HTTP-only cookie
1. `POST /api/auth/login` checks the password with `bcrypt.compare`. The password is stored only as a bcrypt hash (12 rounds) and is `select: false` on the model, so it is never returned by accident.
2. The server signs a **JWT** and sets it as a cookie with `httpOnly`, `sameSite`, and `secure` (in production).
   * **Why a cookie, not localStorage?** JavaScript cannot read an `httpOnly` cookie, so an XSS bug can't steal the token.
   * **Why `sameSite`?** The browser won't attach the cookie to requests started by other websites, which blocks CSRF.
3. On every request the `protect` middleware verifies the cookie, loads the user, and rejects deactivated accounts.
4. **Session persistence:** on page load the React app calls `GET /api/auth/me`. If the cookie is valid you stay signed in; if not, the guard sends you to `/login`.
5. During development Vite **proxies** `/api` to port 5000, so the browser sees one origin and cookies work with no CORS pain.

Other details: login returns the *same* error for "unknown email" and "wrong password" (so attackers can't discover accounts); changing a password invalidates every older token (`passwordChangedAt`); reset tokens are random, stored **hashed**, expire in 30 minutes, and are single-use.

### Validation and sanitising
* Every route validates input with **Zod** before the controller runs (`middleware/validate.js`).
* `middleware/sanitize.js` strips keys beginning with `$` or containing `.` to stop NoSQL-operator injection (`{"email": {"$gt": ""}}`).
* Search text is regex-escaped before it reaches MongoDB.
* The client validates too, but only for nicer UX — **the server is the real gatekeeper.**

### Centralised errors
Controllers are wrapped in `asyncHandler`; anything thrown reaches `middleware/error.js`, which converts Zod, Mongoose (validation, bad ids, duplicate keys) and Multer errors into one consistent JSON shape: `{ success: false, message, errors: { field: message } }`. The React forms use the `errors` object to show messages under the right input.

### Charts use real data
`controllers/analytics.controller.js` uses MongoDB **aggregation pipelines** (`$group`, `$dateToString`, `$lookup`) to count users, tasks and activity per day/week/month. There is no hard-coded data anywhere. With an empty database the charts show empty states.

### Project progress
If a project has tasks, `progress` is recalculated automatically (done tasks ÷ all tasks) whenever a task is created, changed, moved or deleted. A project without tasks uses the manual slider.

### Notifications and activity
`services/common.js` has `logActivity` (writes the timeline) and `notify` (creates in-app notifications, respecting each user's preferences, and emails if enabled and SMTP is set). The bell polls every 30 seconds.

---

## Roles and permissions

| Role | Default permissions |
|---|---|
| **Admin** | Everything |
| **Manager** | `users:read`, `projects:write`, `tasks:write`, `reports:read`; sees all projects/tasks |
| **User** | None; sees only projects/tasks they own, are assigned to, or created. Can create tasks and change the status of tasks assigned to them |

An admin can grant a single person **extra permissions** (Users → Edit → Permissions). Permissions available: `users:read`, `users:write`, `projects:write`, `tasks:write`, `reports:read`, `settings:manage`.

Safety rules: you can't delete, deactivate or demote yourself, and the last active admin can't be removed.

The checks live in **two places on purpose**: the API (`requirePermission` in `routes/index.js`) is the real protection; the sidebar and buttons are hidden in the UI only for convenience.

---

## Feature checklist

| Area | Included |
|---|---|
| Auth | Login, register, logout, forgot/reset password by email, password show/hide, validation, rate limiting, protected routes, redirect to login, session persistence, RBAC |
| Overview | Total users, active users, total projects, pending tasks, growth %, charts, recent activity, date-range filter, quick actions |
| Analytics | User growth, activity, project completion, task performance, priority split, top performers; 7/30/90/365-day range and daily/weekly/monthly grouping |
| Users | List, search, filter by role/status, pagination, detail page, add, edit, delete with confirmation, activate/deactivate, roles, per-user permissions |
| Projects | Create, edit, delete, assign users, deadlines, status, progress, detail view with tasks, search and filter |
| Tasks | Create, edit, delete, assign, priority, status (inline change), due dates, search, filters (status, priority, project, assignee, mine, overdue) |
| Messages | Direct messages, conversation list, unread counts |
| Notifications | Dropdown, read/unread, mark all read, delete, activity timeline tab |
| Reports | CSV exports of users, projects, tasks, activity |
| Settings / Profile / Security | Profile info, avatar upload, email change (needs password), change password, notification preferences, dark/light theme saved to account; admin: app name, registration on/off, system alert banner, roles & permissions matrix |
| UX | Collapsible + responsive sidebar, loading skeletons, empty states, error states with retry, toasts, confirm dialogs |

---

## API overview

Base URL `/api`. Everything except the "public" group needs the login cookie.

| Group | Endpoints |
|---|---|
| Public | `GET /settings/public`, `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` |
| Account | `GET /auth/me`, `POST /auth/change-password`, `PATCH /profile`, `POST/DELETE /profile/avatar` |
| Users | `GET /users`, `POST /users`, `GET/PATCH/DELETE /users/:id`, `PATCH /users/:id/status`, `GET /users/directory` |
| Projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id` |
| Tasks | `GET/POST /tasks`, `PATCH/DELETE /tasks/:id` |
| Notifications | `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id` |
| Other | `GET /activities`, `/messages/*`, `/analytics/overview`, `/analytics/detailed`, `/reports/summary`, `/reports/export/:type`, `/admin/settings`, `/admin/roles` |

---

## Deploying

Simplest: **one server serves both** the API and the built React app.
```bash
npm run build                 # builds client/dist
NODE_ENV=production npm start # the API also serves client/dist
```
Set `NODE_ENV=production`, a strong `JWT_SECRET`, `CLIENT_URL` to your public URL, real `SMTP_*` values, and serve over **HTTPS** (secure cookies require it). Avatars are saved to `server/uploads/`; on hosts with a temporary disk (Render free tier, etc.) use a persistent disk or swap the upload code for S3/Cloudinary.

If you host the frontend and API on **different domains**, the cookie needs `sameSite: 'none'` + `secure: true` (change `cookieOptions` in `server/src/middleware/auth.js`) and `CLIENT_URL` must match the frontend origin exactly.

---

## Honest notes and known limitations

* **Revenue is not included.** The brief says "total revenue (if applicable)". The data model has no sales/payments, and a made-up number would break the "no fake statistics" rule. If you add an `Order`/`Invoice` model later, add one more aggregation to `analytics.controller.js` and one more `StatCard` in `Overview.jsx`.
* **"Active users"** means accounts that signed in during the selected date range.
* **Testing status.** The client builds without errors, and the API was smoke-tested without a database (boot, validation, auth guards, NoSQL-injection filter, error handling, malformed JSON, rate-limit headers). **The database-backed flows (register → login → CRUD → charts → exports) were not run end-to-end in the build environment, because it could not download a MongoDB binary.** Please run through them once against your Atlas cluster (steps below) and report anything that misbehaves.
* **Real-time:** notifications and messages refresh by polling (30s / 10s), not WebSockets.
* **Sessions:** tokens are stateless. Logging out clears the cookie on this device; changing your password signs out all other devices. There's no per-device session list.
* **Email notifications** only send when SMTP is configured.
* Permissions can be granted to individuals, but the **role defaults are fixed in code** (`server/src/config/constants.js`) — the settings page shows them read-only.
* No automated test suite yet. Good next step: Jest/Vitest + Supertest with `mongodb-memory-server` on a machine that can download MongoDB.

### 10-minute manual test script
1. Register (becomes admin) → you land on the Overview. Refresh the page: still signed in.
2. Log out → visiting `/projects` redirects to login.
3. Users → Add a manager and a normal user. Deactivate the normal user and try to sign in as them: blocked.
4. Projects → create one and assign the user; Tasks → create tasks, change status inline. The project's progress updates.
5. Sign in as the normal user (another browser): sees only their own work, can't see Users/Reports.
6. Forgot password → copy the link from the server terminal → set a new password.
7. Overview/Analytics: change the date range; numbers and charts match what you created.
8. Settings (admin): set a system alert, turn registration off; check the banner and `/register`.
9. Reports → download a CSV and open it.
10. Profile → upload a picture, switch to light theme, reload (theme persists).
