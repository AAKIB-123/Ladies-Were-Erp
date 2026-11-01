import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models/User';
import { Location } from '../src/models/Location';
import { Product } from '../src/models/Product';
import { Inventory } from '../src/models/Inventory';
import { Sale } from '../src/models/Sale';
import { StockMovement } from '../src/models/StockMovement';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 3 Tests: Quick Sale, Product-Wise Sale & Reconciliation', () => {
  let adminToken: string;
  let staffToken: string;
  let locationId: string;
  let productId: string;
  let quickSaleId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Clean test data
    await User.deleteMany({ email: { $in: ['admin_p3@test.com', 'staff_p3@test.com'] } });
    await Product.deleteMany({ sku: { $in: ['TEST-P3-KURTI'] } });
    await Location.deleteMany({ code: 'TEST-P3-LOC' });
    await Sale.deleteMany({ saleNumber: { $regex: '^SAL-' } });

    // 1. Setup Location
    const loc = await Location.create({
      name: 'P3 Boutique Shop',
      code: 'TEST-P3-LOC',
      isActive: true
    });
    locationId = loc._id.toString();

    // 2. Setup Admin
    const adminPass = await bcrypt.hash('AdminP3Pass123!', 10);
    await User.create({
      name: 'Admin P3',
      email: 'admin_p3@test.com',
      passwordHash: adminPass,
      role: 'admin',
      assignedLocations: [loc._id],
      isActive: true
    });

    // 3. Setup Staff
    const staffPass = await bcrypt.hash('StaffP3Pass123!', 10);
    await User.create({
      name: 'Staff P3',
      email: 'staff_p3@test.com',
      passwordHash: staffPass,
      role: 'staff',
      assignedLocations: [loc._id],
      isActive: true
    });

    // 4. Setup Product with 10 units in Inventory
    const product = await Product.create({
      sku: 'TEST-P3-KURTI',
      name: 'Chanderi Cotton Kurti',
      category: 'Kurtis',
      unit: 'pcs',
      defaultPrice: 1200,
      currentWeightedAverageCost: 650,
      variants: [
        {
          variantId: 'VAR-L-BLUE',
          size: 'L',
          colour: 'Royal Blue',
          skuSuffix: '-L-BLU',
          defaultPrice: 1200,
          currentCost: 650,
          isActive: true
        }
      ]
    });
    productId = product._id.toString();

    // Seed stock of 10 units at locationId
    await Inventory.create({
      productId: product._id,
      variantId: 'VAR-L-BLUE',
      locationId: loc._id,
      quantityOnHand: 10
    });

    // Obtain JWT tokens
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_p3@test.com', password: 'AdminP3Pass123!' });
    adminToken = adminRes.body.token;

    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff_p3@test.com', password: 'StaffP3Pass123!' });
    staffToken = staffRes.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['admin_p3@test.com', 'staff_p3@test.com'] } });
    await Product.deleteMany({ sku: 'TEST-P3-KURTI' });
    await Location.deleteMany({ code: 'TEST-P3-LOC' });
    await Inventory.deleteMany({ locationId });
    await StockMovement.deleteMany({ locationId });
    await Sale.deleteMany({ locationId });
    await disconnectDatabase();
  });

  it('TEST-03: Quick Sale is recorded without inventing product costs', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        saleMode: 'quick',
        locationId,
        totalAmount: 3000,
        discount: 200,
        paymentMethod: 'upi',
        amountReceived: 2800,
        customerName: 'Rush Customer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.sale.grossAmount).toBe(3000);
    expect(res.body.sale.discountAmount).toBe(200);
    expect(res.body.sale.netAmount).toBe(2800);
    expect(res.body.sale.totalCogs).toBe(0); // TEST-03: zero cost invented
    expect(res.body.sale.items.length).toBe(0); // no fake items

    quickSaleId = res.body.sale._id;
  });

  it('TEST-04: An unresolved Quick Sale is marked provisional', async () => {
    const res = await request(app)
      .get(`/api/sales/${quickSaleId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sale.isReconciled).toBe(false); // TEST-04: marked provisional
  });

  it('TEST-05 & TEST-06: Product-wise sales calculate totals correctly and reduce stock at correct location', async () => {
    // 1. Initial stock is 10
    const initialInv = await Inventory.findOne({ productId, variantId: 'VAR-L-BLUE', locationId });
    expect(initialInv?.quantityOnHand).toBe(10);

    // 2. Sell 3 units
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        saleMode: 'product_wise',
        locationId,
        items: [
          {
            productId,
            variantId: 'VAR-L-BLUE',
            quantity: 3,
            unitPrice: 1200,
            lineDiscount: 100
          }
        ],
        overallDiscount: 200,
        paymentMethod: 'cash',
        amountReceived: 3300 // (3 * 1200 - 100) - 200 = 3300
      });

    expect(res.status).toBe(201);
    expect(res.body.sale.grossAmount).toBe(3500); // 3600 - 100 = 3500
    expect(res.body.sale.discountAmount).toBe(200);
    expect(res.body.sale.netAmount).toBe(3300); // TEST-05: server verified total
    expect(res.body.sale.isReconciled).toBe(true);

    // 3. Verify stock reduced by exactly 3 at the specific location: TEST-06
    const updatedInv = await Inventory.findOne({ productId, variantId: 'VAR-L-BLUE', locationId });
    expect(updatedInv?.quantityOnHand).toBe(7);

    // 4. Verify stock movement was recorded
    const movement = await StockMovement.findOne({
      productId,
      referenceId: res.body.sale._id
    });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(-3);
  });

  it('TEST-07: A sale cannot oversell available stock', async () => {
    // Current stock is 7. Attempting to sell 15 units must be rejected.
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        saleMode: 'product_wise',
        locationId,
        items: [
          {
            productId,
            variantId: 'VAR-L-BLUE',
            quantity: 15,
            unitPrice: 1200
          }
        ],
        paymentMethod: 'cash',
        amountReceived: 18000
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient stock');

    // Verify stock is still 7
    const inv = await Inventory.findOne({ productId, variantId: 'VAR-L-BLUE', locationId });
    expect(inv?.quantityOnHand).toBe(7);
  });

  it('TEST-13: Duplicate submissions (idempotency) do not duplicate payments or stock deductions', async () => {
    const idempotencyKey = 'UNIQUE-POS-KEY-999';

    // First submission
    const res1 = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        saleMode: 'product_wise',
        locationId,
        items: [
          {
            productId,
            variantId: 'VAR-L-BLUE',
            quantity: 1,
            unitPrice: 1200
          }
        ],
        paymentMethod: 'cash',
        amountReceived: 1200,
        idempotencyKey
      });

    expect(res1.status).toBe(201);
    const saleId1 = res1.body.sale._id;

    // Duplicate submission with same idempotency key
    const res2 = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        saleMode: 'product_wise',
        locationId,
        items: [
          {
            productId,
            variantId: 'VAR-L-BLUE',
            quantity: 1,
            unitPrice: 1200
          }
        ],
        paymentMethod: 'cash',
        amountReceived: 1200,
        idempotencyKey
      });

    // Must return original sale without deducting stock again
    expect(res2.body.sale._id).toBe(saleId1);

    // Stock should only have been deducted once (7 - 1 = 6)
    const inv = await Inventory.findOne({ productId, variantId: 'VAR-L-BLUE', locationId });
    expect(inv?.quantityOnHand).toBe(6);
  });

  it('should allow admin to reconcile a Quick Sale into products and deduct stock', async () => {
    // Current stock is 6. Reconcile 2 units of VAR-L-BLUE against quickSaleId.
    const res = await request(app)
      .post(`/api/sales/${quickSaleId}/reconcile`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            productId,
            variantId: 'VAR-L-BLUE',
            quantity: 2
          }
        ],
        notes: 'Owner reconciled 2 kurtis from shop floor'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sale.isReconciled).toBe(true);
    expect(res.body.sale.totalCogs).toBe(1300); // 2 * 650 = 1300
    expect(res.body.sale.netAmount).toBe(2800); // Revenue not altered!

    // Stock deducted from 6 to 4
    const inv = await Inventory.findOne({ productId, variantId: 'VAR-L-BLUE', locationId });
    expect(inv?.quantityOnHand).toBe(4);
  });
});
