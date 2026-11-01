import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models/User';
import { Location } from '../src/models/Location';
import { Product } from '../src/models/Product';
import { Customer } from '../src/models/Customer';
import { Supplier } from '../src/models/Supplier';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 2 Tests: Products, Variants, Customers & Suppliers', () => {
  let adminToken: string;
  let staffToken: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Clean test data
    await User.deleteMany({ email: { $in: ['admin_p2@test.com', 'staff_p2@test.com'] } });
    await Product.deleteMany({ sku: { $in: ['TEST-SAREE-01', 'TEST-KURTI-02'] } });
    await Customer.deleteMany({ name: { $in: ['Test Retail Customer'] } });
    await Supplier.deleteMany({ name: { $in: ['Surat Textile Mill'] } });

    // Setup Location
    const loc = await Location.create({
      name: 'Main Saree Hub',
      code: 'TEST-P2-LOC',
      isActive: true
    });

    // Setup Admin
    const adminPass = await bcrypt.hash('AdminP2Pass123!', 10);
    await User.create({
      name: 'Admin P2',
      email: 'admin_p2@test.com',
      passwordHash: adminPass,
      role: 'admin',
      assignedLocations: [loc._id],
      isActive: true
    });

    // Setup Staff
    const staffPass = await bcrypt.hash('StaffP2Pass123!', 10);
    await User.create({
      name: 'Staff P2',
      email: 'staff_p2@test.com',
      passwordHash: staffPass,
      role: 'staff',
      assignedLocations: [loc._id],
      isActive: true
    });

    // Obtain JWT tokens
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_p2@test.com', password: 'AdminP2Pass123!' });
    adminToken = adminRes.body.token;

    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff_p2@test.com', password: 'StaffP2Pass123!' });
    staffToken = staffRes.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['admin_p2@test.com', 'staff_p2@test.com'] } });
    await Product.deleteMany({ sku: { $in: ['TEST-SAREE-01', 'TEST-KURTI-02'] } });
    await Customer.deleteMany({ name: { $in: ['Test Retail Customer'] } });
    await Supplier.deleteMany({ name: { $in: ['Surat Textile Mill'] } });
    await Location.deleteMany({ code: 'TEST-P2-LOC' });
    await disconnectDatabase();
  });

  it('should allow admin to create a product with size/colour variants', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'TEST-SAREE-01',
        name: 'Banarasi Silk Saree',
        category: 'Sarees',
        unit: 'pcs',
        defaultPrice: 2500,
        currentWeightedAverageCost: 1400,
        variants: [
          {
            variantId: 'VAR-RED',
            colour: 'Crimson Red',
            size: 'Free Size',
            skuSuffix: '-RED',
            defaultPrice: 2500,
            currentCost: 1400
          },
          {
            variantId: 'VAR-GOLD',
            colour: 'Antique Gold',
            size: 'Free Size',
            skuSuffix: '-GOLD',
            defaultPrice: 2700,
            currentCost: 1550
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.product.sku).toBe('TEST-SAREE-01');
    expect(res.body.product.variants.length).toBe(2);
    productId = res.body.product._id;
  });

  it('should reject creating duplicate product SKU', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'TEST-SAREE-01',
        name: 'Duplicate Silk Saree',
        category: 'Sarees',
        defaultPrice: 2500
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should allow staff to view products but REDACT cost fields', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product.name).toBe('Banarasi Silk Saree');
    expect(res.body.product.defaultPrice).toBe(2500);

    // SECURITY CHECK: Staff must NOT see cost fields
    expect(res.body.product.currentWeightedAverageCost).toBeUndefined();
    expect(res.body.product.variants[0].currentCost).toBeUndefined();
    expect(res.body.product.variants[1].currentCost).toBeUndefined();
  });

  it('should allow admin to view full product cost details', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.product.currentWeightedAverageCost).toBe(1400);
    expect(res.body.product.variants[0].currentCost).toBe(1400);
  });

  it('should allow staff and admin to create and search customers', async () => {
    // Staff creates customer
    const createRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Test Retail Customer',
        phone: '9876501234',
        address: 'Boutique Walk-in'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.customer.name).toBe('Test Retail Customer');
    customerId = createRes.body.customer._id;

    // Search customer by phone
    const searchRes = await request(app)
      .get('/api/customers?search=9876501234')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.customers.length).toBeGreaterThan(0);
    expect(searchRes.body.customers[0]._id).toBe(customerId);
  });

  it('should allow admin to create and list suppliers', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Surat Textile Mill',
        contactPerson: 'Ramesh Bhai',
        phone: '9825098250',
        email: 'surattextiles@example.com',
        address: 'Ring Road, Surat'
      });

    expect(res.status).toBe(201);
    expect(res.body.supplier.name).toBe('Surat Textile Mill');
    supplierId = res.body.supplier._id;
  });

  it('should prevent staff from accessing supplier endpoints', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
