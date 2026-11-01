# Core Business & Accounting Rules

## 1. Accounting Equation & Profit Calculations

### 1.1 Net Sales
$$\text{Net Sales} = \text{Gross Sales} - \text{Discounts} - \text{Sales Returns}$$
- **Gross Sales**: Sum of the full selling price across all completed sales (both Quick Sales and Product-Wise Sales).
- **Discounts**: Total customer discounts applied at line level or invoice level.
- **Sales Returns**: Total value of returned goods refunded or credited back to customers.

### 1.2 Cost of Goods Sold (COGS)
$$\text{COGS} = \sum (\text{Quantity Sold} \times \text{Unit Cost Snapshot}) - \sum (\text{Restocked Returned Quantity} \times \text{Original Cost Snapshot})$$
- COGS represents the real inventory cost of items sold during the reporting period.
- **Critical Policy**: Purchases of unsold inventory remain an **Asset on the Balance Sheet** and are **NOT** expensed into P&L until sold.
- Non-restockable (damaged) returns are transferred to a Damage & Loss expense account, rather than reducing COGS.

### 1.3 Gross Profit
$$\text{Gross Profit} = \text{Net Sales} - \text{COGS}$$
- Represents the margin earned on merchandise before operating overheads.

### 1.4 Net Profit
$$\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses}$$
- Operating expenses include rent, staff salaries, electricity, transport, packaging, shop supplies, and marketing.
- Capital expenditures (e.g. store fixtures, new sewing machines) are excluded from immediate expense.

---

## 2. Quick Sale vs. Product-Wise Sale Accounting

### 2.1 Mode A: Quick Sale
1. **Immediate Execution**: Records total amount, payment method (Cash, UPI, etc.), customer (optional), and staff member.
2. **Accounting Integrity**:
   - Cash/Receivable is recognized immediately.
   - Net sales revenue increases.
   - **No product cost or quantity is invented or assumed**.
   - `totalCogs` is recorded as `0.00` and `isReconciled` is set to `false`.
3. **Provisional Profit Warning**:
   - In financial reports and dashboards, gross and net profit figures that include unreconciled Quick Sales must display a **PROVISIONAL / UNCONFIRMED** badge.
   - The system displays:
     - Confirmed Sales & Confirmed Gross Profit (from reconciled & product-wise transactions).
     - Provisional Revenue (from unreconciled Quick Sales).
     - Flagged count of pending Quick Sales awaiting reconciliation.

### 2.2 Quick Sale Reconciliation Workflow
1. The Admin reviews pending Quick Sales in the Reconciliation Queue.
2. Admin specifies the actual product items/variants and quantities sold.
3. System verifies stock availability at the sale's location.
4. System deducts stock, creates `StockMovement` records (type: `sale`), snapshots current weighted-average cost, computes COGS, updates the sale document, and marks `isReconciled = true`.
5. Net Sales revenue is **never double-counted**.

---

## 3. Inventory Costing: Weighted Average Cost (WAC)

### 3.1 Initial Stock / First Purchase
$$\text{WAC} = \text{Unit Purchase Cost}$$

### 3.2 Subsequent Purchase Receipt
$$\text{New WAC} = \frac{(\text{Existing Stock Qty} \times \text{Current WAC}) + (\text{Received Qty} \times \text{Net Purchase Unit Cost})}{\text{Existing Stock Qty} + \text{Received Qty}}$$
- Net Purchase Unit Cost includes unit price minus line discount plus allocated landed costs (freight, duties).
- Calculated independently per product variant.

### 3.3 Historical Immutability
- When a sale occurs, the product's current WAC is saved as an immutable `unitCostSnapshot` on the sale line item.
- Subsequent purchase invoices with higher or lower costs **never** alter the cost snapshot or profit of past closed sales.

---

## 4. Stock Movement & Transfer Rules

1. **Non-Negative Stock**: A product-wise sale cannot execute if requested quantity exceeds available stock at the active location.
2. **Conservation of Stock in Transfers**:
   - Inter-location transfers debit (decrease) source location stock and credit (increase) destination location stock by the exact same quantity.
   - Zero net change in overall business inventory quantity and valuation.
   - Source location must have sufficient stock on hand before transfer initiates.
3. **Restocking on Return**:
   - Customer returns marked `isRestocked = true` increase quantity on hand at the receiving location and restore original cost valuation.
   - Customer returns marked `isRestocked = false` (damaged) do not increase salable inventory and are expensed to damaged inventory loss.

---

## 5. Payables & Receivables Integrity

### 5.1 Customer Receivables (AR)
$$\text{Customer Balance} = \sum \text{Credit Sales} - \sum \text{Customer Collections} - \sum \text{Returned Credit Adjustments}$$
- Customer balances are derived strictly from ledger transactions; manual balance overwrites are prohibited.

### 5.2 Supplier Payables (AP)
$$\text{Supplier Balance} = \sum \text{Posted Purchases} - \sum \text{Payments to Supplier} - \sum \text{Purchase Return Credits}$$
- Derived strictly from posted dealer invoices and recorded payments.

---

## 6. Access Control & Non-Repudiation

1. **Staff Isolation**: Staff members can only query, list, or submit data for locations explicitly assigned to their account.
2. **Cost & Margin Concealment**: Staff APIs redact `unitCostSnapshot`, `cogsTotal`, `currentWeightedAverageCost`, and profit reports.
3. **No Hard Deletions**: Completed financial records (Sales, Purchases, Payments, Expenses) cannot be deleted with HTTP DELETE. Voids require an administrative reason and generate an offsetting audit record.
