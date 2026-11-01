# Ladies-Wear Business Management System

A full-stack, enterprise-grade business management and POS platform designed for retail ladies-wear businesses operating across dynamic locations (Main Shop, Home Boutique, Pop-up Stalls, Exhibitions).

---

## Key Features

- **Dynamic Location Management**: Add, edit, rename, and deactivate unlimited retail locations without hardcoding.
- **Dual-Mode Sales Engine**:
  - **Quick Sale (Mode A)**: Rapid sales recording on mobile devices for peak hours; records revenue without guessing costs; flags profit as provisional until reconciled.
  - **Product-Wise Sale (Mode B)**: Full barcode/SKU selection, live stock verification, automatic Cost of Goods Sold (COGS) deduction using Weighted-Average Cost snapshots.
- **Unresolved Quick Sale Reconciliation**: Dedicated owner workflow to link sold products, deduct inventory, and confirm final profit margins without double-counting revenue.
- **Strict Role-Based Access Control (RBAC)**:
  - **Admin/Owner**: Global oversight, P&L reports, purchase costs, inventory transfers, dealer payables, audit logs.
  - **Staff**: Mobile-optimized, distraction-free interface restricted exclusively to assigned locations; zero visibility into purchase costs or overall store profit.
- **True Accrual & Inventory Accounting**:
  - Net Sales = Gross Sales - Discounts - Returns.
  - COGS = Inventory Cost of Items Sold.
  - Gross Profit = Net Sales - COGS.
  - Net Profit = Gross Profit - Operating Expenses.
  - Purchases of unsold stock are capitalized into inventory assets, not treated as immediate profit expenses.
- **Weighted-Average Costing (WAC)**: Automatically recomputed on dealer purchase receipt; historical sales retain their cost snapshot.
- **Inter-Location Stock Transfers**: Enforces conservation of total stock across locations.
- **Supplier & Customer Ledgers**: Transaction-derived receivables and payables.
- **Audit Log**: Immutable history of all financial adjustments, voids, and administrative actions.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, React Hook Form, Zod, Recharts, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Mongoose, Zod, bcryptjs, jsonwebtoken, Helmet, CORS, express-rate-limit.
- **Database**: MongoDB (Local or MongoDB Atlas).
- **Testing**: Vitest, Supertest, React Testing Library.

---

## Directory Structure

```
ladies-wear-management/
├── client/          # React + Vite + TypeScript frontend
├── server/          # Node.js + Express + TypeScript backend
├── docs/            # In-depth architectural & business documentation
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API.md
│   ├── BUSINESS_RULES.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   └── PROGRESS.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** >= 18.0.0 (v20 or v22 LTS recommended)
- **MongoDB** >= 6.0 running locally on port 27017, or a MongoDB Atlas connection string.

### 2. Environment Configuration
Create a `.env` file in `server/` (and root if desired) based on `.env.example`:
```bash
cp .env.example server/.env
```
Set unique credentials and ensure `MONGODB_URI` points to your intended database:
```env
MONGODB_URI=mongodb://localhost:27017/ladies_wear_db
JWT_SECRET=<generate-a-unique-random-secret>
PORT=5000
CLIENT_URL=http://localhost:5173
INITIAL_ADMIN_EMAIL=<your-admin-email>
INITIAL_ADMIN_PASSWORD=<unique-admin-password>
INITIAL_ADMIN_NAME=Store Owner
INITIAL_STAFF_EMAIL=<your-staff-email>
INITIAL_STAFF_PASSWORD=<unique-staff-password>
INITIAL_STAFF_NAME=Sales Staff
```

### 3. Bootstrap Initial Administrator
Run the bootstrap script to seed the configured admin/staff accounts and a default location:
```bash
cd server
npm install
npm run seed:admin
```

### 4. Running Development Servers
Run the backend:
```bash
cd server
npm run dev
```

Run the frontend:
```bash
cd client
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## Running Automated Tests
```bash
cd server
npm test
```
The test suite validates the 20 critical business rules defined in `docs/TESTING.md`.

---

## Documentation Links
- [Detailed Requirements](docs/REQUIREMENTS.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Database Schemas & Models](docs/DATABASE_SCHEMA.md)
- [REST API Reference](docs/API.md)
- [Accounting & Business Rules](docs/BUSINESS_RULES.md)
- [Testing Strategy & Acceptance Matrix](docs/TESTING.md)
- [Deployment, Security & Backups](docs/DEPLOYMENT.md)
- [Implementation Progress Tracker](docs/PROGRESS.md)
