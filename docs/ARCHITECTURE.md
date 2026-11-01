# System Architecture & Technical Design

## 1. High-Level Architecture Overview

The system is designed as a decoupled, full-stack, enterprise web application:

```
[ Client: React + TypeScript + Vite + Tailwind CSS ]
                       │
             HTTPS / REST API (JSON)
                       │
       ┌───────────────▼───────────────┐
       │   Express HTTP Gateway        │
       │   - Helmet, CORS, Rate Limit  │
       │   - JSON Body Parsing         │
       └───────────────┬───────────────┘
                       │
       ┌───────────────▼───────────────┐
       │   Middleware Pipeline         │
       │   - authenticate (JWT)        │
       │   - authorizeRole (RBAC)      │
       │   - validateLocationAccess    │
       │   - validateRequest (Zod)     │
       └───────────────┬───────────────┘
                       │
       ┌───────────────▼───────────────┐
       │   Controllers (Thin Handlers) │
       └───────────────┬───────────────┘
                       │
       ┌───────────────▼───────────────┐
       │   Domain Services             │
       │   - SalesService              │
       │   - InventoryCostingService   │
       │   - AccountingReportService   │
       │   - StockTransferService      │
       │   - AuditService              │
       └───────────────┬───────────────┘
                       │
       ┌───────────────▼───────────────┐
       │   Data Access Layer (Mongoose)│
       │   - Models, Schema Validation │
       │   - Atomic Transactions       │
       └───────────────┬───────────────┘
                       │
               [ MongoDB Database ]
```

---

## 2. Directory Layout

```
ladies-wear-management/
├── client/                     # Frontend Single Page Application
│   ├── public/
│   ├── src/
│   │   ├── assets/             # Logos, icons, static assets
│   │   ├── components/         # Reusable UI primitives (Buttons, Modals, Tables, Forms)
│   │   ├── contexts/           # AuthContext, LocationContext, ToastContext, ThemeContext
│   │   ├── features/           # Feature modules:
│   │   │   ├── auth/           # Login, profile, password change
│   │   │   ├── dashboard/      # Admin KPI dashboard, summary cards, charts
│   │   │   ├── sales/          # Quick Sale, Product Sale, Reconciliation, Receipts
│   │   │   ├── inventory/      # Stock view, transfers, adjustments
│   │   │   ├── products/       # Products, categories, variants
│   │   │   ├── purchases/      # Supplier invoices, receive stock
│   │   │   ├── expenses/       # Expense entry, category breakdown
│   │   │   ├── customers/      # Customer directory, balance tracking
│   │   │   ├── suppliers/      # Supplier directory, payables
│   │   │   ├── reports/        # Profit & Loss, Inventory valuation, Sales by location
│   │   │   ├── users/          # Staff management, permissions
│   │   │   └── audit/          # Audit log table and diff viewer
│   │   ├── hooks/              # Custom hooks (useAuth, useLocation, useDebounce)
│   │   ├── layouts/            # AdminLayout, StaffLayout, AuthLayout
│   │   ├── services/           # Axios API client and service endpoints
│   │   ├── types/              # TypeScript interface definitions
│   │   ├── utils/              # Formatters (currency, dates), calculations
│   │   ├── App.tsx             # Route definitions & guards
│   │   └── main.tsx            # App bootstrap
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                     # Backend REST API Service
│   ├── src/
│   │   ├── config/             # DB connection, env config, constants
│   │   ├── controllers/        # Request/response handlers
│   │   ├── middleware/         # Auth, RBAC, location guard, validation, error handler
│   │   ├── models/             # Mongoose schemas with indexes and methods
│   │   ├── routes/             # REST API route declarations
│   │   ├── services/           # Core domain & accounting logic
│   │   ├── validators/         # Zod schemas for request validation
│   │   ├── utils/              # Currency helper, logger, audit helpers
│   │   ├── scripts/            # Admin bootstrap, seed fixtures
│   │   └── app.ts              # Express application factory
│   │   └── server.ts           # Server entry point
│   ├── tests/                  # Integration and business rule tests
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── docs/                       # Project documentation
├── .gitignore
├── .env.example
└── README.md
```

---

## 3. Technology Stack Rationale

| Layer | Choice | Rationale |
|---|---|---|
| Frontend Framework | React 18 + Vite + TypeScript | High rendering performance, fast HMR, type safety across state and API payloads. |
| Styling | Tailwind CSS | Utility-first CSS allowing mobile-responsive, touch-friendly UI for retail staff. |
| State & Routing | React Router v6 + Context API | Clean URL routing, role-based route guards, minimal overhead. |
| Forms & Validation | React Hook Form + Zod | High-performance uncontrolled forms, unified client-server validation schemas. |
| Visualizations | Recharts | Composable SVG-based chart library for revenue, expense, and profit trends. |
| Backend Runtime | Node.js + Express + TypeScript | Mature ecosystem, non-blocking I/O for concurrent POS terminals, strong typing. |
| Database | MongoDB + Mongoose | Document model naturally represents nested invoice items, variants, and flexible audit trails. Local or Atlas hosted. |
| Security | Helmet, bcryptjs, jsonwebtoken, express-rate-limit | Hardened HTTP headers, safe password hashing (cost factor 10), tamper-proof JWT tokens. |
| Testing | Vitest + Supertest | Blazing fast ESM test runner for both unit and API integration tests. |

---

## 4. Key Architectural Patterns

### 4.1 Strict Multi-Tenancy by Location
- Every business document that originates from a physical or virtual branch contains a `locationId` reference.
- The `validateLocationAccess` middleware checks whether:
  1. The authenticated user is an `admin` (global access granted), OR
  2. The authenticated user is `staff` AND the requested `locationId` is in their `assignedLocations` array.
- Unauthorized cross-location requests are rejected immediately with `403 Forbidden`.

### 4.2 Monetary Precision Strategy
- JavaScript IEEE-754 numbers (`0.1 + 0.2 = 0.30000000000000004`) lead to financial drift.
- All monetary operations (prices, costs, discounts, tax, totals, payments) are strictly rounded and stored with consistent 2-decimal precision using explicit rounding utilities (`Math.round(val * 100) / 100`) or integer minor currency units.
- Server is the single source of truth: line totals, discounts, net totals, and cost snapshots are computed strictly server-side.

### 4.3 Atomic Inventory & Accounting Transactions
- Multi-document operations (such as Product Sale deducting stock and creating a stock movement, or Stock Transfer decrementing source and incrementing destination) use MongoDB atomic sessions (`withTransaction`) where replica sets are active, with resilient fallback logic for standalone development servers.
- Stock transfers create mirrored `transfer_out` and `transfer_in` movements linked by a single `transferNumber`.

### 4.4 Non-Repudiation & Audit Trail
- No financial record is ever deleted via a `DELETE` query.
- Voids and returns create compensating ledger records.
- Every create, update, or void event triggers an `AuditLog` entry documenting:
  - `userId` & `userRole`
  - `action` (e.g., `SALE_CREATE`, `SALE_VOID`, `PURCHASE_POST`, `STOCK_TRANSFER`)
  - `entityType` & `entityId`
  - `beforeValues` and `afterValues` snapshots (passwords stripped)
  - Mandatory `reason` string for sensitive corrections.
