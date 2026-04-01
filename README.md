# OpsTrack API

Backend service for **OpsTrack**, a tactical operations tracking platform built to showcase secure REST API design, PostgreSQL data modeling, and production-ready Node.js practices.

---

## Overview

The OpsTrack API is a role-aware task and operator management service built with **Express.js** and **PostgreSQL**. It provides authentication, authorization, task lifecycle management, audit visibility, and administrative user controls behind a hardened HTTP surface.

This backend is the primary engineering focus of the project and is designed to emphasize:

- SQL-first relational modeling
- secure authentication and RBAC
- environment validation and deployment discipline
- service hardening for real hosting environments

## Live Endpoint

- **API Base:** [`https://opstrack.onrender.com`](https://opstrack.onrender.com)

## Demo Access

Pre-seeded verified credentials for role validation:

### Admin Access

- **Email:** `k.mills@opstrack.mil`
- **Password:** `password123`
- **Role:** `ADMIN`

### Member Access

- **Email:** `j.miller@opstrack.mil`
- **Password:** `password123`
- **Role:** `MEMBER`

---

## Core Technical Flexes

### 1. Relational Database Design

The backend uses a normalized PostgreSQL schema with explicit one-to-many relationships and database-side automation.

Highlights:

- raw SQL querying through repository/service separation
- relational joins across operators, tasks, notes, and audit trails
- trigger-driven timestamp maintenance for task updates
- indexing for common task and audit access paths

### 2. Robust Security

Security is treated as a first-class design constraint.

Highlights:

- JWT-based authentication for protected routes
- Role-Based Access Control (RBAC) separating `ADMIN` and `MEMBER`
- clearance-aware access behavior across privileged operations
- bcrypt-backed password verification in the application flow
- strict request validation using Zod schemas

### 3. Perimeter Defense

The HTTP surface is hardened for internet-facing deployment.

Highlights:

- `helmet` for defensive response headers
- global rate limiting for API traffic
- more aggressive authentication throttling on the login choke point
- strict CORS origin control for the frontend deployment
- structured request identification for traceability

### 4. Production Readiness

The service is designed to behave cleanly in hosted environments.

Highlights:

- startup environment validation before boot
- PostgreSQL connection pooling
- `/healthz` and `/readyz` health endpoints
- graceful shutdown handling for `SIGTERM` and `SIGINT`
- structured logging for operational visibility

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL / Neon Serverless
- **Validation:** Zod
- **Authentication:** JWT + bcrypt
- **Deployment:** Render

---

## Database Schema

### Core Tables

- `users` - operator identity, rank, role, clearance, account state
- `tasks` - operational task records and assignment metadata
- `task_notes` - one-to-many notes attached to tasks
- `audit_logs` - immutable action history for critical activity tracking

### Text-Based ERD

```text
users (1) ───< tasks.assigned_to
users (1) ───< task_notes.operator_id
users (1) ───< audit_logs.operator_id
tasks (1) ───< task_notes.task_id
tasks (1) ───< audit_logs.task_id
```

---

## Notable Endpoints

### Auth

- `POST /api/auth/login` - authenticate operator and return JWT

### Tasks

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/tasks/audit-logs`

### Users

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Service Health

- `GET /healthz`
- `GET /readyz`

---

## Local Development

### Install

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
```

Minimum configuration:

```dotenv
PORT=5000
JWT_SECRET=replace_with_long_random_secret
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DB_SSL=true
```

### Initialize Database

Run `init.sql` once against your database to create tables, indexes, triggers, and seed data.

### Start the Server

```bash
npm run dev
```

---

## Scripts

- `npm start` - run production server
- `npm run dev` - run with nodemon
- `npm test` - integration test suite
- `npm run smoke` - local smoke validation
- `npm run smoke:remote -- <base-url>` - deployed smoke validation
- `npm run demo:check` - test + smoke bundle

---

## Deployment Notes

### Render Settings

- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Node Version:** `>=18`

### Required Environment Variables

- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=<neon-connection-string>`
- `DB_SSL=true`
- `JWT_SECRET=<long-random-secret>`
- `CORS_ORIGIN=<frontend-url>`

### Post-Deploy Verification

```bash
npm run smoke:remote -- https://<api-domain>
```

Expected health results:

```json
{"status":"ok"}
{"status":"ready"}
```

---

## Testing and Verification

This project includes:

- route-level integration coverage
- authentication and authorization checks
- not-found and validation-path testing
- smoke validation against live deployments

Run locally:

```bash
npm test
npm run smoke
```

---

## Security Notes

- Do not commit `.env` or live secrets.
- Rotate JWT and database credentials after public demos.
- Keep `CORS_ORIGIN` matched exactly to the deployed frontend URL.
