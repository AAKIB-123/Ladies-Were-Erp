# REST API Specification

## 1. Authentication & Security Headers
All protected endpoints require an `Authorization` header formatted as:
`Authorization: Bearer <JWT_TOKEN>`

Rate limiting is applied across all endpoints, with stricter thresholds on `/api/auth/login`.

---

## 2. API Endpoints

### 2.1 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Authenticate user; returns JWT & user profile |
| POST | `/api/auth/logout` | Authenticated | Invalidate token/clear session |
| GET | `/api/auth/me` | Authenticated | Retrieve current user profile and assigned locations |
| PUT | `/api/auth/profile` | Authenticated | Update name or phone |
| PUT | `/api/auth/change-password` | Authenticated | Change user password |

### 2.2 Users Management (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | List all staff & admin accounts |
| POST | `/api/users` | Admin | Create new staff or admin user |
| GET | `/api/users/:id` | Admin | Get user details |
| PUT | `/api/users/:id` | Admin | Update user details & assigned locations |
| PUT | `/api/users/:id/status` | Admin | Activate or deactivate user |

### 2.3 Locations (`/api/locations`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/locations` | Authenticated | List locations (Staff sees assigned only; Admin sees all) |
| POST | `/api/locations` | Admin | Create a new location (e.g. Pop-up, Home shop) |
| GET | `/api/locations/:id` | Authenticated | Get location details (checked against user permissions) |
| PUT | `/api/locations/:id` | Admin | Update location name/address |
| PUT | `/api/locations/:id/status` | Admin | Deactivate/activate location |

### 2.4 Products & Variants (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products` | Authenticated | List/search products (Cost redacted for Staff) |
| POST | `/api/products` | Admin | Create product with variants |
| GET | `/api/products/:id` | Authenticated | Get product by ID |
| PUT | `/api/products/:id` | Admin | Update product details |
| PUT | `/api/products/:id/status` | Admin | Deactivate/activate product |

### 2.5 Customers (`/api/customers`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/customers` | Authenticated | Search customers by name or phone |
| POST | `/api/customers` | Authenticated | Create customer (walk-in rapid entry) |
| GET | `/api/customers/:id` | Authenticated | Get customer details and balance |
| GET | `/api/customers/:id/statement`| Authenticated | Ledger statement of sales & payments |
| PUT | `/api/customers/:id` | Authenticated | Update customer details |

### 2.6 Suppliers (`/api/suppliers`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/suppliers` | Admin | List all suppliers |
| POST | `/api/suppliers` | Admin | Create a new supplier |
| GET | `/api/suppliers/:id` | Admin | Get supplier details |
| GET | `/api/suppliers/:id/statement`| Admin | Supplier ledger statement (Purchases vs Payments) |
| PUT | `/api/suppliers/:id` | Admin | Update supplier |

### 2.7 Sales & Returns (`/api/sales`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/sales` | Authenticated | Create Quick Sale or Product-Wise Sale |
| GET | `/api/sales` | Authenticated | Filter sales by location, date, mode, status |
| GET | `/api/sales/:id` | Authenticated | Get single sale details |
| POST | `/api/sales/:id/returns` | Authenticated | Process return for a sale |
| POST | `/api/sales/:id/reconcile` | Admin | Map items to Quick Sale & calculate COGS |
| POST | `/api/sales/:id/void` | Admin | Void sale with audit reason |

### 2.8 Purchases & Stock Receipts (`/api/purchases`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/purchases` | Admin | List dealer purchase invoices |
| POST | `/api/purchases` | Admin | Post new dealer purchase invoice |
| GET | `/api/purchases/:id` | Admin | Get purchase details |

### 2.9 Inventory & Stock Transfers (`/api/inventory`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/inventory` | Authenticated | Stock on hand by location & variant |
| GET | `/api/inventory/movements`| Admin | Historical stock movement ledger |
| POST | `/api/stock-transfers` | Admin/Staff | Transfer stock between locations |
| GET | `/api/stock-transfers` | Authenticated | List stock transfers |

### 2.10 Expenses (`/api/expenses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/expenses` | Authenticated | List expenses (Staff filtered to assigned location) |
| POST | `/api/expenses` | Authenticated | Record new expense |

### 2.11 Payments (`/api/payments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/payments` | Authenticated | List payments (Collections & Payouts) |
| POST | `/api/payments` | Authenticated | Record customer payment collection or payout |

### 2.12 Reports & Analytics (`/api/reports`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/reports/dashboard` | Admin | KPI cards (Sales, Cash, UPI, Receivables, Payables, Profit) |
| GET | `/api/reports/profit-loss` | Admin | Comprehensive P&L (Confirmed vs. Provisional) |
| GET | `/api/reports/inventory-valuation` | Admin | Stock valuation at current WAC |
| GET | `/api/reports/location-breakdown` | Admin | Sales, expenses, and margins by location |

### 2.13 Audit Logs (`/api/audit-logs`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/audit-logs` | Admin | Query system audit trail with filters |
