# Ladies-Wear Business Management System - Requirements Specification

## 1. Executive Summary & Purpose
The Ladies-Wear Business Management System is a full-stack, enterprise-grade business management and Point of Sale (POS) solution tailored specifically for retail ladies-wear businesses. The business operates across dynamic physical and virtual sales points (e.g., Main Shop, Owner's Home, Pop-up Stalls, Exhibitions, Online Channels).

The system solves the dual challenge of:
1. Providing an ultra-simple, mobile-friendly interface for floor staff to record sales without complex software friction.
2. Delivering an accurate, auditable, centralized financial control and inventory system for the owner with strict double-entry integrity, real-time stock valuation, and true profit accounting.

---

## 2. Dynamic Locations
- The system must never hardcode location names or counts.
- Dynamic creation, editing, renaming, and deactivation of locations.
- Every transaction (Sale, Inventory movement, Stock transfer, Location-specific expense, Purchase receipt) must bind to a permanent `LocationId` (MongoDB `ObjectId`).
- Renaming a location preserves full historical reporting continuity.
- Deactivated locations are retained for historical records; deactivation disables new transaction entry but never deletes historical ledger entries or balances.

---

## 3. User Roles & Permission Hierarchy

### 3.1 Admin / Owner
- Unrestricted access across all locations and administrative settings.
- Staff user management (creation, role assignment, password resets, location binding, deactivation).
- Full catalog management: Categories, Products, Sizes, Colours, Product Variants, Pricing, Weighted-Average Cost inspection.
- Supplier and Customer relationship management.
- Purchase invoices, Landed costs, Supplier payments, Accounts Payable (AP).
- Stock management: multi-location stock levels, inter-location stock transfers, damage/loss write-offs, manual adjustments.
- Financial reporting: Net Sales, COGS, Gross Profit, Net Profit, Balance Sheets, Accounts Receivable (AR), Accounts Payable (AP), Stock Valuation.
- Audit Log inspection: complete non-repudiation ledger of all state alterations.
- Quick Sale reconciliation: reviewing staff-entered quick sales and allocating actual SKU inventory and costs.

### 3.2 Staff Member
- Restricted login tied strictly to one or more assigned locations.
- Cannot view, select, or transact in unauthorized locations (enforced on backend API).
- High-velocity, mobile-friendly sales entry screen.
- Two entry modes:
  - **Quick Sale (Mode A)**: high speed, customer + total amount + payment method. Requires later reconciliation.
  - **Product-wise Sale (Mode B)**: SKU/variant selection, live stock display, automatic COGS deduction.
- Customer lookup and rapid walk-in customer creation.
- Record approved petty cash/expenses for the assigned location.
- Record customer credit collections for authorized staff.
- Strict restrictions:
  - **Zero visibility** into product purchase costs or supplier margins.
  - **Zero visibility** into business-wide profit/loss reports.
  - **Zero access** to other staff accounts or system settings.
  - **Zero ability** to delete or silently overwrite posted financial records.

---

## 4. Sales Modes & Accounting Rules

### 4.1 Mode A: Quick Sale
- Intended for peak shopping hours and mobile operation where scanning or selecting SKUs is impractical.
- Fields: Location, Sale Date/Time, Customer (optional), Total Amount, Discount, Payment Method (Cash, UPI, Bank Transfer, Credit), Amount Received, Staff ID.
- **Accounting & Inventory Treatment**:
  - Revenue and Cash/Receivable are recorded immediately.
  - Product quantities and product costs are **NOT** fabricated or guessed.
  - Flagged as `isReconciled: false`.
  - Profit reports designate revenue from Quick Sales as **Provisional / Unreconciled**.
  - Admin dashboard features a dedicated Reconciliation queue where the owner links products sold to complete inventory deduction and calculate finalized COGS.

### 4.2 Mode B: Product-Wise Sale
- Standard POS checkout.
- Multi-item line entry: Product Variant, Quantity, Unit Selling Price, Line Discount.
- Live validation of available stock at the active location.
- Server-side calculation of Gross, Discount, Tax, Net Total.
- **Inventory & Costing**:
  - Deducts stock immediately at the transacting location using database consistency.
  - Captures an immutable `unitCostSnapshot` based on the product variant's current weighted-average cost at transaction time.
  - COGS = `Sum(quantity * unitCostSnapshot)`.
  - Confirmed Gross Profit = `Net Sales - COGS`.

---

## 5. Sales Returns & Corrections
- Controlled partial or full sales returns linked to the original sale number.
- Quantity returned cannot exceed eligible unreturned quantity.
- Distinguishes restockable items (returned to inventory at original cost snapshot) from damaged items (written off to damage loss).
- Adjusts customer balance or issues cash/UPI refund.
- No hard deletions of sales. Reversals create explicit offset transactions with audit trails.

---

## 6. Purchase & Supplier Management
- Dealer invoice recording with multi-line items.
- Line fields: Product Variant, Quantity Received, Unit Purchase Price, Line Discounts.
- Header fields: Supplier, Invoice Number, Purchase Date, Receiving Location, Additional Landed Costs, Amount Paid, Payment Method.
- When posted:
  - Stock increases at receiving location.
  - Weighted-average cost of each product variant is recalculated.
  - Supplier payable balance increases by `Total Purchase Amount - Amount Paid`.
  - Purchase cost is **capitalized into inventory asset**, NOT treated as an immediate P&L expense.

---

## 7. Inventory Costing: Weighted Average Cost (WAC)
Formula for each product variant upon receipt of new stock:
$$\text{New WAC} = \frac{(\text{Current Total Stock} \times \text{Current WAC}) + (\text{Received Quantity} \times \text{Net Unit Purchase Cost})}{\text{Current Total Stock} + \text{Received Quantity}}$$

Historical sales retain their captured snapshot cost. Subsequent purchase cost fluctuations do not retroactively modify past reported sales profit.

---

## 8. Financial Accuracy & Precision
- Monetary amounts are handled with fixed precision (2 decimal places) or integer minor units to eliminate floating-point arithmetic errors.
- Double-entry consistency: every cash/bank inflow has an offsetting reduction in receivable or increase in revenue; every expense has an offsetting reduction in asset/cash.
- Segregation between Cash Flow (Cash In - Cash Out) and Accrual Profit (Net Sales - COGS - Period Expenses).
