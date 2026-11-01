import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models/User';
import { Location } from '../src/models/Location';
import { Product } from '../src/models/Product';
import { Inventory } from '../src/models/Inventory';
import { Sale } from '../src/models/Sale';
import { Expense } from '../src/models/Expense';
import { Purchase } from '../src/models/Purchase';
import { SalesReturn } from '../src/models/SalesReturn';
import { Supplier } from '../src/models/Supplier';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 6 Tests: Accounting, Profit & Loss, Valuation & Security', () => {
  let adminToken: string;
  let staffToken: string;
  let adminUserId: any;
  let locationAId: string;
  let locationBId: string;
  let productId: string;
  let supplierId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Clean test data
    await User.deleteMany({ email: { $in: ['admin_p6@test.com', 'staff_p6@test.com'] } });
    await Location.deleteMany({ code: { $in: ['LOC-P6A', 'LOC-P6B'] } });
    await Product.deleteMany({ sku: 'P6-SILK-SAREE' });
    await Supplier.deleteMany({ name: 'P6 Supplier' });
    await Sale.deleteMany({ saleNumber: { $regex: '^SALE-P6' } });
    await Purchase.deleteMany({ invoiceNumber: { $regex: '^INV-P6' } });
    await SalesReturn.deleteMany({ returnNumber: { $regex: '^RET-P6' } });
    await Expense.deleteMany({ description: { $regex: '^(Shop Electricity|Carry Bags)' } });

    // 1. Setup Locations
    const locA = await Location.create({
      name: 'P6 Flagship Boutique',
      code: 'LOC-P6A',
      isActive: true
    });
    locationAId = locA._id.toString();

    const locB = await Location.create({
      name: 'P6 Exhibition Stall',
      code: 'LOC-P6B',
      isActive: true
    });
    locationBId = locB._id.toString();

    // 2. Setup Admin and Staff
    const pass = await bcrypt.hash('TestPass123!', 10);

    const admin = await User.create({
      name: 'Admin P6',
      email: 'admin_p6@test.com',
      passwordHash: pass,
      role: 'admin',
      assignedLocations: [locA._id, locB._id],
      isActive: true
    });
    adminUserId = admin._id;

    await User.create({
      name: 'Staff P6',
      email: 'staff_p6@test.com',
      passwordHash: pass,
      role: 'staff',
      assignedLocations: [locA._id],
      isActive: true
    });

    // 3. Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_p6@test.com', password: 'TestPass123!' });
    adminToken = adminLogin.body.token;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff_p6@test.com', password: 'TestPass123!' });
    staffToken = staffLogin.body.token;

    // 4. Setup Supplier
    const supp = await Supplier.create({
      name: 'P6 Supplier',
      contactPerson: 'Ramesh',
      phone: '9988776655',
      outstandingPayable: 0,
      isActive: true
    });
    supplierId = supp._id.toString();

    // 5. Setup Product with WAC
    const prod = await Product.create({
      sku: 'P6-SILK-SAREE',
      name: 'Kanjivaram Silk Saree',
      category: 'Sarees',
      defaultPrice: 2000,
      currentWeightedAverageCost: 1000,
      variants: [
        {
          variantId: 'VAR-P6-RED',
          size: 'Free Size',
          colour: 'Crimson Red',
          defaultPrice: 2000,
          currentCost: 1000,
          isActive: true
        }
      ]
    });
    productId = prod._id.toString();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('TEST-02: Role-Based Access: Floor staff is rejected with 403 when trying to access profit reports', async () => {
    // Attempt dashboard
    const dashRes = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(dashRes.status).toBe(403);
    expect(dashRes.body.success).toBe(false);

    // Attempt P&L
    const pnlRes = await request(app)
      .get('/api/reports/profit-loss')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(pnlRes.status).toBe(403);
    expect(pnlRes.body.success).toBe(false);

    // Attempt inventory valuation
    const valRes = await request(app)
      .get('/api/reports/valuation')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(valRes.status).toBe(403);
    expect(valRes.body.success).toBe(false);
  });

  it('TEST-16: Profit Calculations: Net Sales, Returns, COGS, and Expenses correctly compute Net Profit', async () => {
    // Clean old records for clean calculation in this test
    await Sale.deleteMany({ locationId: locationAId });
    await Expense.deleteMany({ locationId: locationAId });
    await SalesReturn.deleteMany({ locationId: locationAId });

    // Sale 1: Mode B, Gross 2000, Discount 200, Net 1800, Cost 1000
    await Sale.create({
      saleNumber: 'SALE-P6-001',
      locationId: locationAId,
      saleMode: 'product_wise',
      saleDate: new Date(),
      items: [
        {
          productId,
          variantId: 'VAR-P6-RED',
          productName: 'Kanjivaram Silk Saree',
          quantity: 1,
          unitPrice: 2000,
          lineDiscount: 200,
          lineTotal: 1800,
          unitCostSnapshot: 1000,
          cogsTotal: 1000
        }
      ],
      grossAmount: 2000,
      discountAmount: 200,
      netAmount: 1800,
      totalCogs: 1000,
      amountReceived: 1800,
      paymentMethod: 'upi',
      paymentStatus: 'paid',
      isReconciled: true,
      createdBy: adminUserId
    });

    // Sale 2: Mode B, Gross 2000, Discount 0, Net 2000, Cost 1000
    const sale2 = await Sale.create({
      saleNumber: 'SALE-P6-002',
      locationId: locationAId,
      saleMode: 'product_wise',
      saleDate: new Date(),
      items: [
        {
          productId,
          variantId: 'VAR-P6-RED',
          productName: 'Kanjivaram Silk Saree',
          quantity: 1,
          unitPrice: 2000,
          lineDiscount: 0,
          lineTotal: 2000,
          unitCostSnapshot: 1000,
          cogsTotal: 1000
        }
      ],
      grossAmount: 2000,
      discountAmount: 0,
      netAmount: 2000,
      totalCogs: 1000,
      amountReceived: 2000,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      isReconciled: true,
      createdBy: adminUserId
    });

    // Return: 1 item returned from Sale 2 with refund 2000 and restocked (COGS reversed 1000)
    await SalesReturn.create({
      returnNumber: 'RET-P6-001',
      saleId: sale2._id,
      locationId: locationAId,
      returnDate: new Date(),
      items: [
        {
          productId,
          variantId: 'VAR-P6-RED',
          quantityReturned: 1,
          unitPrice: 2000,
          refundAmount: 2000,
          unitCostSnapshot: 1000,
          isRestocked: true
        }
      ],
      totalRefundAmount: 2000,
      refundMethod: 'cash',
      reason: 'Wrong size selected',
      createdBy: adminUserId
    });

    // Operating Expense: ₹300 for Shop Utility
    await Expense.create({
      locationId: locationAId,
      category: 'Electricity',
      amount: 300,
      expenseDate: new Date(),
      paymentMethod: 'cash',
      description: 'Shop Electricity',
      createdBy: adminUserId
    });

    // Fetch Profit and Loss report
    const res = await request(app)
      .get(`/api/reports/profit-loss?locationId=${locationAId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const pnl = res.body.data;

    // Gross Sales = 2000 + 2000 = 4000
    expect(pnl.sales.grossSales).toBe(4000);
    // Total Discounts = 200
    expect(pnl.sales.totalDiscounts).toBe(200);
    // Returns = 2000
    expect(pnl.sales.totalSalesReturns).toBe(2000);
    // Net Sales = 4000 - 200 - 2000 = 1800
    expect(pnl.sales.netSales).toBe(1800);

    // Confirmed COGS = 1000 + 1000 = 2000
    // COGS reversal from restocked return = 1000
    // Net COGS = 1000
    expect(pnl.cogs.confirmedCogs).toBe(2000);
    expect(pnl.cogs.returnCogsReversal).toBe(1000);
    expect(pnl.cogs.netCogs).toBe(1000);

    // Confirmed Gross Profit = Net Sales (1800) - Net COGS (1000) = 800
    expect(pnl.profit.confirmedGrossProfit).toBe(800);

    // Operating Expenses = 300
    expect(pnl.operatingExpenses.total).toBe(300);

    // Confirmed Net Profit = Gross Profit (800) - Expenses (300) = 500
    expect(pnl.profit.confirmedNetProfit).toBe(500);
    expect(pnl.profit.isProvisional).toBe(false);
  });

  it('TEST-17: Unsold Inventory Accounting: Purchases are capitalized and NOT expensed into P&L immediately', async () => {
    // Clean records for location B
    await Sale.deleteMany({ locationId: locationBId });
    await Expense.deleteMany({ locationId: locationBId });
    await Purchase.deleteMany({ receivingLocationId: locationBId });
    await Inventory.deleteMany({ locationId: locationBId });

    // Step A: Purchase 10 units at ₹500 each = ₹5,000 total invoice
    await Purchase.create({
      invoiceNumber: 'INV-P6-001',
      supplierId,
      receivingLocationId: locationBId,
      purchaseDate: new Date(),
      status: 'posted',
      items: [
        {
          productId,
          variantId: 'VAR-P6-RED',
          quantity: 10,
          unitCost: 500,
          lineDiscount: 0,
          lineTotal: 5000
        }
      ],
      additionalCosts: 0,
      totalAmount: 5000,
      amountPaid: 0,
      outstandingPayable: 5000,
      paymentStatus: 'unpaid',
      createdBy: adminUserId
    });

    // Put 10 units in Inventory at Location B
    await Inventory.create({
      productId,
      variantId: 'VAR-P6-RED',
      locationId: locationBId,
      quantityOnHand: 10,
      lastCost: 500
    });

    // Step B: Sell only 3 units at ₹1000 each (Net Sales = 3,000; COGS = 3 x 500 = 1,500)
    await Sale.create({
      saleNumber: 'SALE-P6-CAP-001',
      locationId: locationBId,
      saleMode: 'product_wise',
      saleDate: new Date(),
      items: [
        {
          productId,
          variantId: 'VAR-P6-RED',
          productName: 'Kanjivaram Silk Saree',
          quantity: 3,
          unitPrice: 1000,
          lineDiscount: 0,
          lineTotal: 3000,
          unitCostSnapshot: 500,
          cogsTotal: 1500
        }
      ],
      grossAmount: 3000,
      discountAmount: 0,
      netAmount: 3000,
      totalCogs: 1500,
      amountReceived: 3000,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      isReconciled: true,
      createdBy: adminUserId
    });

    // Operating Expense = ₹200
    await Expense.create({
      locationId: locationBId,
      category: 'Packaging',
      amount: 200,
      expenseDate: new Date(),
      paymentMethod: 'cash',
      description: 'Carry Bags',
      createdBy: adminUserId
    });

    // Check P&L
    const res = await request(app)
      .get(`/api/reports/profit-loss?locationId=${locationBId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const pnl = res.body.data;

    // Gross Sales = 3000, Net Sales = 3000
    expect(pnl.sales.netSales).toBe(3000);

    // COGS must be 1,500 (ONLY for the 3 sold items)
    expect(pnl.cogs.netCogs).toBe(1500);

    // Gross Profit = 3,000 - 1,500 = 1,500
    expect(pnl.profit.confirmedGrossProfit).toBe(1500);

    // Operating Expenses = 200
    expect(pnl.operatingExpenses.total).toBe(200);

    // Net Profit = 1,500 - 200 = 1,300
    // If unsold inventory had been expensed, profit would be 3000 - 5000 - 200 = -2200 (WRONG!).
    expect(pnl.profit.confirmedNetProfit).toBe(1300);

    // Capitalized purchase amount shown as asset note, not in P&L deduction
    expect(pnl.purchasesCapitalized.totalAmount).toBe(5000);
  });

  it('TEST-18: Date and Location Filters: Reports properly isolate locations and date ranges', async () => {
    // Query Location A
    const resA = await request(app)
      .get(`/api/reports/profit-loss?locationId=${locationAId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resA.status).toBe(200);
    expect(resA.body.data.locationId).toBe(locationAId);

    // Query Location B
    const resB = await request(app)
      .get(`/api/reports/profit-loss?locationId=${locationBId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resB.status).toBe(200);
    expect(resB.body.data.locationId).toBe(locationBId);

    // Location A net sales should be 1800, Location B net sales should be 3000
    expect(resA.body.data.sales.netSales).toBe(1800);
    expect(resB.body.data.sales.netSales).toBe(3000);

    // Test Date Filter in the distant future (expect 0 sales)
    const futureRes = await request(app)
      .get(`/api/reports/profit-loss?locationId=${locationAId}&startDate=2035-01-01&endDate=2035-01-31`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(futureRes.status).toBe(200);
    expect(futureRes.body.data.sales.netSales).toBe(0);
    expect(futureRes.body.data.profit.confirmedNetProfit).toBe(0);
  });

  it('TEST-19: Deactivated Location Historical Data: Reports still include historical figures after location deactivation', async () => {
    // Deactivate Location B via status toggle endpoint
    const patchRes = await request(app)
      .put(`/api/locations/${locationBId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.location.isActive).toBe(false);

    // Query P&L for deactivated Location B
    const resB = await request(app)
      .get(`/api/reports/profit-loss?locationId=${locationBId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resB.status).toBe(200);
    // Historical sales and net profit must remain intact!
    expect(resB.body.data.sales.netSales).toBe(3000);
    expect(resB.body.data.profit.confirmedNetProfit).toBe(1300);

    // Overall dashboard overview must also include all locations including deactivated ones
    const dashRes = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashRes.status).toBe(200);
    const locChart = dashRes.body.data.charts.salesByLocation;
    const deactivatedLocInChart = locChart.find((l: any) => l.name === 'P6 Exhibition Stall');
    expect(deactivatedLocInChart).toBeDefined();
    expect(deactivatedLocInChart.netSales).toBe(3000);
  });

  it('Provisional Warning: An unreconciled Quick Sale sets isProvisional=true with explicit warning message', async () => {
    // Insert an unreconciled quick sale
    await Sale.create({
      saleNumber: 'SALE-P6-QS-UNREC',
      locationId: locationAId,
      saleMode: 'quick',
      saleDate: new Date(),
      items: [],
      grossAmount: 1500,
      discountAmount: 0,
      netAmount: 1500,
      amountReceived: 1500,
      paymentMethod: 'upi',
      paymentStatus: 'paid',
      isReconciled: false,
      createdBy: adminUserId
    });

    const res = await request(app)
      .get(`/api/reports/profit-loss?locationId=${locationAId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const pnl = res.body.data;
    expect(pnl.profit.isProvisional).toBe(true);
    expect(pnl.profit.unresolvedQuickSaleCount).toBeGreaterThanOrEqual(1);
    expect(pnl.profit.unresolvedQuickSaleRevenue).toBeGreaterThanOrEqual(1500);
    expect(pnl.profit.provisionalWarning).toContain('unresolved Quick Sales');
  });
});
