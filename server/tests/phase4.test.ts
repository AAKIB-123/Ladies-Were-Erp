import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models/User';
import { Location } from '../src/models/Location';
import { Product } from '../src/models/Product';
import { Inventory } from '../src/models/Inventory';
import { Supplier } from '../src/models/Supplier';
import { Purchase } from '../src/models/Purchase';
import { StockTransfer } from '../src/models/StockTransfer';
import { Sale } from '../src/models/Sale';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 4 Tests: Purchases, Inventory, Costing (WAC) & Stock Transfers', () => {
  let adminToken: string;
  let loc1Id: string;
  let loc2Id: string;
  let supplierId: string;
  let productId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Clean test data
    await User.deleteMany({ email: 'admin_p4@test.com' });
    await Location.deleteMany({ code: { $in: ['P4-SHOP-1', 'P4-SHOP-2'] } });
    await Supplier.deleteMany({ name: 'P4 Silk Mill' });
    await Product.deleteMany({ sku: 'P4-LEHENGA' });
    await Purchase.deleteMany({ invoiceNumber: { $regex: '^P4-INV' } });
    await StockTransfer.deleteMany({ transferNumber: { $regex: '^TRF-' } });

    // 1. Setup 2 Locations
    const loc1 = await Location.create({
      name: 'Main Boutique',
      code: 'P4-SHOP-1',
      isActive: true
    });
    loc1Id = loc1._id.toString();

    const loc2 = await Location.create({
      name: 'Home Studio',
      code: 'P4-SHOP-2',
      isActive: true
    });
    loc2Id = loc2._id.toString();

    // 2. Setup Admin
    const pass = await bcrypt.hash('AdminP4Pass123!', 10);
    await User.create({
      name: 'Admin P4',
      email: 'admin_p4@test.com',
      passwordHash: pass,
      role: 'admin',
      assignedLocations: [loc1._id, loc2._id],
      isActive: true
    });

    // 3. Setup Supplier
    const supp = await Supplier.create({
      name: 'P4 Silk Mill',
      contactPerson: 'Karan',
      phone: '9898098980',
      isActive: true
    });
    supplierId = supp._id.toString();

    // 4. Setup Product with initial cost 1000
    const prod = await Product.create({
      sku: 'P4-LEHENGA',
      name: 'Bridal Velvet Lehenga',
      category: 'Lehengas',
      defaultPrice: 5000,
      currentWeightedAverageCost: 1000,
      variants: [
        {
          variantId: 'VAR-MAROON',
          colour: 'Maroon',
          size: 'Free Size',
          defaultPrice: 5000,
          currentCost: 1000,
          isActive: true
        }
      ]
    });
    productId = prod._id.toString();

    // Seed 10 units at loc1 with cost 1000
    await Inventory.create({
      productId: prod._id,
      variantId: 'VAR-MAROON',
      locationId: loc1._id,
      quantityOnHand: 10
    });

    // Obtain Admin JWT
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_p4@test.com', password: 'AdminP4Pass123!' });
    adminToken = adminRes.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'admin_p4@test.com' });
    await Location.deleteMany({ code: { $in: ['P4-SHOP-1', 'P4-SHOP-2'] } });
    await Supplier.deleteMany({ name: 'P4 Silk Mill' });
    await Product.deleteMany({ sku: 'P4-LEHENGA' });
    await Inventory.deleteMany({ locationId: { $in: [loc1Id, loc2Id] } });
    await Purchase.deleteMany({ invoiceNumber: { $regex: '^P4-INV' } });
    await StockTransfer.deleteMany({ transferNumber: { $regex: '^TRF-' } });
    await disconnectDatabase();
  });

  it('TEST-08: A purchase increases stock at the receiving location when posted', async () => {
    // Current stock at loc1 is 10. Purchase 10 more units at loc1.
    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceNumber: 'P4-INV-001',
        supplierId,
        receivingLocationId: loc1Id,
        items: [
          {
            productId,
            variantId: 'VAR-MAROON',
            quantity: 10,
            unitCost: 1600,
            lineDiscount: 0
          }
        ],
        additionalCosts: 0,
        amountPaid: 8000,
        paymentMethod: 'bank_transfer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.purchase.totalAmount).toBe(16000);
    expect(res.body.purchase.outstandingPayable).toBe(8000);

    // TEST-08: Verify inventory increased from 10 to 20 at loc1
    const inv = await Inventory.findOne({ productId, variantId: 'VAR-MAROON', locationId: loc1Id });
    expect(inv?.quantityOnHand).toBe(20);

    // Verify supplier payable increased by 8000
    const supp = await Supplier.findById(supplierId);
    expect(supp?.outstandingPayable).toBe(8000);
  });

  it('TEST-10: Weighted-average cost updates correctly after purchases', async () => {
    // Before: 10 units @ 1000
    // Purchased: 10 units @ 1600
    // Total stock: 20 units
    // Expected New WAC: (10 * 1000 + 10 * 1600) / 20 = (10000 + 16000) / 20 = 26000 / 20 = 1300
    const prod = await Product.findById(productId);
    expect(prod?.variants[0].currentCost).toBe(1300);
    expect(prod?.currentWeightedAverageCost).toBe(1300);
  });

  it('TEST-11: Historical sale cost does not change after later purchases', async () => {
    // 1. Record a sale now while WAC is 1300
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        saleMode: 'product_wise',
        locationId: loc1Id,
        items: [
          {
            productId,
            variantId: 'VAR-MAROON',
            quantity: 2,
            unitPrice: 5000
          }
        ],
        paymentMethod: 'cash',
        amountReceived: 10000
      });

    expect(saleRes.status).toBe(201);
    const saleId = saleRes.body.sale._id;
    const initialSaleSnapshot = saleRes.body.sale.items[0].unitCostSnapshot;
    expect(initialSaleSnapshot).toBe(1300); // Snapshot captured at sale time

    // 2. Now purchase new stock at a much higher price (e.g. 2500 each)
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceNumber: 'P4-INV-002',
        supplierId,
        receivingLocationId: loc1Id,
        items: [
          {
            productId,
            variantId: 'VAR-MAROON',
            quantity: 10,
            unitCost: 2500
          }
        ],
        amountPaid: 25000
      });

    // WAC has now increased
    const updatedProd = await Product.findById(productId);
    expect(updatedProd?.variants[0].currentCost).toBeGreaterThan(1300);

    // 3. TEST-11: Verify past sale's cost snapshot was NOT altered!
    const pastSale = await Sale.findById(saleId);
    expect(pastSale?.items[0].unitCostSnapshot).toBe(1300);
    expect(pastSale?.totalCogs).toBe(2600); // 2 * 1300 = 2600
  });

  it('TEST-09: A stock transfer maintains conservation of total stock', async () => {
    // loc1 has 26 units (20 - 2 sold + 10 bought - wait, let's read actual stock)
    const inv1Before = await Inventory.findOne({ productId, variantId: 'VAR-MAROON', locationId: loc1Id });
    const inv2Before = await Inventory.findOne({ productId, variantId: 'VAR-MAROON', locationId: loc2Id });

    const qty1Before = inv1Before?.quantityOnHand || 0;
    const qty2Before = inv2Before?.quantityOnHand || 0;
    const totalBusinessStockBefore = qty1Before + qty2Before;

    expect(qty1Before).toBeGreaterThanOrEqual(5);

    // Transfer 5 units from loc1 to loc2
    const res = await request(app)
      .post('/api/inventory/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceLocationId: loc1Id,
        destinationLocationId: loc2Id,
        items: [
          {
            productId,
            variantId: 'VAR-MAROON',
            quantity: 5
          }
        ],
        notes: 'Transfer 5 lehengas to Home Studio display'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.transferNumber).toBeDefined();

    // Check post-transfer balances
    const inv1After = await Inventory.findOne({ productId, variantId: 'VAR-MAROON', locationId: loc1Id });
    const inv2After = await Inventory.findOne({ productId, variantId: 'VAR-MAROON', locationId: loc2Id });

    const qty1After = inv1After?.quantityOnHand || 0;
    const qty2After = inv2After?.quantityOnHand || 0;
    const totalBusinessStockAfter = qty1After + qty2After;

    // Source decreased by 5
    expect(qty1After).toBe(qty1Before - 5);
    // Destination increased by 5
    expect(qty2After).toBe(qty2Before + 5);
    // TEST-09: Total stock strictly conserved! Zero net change in overall inventory
    expect(totalBusinessStockAfter).toBe(totalBusinessStockBefore);
  });
});
