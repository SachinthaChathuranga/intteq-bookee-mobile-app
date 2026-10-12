# Bookee Backend

The backend for **Bookee** — an on-demand booking and queue management platform built with Node.js / Express, PostgreSQL, and WebSockets.

---

## Development Seed Accounts & Fixed OTP

To make manual testing and frontend pair development effortless without consuming real SMS credits, a development seed script is provided.

### Test Accounts

| Role | Name | Phone Number | Fixed OTP (Dev Only) | Assigned Context |
|---|---|---|---|---|
| **Customer** | Nimal | `0770000100` | `123456` | Standard customer app user |
| **Owner** | Kasun | `0770000200` | `123456` | Owns "Kasun's Salon" (Colombo & Kandy branches, 4 services each) |
| **Barber** | Amal | `0770000300` | `123456` | Assigned to Colombo & Kandy branches (40% commission) |
| **Receptionist** | Saman | `0770000400` | `123456` | Front desk staff at Colombo branch |
| **Super Admin** | Super Admin | `0770000500` | `123456` | System administrator (`SUPER_ADMIN`) |

### Development-Only Authentication Rules

1. **Fixed OTP (`123456`)**: In `NODE_ENV=development`, entering any of the test numbers above accepts the fixed verification code `123456`.
2. **SMS Suppression**: No SMS messages are dispatched for test numbers in development mode.
3. **Production Safety**: This behavior is strictly guarded by `config.NODE_ENV === 'development'`. In production, fixed OTP bypass is impossible: all phone numbers undergo cryptographically secure random 6-digit generation, HMAC verification, and delivery through Notify.lk.

---

## Database Management & Seeding

### 1. Migrations
Run pending PostgreSQL schema migrations:
```bash
npm run migrate -- up
```

Roll back the most recent migration:
```bash
npm run migrate -- down
```

### 2. Seeding Development Data
Populate the database with realistic test salons, branches, services, working hours, and the test accounts above:
```bash
npm run seed
```

> **Safety Guarantee**: 
> - The seed script refuses to run if `NODE_ENV` is not `development`.
> - The script is completely idempotent and safe to run multiple times without creating duplicate records or unique constraint violations.

---

## Running the Server

Start the development server with live reload (`tsx watch`):
```bash
npm run dev
```

Run TypeScript compilation check:
```bash
npm run typecheck
```

Run test suite (Vitest):
```bash
npm test
```
