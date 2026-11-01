# Automated Testing Strategy & Acceptance Test Matrix

## 1. Testing Framework Architecture
- **Backend API & Business Logic**: Vitest + Supertest, running against an isolated test MongoDB database.
- **Frontend Components & Hooks**: Vitest + React Testing Library + jsdom.
- **Fixtures**: Fully reproducible multi-location, multi-product, multi-user seed datasets.

---

## 2. Mandatory Test Matrix (Prompt Section 23)

| Test # | Test Description | Target Module | Pass Criteria |
|---|---|---|---|
| **TEST-01** | Staff user cannot access an unassigned location | `middleware/locationGuard.ts` | Returns `403 Forbidden` when staff attempts to query or post to an unassigned location ID. |
| **TEST-02** | Staff user cannot access admin-only profit reports | `routes/reportRoutes.ts` | Returns `403 Forbidden` on `/api/reports/*` when requested with a staff JWT. |
| **TEST-03** | Quick Sale is recorded without inventing product costs | `services/salesService.ts` | Creates sale with `totalCogs: 0` and empty product line items. |
| **TEST-04** | Unresolved Quick Sale is marked provisional | `services/salesService.ts` | Sale has `isReconciled: false`, dashboard flags provisional status. |
| **TEST-05** | Product-wise sales calculate totals correctly | `services/salesService.ts` | Server accurately sums line totals: `qty * unitPrice - lineDiscount` minus invoice discount. |
| **TEST-06** | Product-wise sales reduce stock at the correct location | `services/inventoryService.ts` | Decrements `quantityOnHand` exclusively at the sale's `locationId`. |
| **TEST-07** | A sale cannot oversell available stock | `services/salesService.ts` | Rejects with `400 Bad Request` if `quantity > quantityOnHand`. |
| **TEST-08** | Purchase increases stock at receiving location when posted | `services/purchaseService.ts` | On post, inventory increases at `receivingLocationId` and stock movement is recorded. |
| **TEST-09** | Stock transfer maintains conservation of total stock | `services/stockTransferService.ts` | Source decreases by X, destination increases by X; total system stock change = 0. |
| **TEST-10** | Weighted-average cost updates correctly after purchases | `services/inventoryCostingService.ts` | Applies WAC formula accurately including line discounts and additional landed costs. |
| **TEST-11** | Historical sale cost does not change after later purchases | `services/inventoryCostingService.ts` | Past sale's `unitCostSnapshot` remains immutable after subsequent higher/lower cost purchase. |
| **TEST-12** | Return cannot exceed eligible original sold quantity | `services/salesReturnService.ts` | Rejects return if requested return qty > remaining unreturned qty on sale. |
| **TEST-13** | Duplicate submissions do not duplicate payments or stock deductions | `middleware/idempotency.ts` | Idempotency key or transaction locking prevents double processing on rapid duplicate requests. |
| **TEST-14** | Customer outstanding balances reconcile with transactions | `services/customerService.ts` | Statement balance equals Sum(Credit Sales) - Sum(Collections) - Sum(Refunds). |
| **TEST-15** | Supplier outstanding balances reconcile with transactions | `services/supplierService.ts` | Statement balance equals Sum(Purchases) - Sum(Payments) - Sum(Purchase Returns). |
| **TEST-16** | Discounts, sales returns, COGS, and expenses affect profit correctly | `services/accountingReportService.ts` | Net Profit matches: (Gross Sales - Discounts - Returns) - (COGS - Return COGS) - Expenses. |
| **TEST-17** | Unsold inventory is not expensed as if all purchased stock were sold | `services/accountingReportService.ts` | Buying \$10,000 in inventory does not reduce period profit by \$10,000; only sold goods enter COGS. |
| **TEST-18** | Reports respect date ranges and location filters | `services/accountingReportService.ts` | Filtering by `today` or specific location excludes out-of-scope transactions. |
| **TEST-19** | Deactivated locations remain visible in historical reports | `services/locationService.ts` | Deactivating a location preserves historical sales, inventory history, and profit records. |
| **TEST-20** | Unauthorized users cannot modify posted financial records | `controllers/salesController.ts` | Staff cannot void, edit, or adjust posted sales or purchases. |

---

## 3. Running the Test Suite
```bash
# Run server test suite
cd server
npm test

# Run test suite with coverage
npm run test:coverage
```
