import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models/User';
import { Location } from '../src/models/Location';
import { Product } from '../src/models/Product';
import { Inventory } from '../src/models/Inventory';
import { Customer } from '../src/models/Customer';
import { Supplier } from '../src/models/Supplier';
import { Sale } from '../src/models/Sale';
import { SalesReturn } from '../src/models/SalesReturn';
import { Expense } from '../src/models/Expense';
import { Payment } from '../src/models/Payment';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 5 Tests: Expenses, Receivables, Payables & Returns', () => {
  let adminToken: string;
  let locationId: string;
  let customerId: string;
  let supplierId: string;
  let productId: string;
  let saleId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Clean test data
    await User.deleteMany({ email: 'admin_p5@test.com' });
    await Location.deleteMany({ code: 'P5-LOC' });
    await Customer.deleteMany({ name: 'P5 Customer' });
    await Supplier.deleteMany({ name: 'P5 Supplier' });
    await Product.deleteMany({ sku: 'P5-ANARKALI' });

    // 1. Setup Location
    const loc = await Location.create({
      name: 'P5 Boutique',
      code: 'P5-LOC',
      isActive: true
    });
    locationId = loc._id.toString();

    // 2. Setup Admin
    const pass = await bcrypt.hash('AdminP5Pass123!', 10);
    await User.create({
      name: 'Admin P5',
      email: 'admin_p5@test.com',
      passwordHash: pass,
      role: 'admin',
      assignedLocations: [loc._id],
      isActive: true
    });

    // 3. Setup Customer
    const cust = await Customer.create({
      name: 'P5 Customer',
      phone: '9876540000',
      outstandingBalance: 0,
      isActive: true
    });
    customerId = cust._id.toString();

    // 4. Setup Supplier
    const supp = await Supplier.create({
      name: 'P5 Supplier',
      contactPerson: 'Deepak',
      phone: '9825000000',
      outstandingPayable: 0,
      isActive: true
    });
    supplierId = supp._id.toString();

    // 5. Setup Product & Inventory
    const prod = await Product.create({
      sku: 'P5-ANARKALI',
      name: 'Georgette Anarkali Gown',
      category: 'Dresses',
      defaultPrice: 3000,
      currentWeightedAverageCost: 1500,
      variants: [
        {
          variantId: 'VAR-M-PINK',
          size: 'M',
          colour: 'Blush Pink',
          defaultPrice: 3000,
          currentCost: 1500,
          isActive: true
        }
      ]
    });
    productId = prod._id.toString();

    await Inventory.create({
      productId: prod._id,
      variantId: 'VAR-M-PINK',
      locationId: loc._id,
      quantityOnHand: 10
    });

    // Obtain Admin JWT
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_p5@test.com', password: 'AdminP5Pass123!' });
    adminToken = adminRes.body.token;

    // Create a Credit Sale of 4 items to customer (Sale amount: 4 * 3000 = 12000, 0 received)
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        saleMode: 'product_wise',
        locationId,
        customerId,
        items: [
          {
            productId,
            variantId: 'VAR-M-PINK',
            quantity: 4,
            unitPrice: 3000
          }
        ],
        paymentMethod: 'credit',
        amountReceived: 0
      });

    saleId = saleRes.body.sale._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'admin_p5@test.com' });
    await Location.deleteMany({ code: 'P5-LOC' });
    await Customer.deleteMany({ name: 'P5 Customer' });
    await Supplier.deleteMany({ name: 'P5 Supplier' });
    await Product.deleteMany({ sku: 'P5-ANARKALI' });
    await Inventory.deleteMany({ locationId });
    await Sale.deleteMany({ locationId });
    await SalesReturn.deleteMany({ locationId });
    await Expense.deleteMany({ locationId });
    await Payment.deleteMany({ locationId });
    await disconnectDatabase();
  });

  it('TEST-14: Customer outstanding balance reconciles after credit sale and collection', async () => {
    // 1. Credit sale was 12000 with 0 paid, customer balance must be 12000
    let cust = await Customer.findById(customerId);
    expect(cust?.outstandingBalance).toBe(12000);

    // 2. Record a collection payment of 5000 against customer
    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentType: 'customer_collection',
        partyType: 'customer',
        partyId: customerId,
        locationId,
        amount: 5000,
        paymentMethod: 'upi',
        referenceNumber: 'UPI-COLLECT-01'
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.payment.paymentType).toBe('customer_collection');

    // 3. Customer balance must now be 12000 - 5000 = 7000
    cust = await Customer.findById(customerId);
    expect(cust?.outstandingBalance).toBe(7000);
  });

  it('TEST-12: A return cannot exceed the eligible original sold quantity', async () => {
    // 4 items were sold on saleId. Attempting to return 5 items must fail.
    const failRes = await request(app)
      .post(`/api/sales/${saleId}/returns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            productId,
            variantId: 'VAR-M-PINK',
            quantityReturned: 5,
            isRestocked: true
          }
        ],
        refundMethod: 'cash',
        reason: 'Customer changed mind'
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.success).toBe(false);
    expect(failRes.body.message).toContain('exceeds eligible unreturned quantity');

    // Return 2 valid units
    const successRes = await request(app)
      .post(`/api/sales/${saleId}/returns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            productId,
            variantId: 'VAR-M-PINK',
            quantityReturned: 2,
            isRestocked: true
          }
        ],
        refundMethod: 'store_credit',
        reason: 'Size exchange credit'
      });

    expect(successRes.status).toBe(201);
    expect(successRes.body.salesReturn.totalRefundAmount).toBe(6000); // 2 * 3000 = 6000

    // Verify inventory restocked: original stock was 10, sold 4 -> 6, returned 2 -> 8
    const inv = await Inventory.findOne({ productId, variantId: 'VAR-M-PINK', locationId });
    expect(inv?.quantityOnHand).toBe(8);

    // Customer balance was 7000, refunded 6000 as store_credit -> now 1000
    const cust = await Customer.findById(customerId);
    expect(cust?.outstandingBalance).toBe(1000);

    // Attempting to return 3 more units should fail because only 2 remain eligible (4 - 2 = 2)
    const exceedSecondRes = await request(app)
      .post(`/api/sales/${saleId}/returns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            productId,
            variantId: 'VAR-M-PINK',
            quantityReturned: 3,
            isRestocked: true
          }
        ],
        refundMethod: 'cash',
        reason: 'Another return'
      });

    expect(exceedSecondRes.status).toBe(400);
    expect(exceedSecondRes.body.message).toContain('exceeds eligible unreturned quantity');
  });

  it('TEST-15: Supplier outstanding balances reconcile with transactions', async () => {
    // 1. Post a dealer purchase with 5000 payable balance
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceNumber: 'P5-INV-SUPP',
        supplierId,
        receivingLocationId: locationId,
        items: [
          {
            productId,
            variantId: 'VAR-M-PINK',
            quantity: 5,
            unitCost: 1500
          }
        ],
        amountPaid: 2500, // Total 7500, paid 2500 -> payable 5000
        paymentMethod: 'bank_transfer'
      });

    let supp = await Supplier.findById(supplierId);
    expect(supp?.outstandingPayable).toBe(5000);

    // 2. Pay 3500 to supplier
    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentType: 'supplier_payment',
        partyType: 'supplier',
        partyId: supplierId,
        amount: 3500,
        paymentMethod: 'bank_transfer',
        notes: 'Settlement check'
      });

    expect(payRes.status).toBe(201);

    // 3. Balance must reconcile to 5000 - 3500 = 1500
    supp = await Supplier.findById(supplierId);
    expect(supp?.outstandingPayable).toBe(1500);
  });

  it('should record expenses and forbid permanent deletion', async () => {
    // 1. Record expense
    const expRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'Electricity',
        amount: 2400,
        locationId,
        paymentMethod: 'upi',
        description: 'Monthly boutique electricity bill',
        receiptNumber: 'EB-OCT-2026'
      });

    expect(expRes.status).toBe(201);
    expect(expRes.body.expense.category).toBe('Electricity');
    const expenseId = expRes.body.expense._id;

    // 2. Void expense with reason (no hard delete)
    const voidRes = await request(app)
      .post(`/api/expenses/${expenseId}/void`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Incorrect reading entered' });

    expect(voidRes.status).toBe(200);
    expect(voidRes.body.expense.isVoided).toBe(true);

    // 3. Active listing excludes voided expense
    const listRes = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`);

    const ids = listRes.body.expenses.map((e: any) => e._id);
    expect(ids).not.toContain(expenseId);
  });
});
