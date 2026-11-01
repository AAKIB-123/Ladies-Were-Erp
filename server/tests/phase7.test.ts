import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models/User';
import { Location } from '../src/models/Location';
import { Sale } from '../src/models/Sale';
import { AuditLog } from '../src/models/AuditLog';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 7 Tests: Tamper-Proof Audit Trail & Administrative Security (TEST-20)', () => {
  let adminToken: string;
  let staffToken: string;
  let adminUserId: any;
  let locationId: string;
  let saleId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Clean test data
    await User.deleteMany({ email: { $in: ['admin_p7@test.com', 'staff_p7@test.com'] } });
    await Location.deleteMany({ code: 'LOC-P7' });
    await Sale.deleteMany({ saleNumber: { $regex: '^SALE-P7' } });
    await AuditLog.deleteMany({ action: { $in: ['sale_voided', 'sale_reconciled'] } });

    // 1. Setup Location
    const loc = await Location.create({
      name: 'P7 Boutique Outlet',
      code: 'LOC-P7',
      isActive: true
    });
    locationId = loc._id.toString();

    // 2. Setup Admin and Staff
    const pass = await bcrypt.hash('TestPass123!', 10);

    const admin = await User.create({
      name: 'Admin P7',
      email: 'admin_p7@test.com',
      passwordHash: pass,
      role: 'admin',
      assignedLocations: [loc._id],
      isActive: true
    });
    adminUserId = admin._id;

    await User.create({
      name: 'Staff P7',
      email: 'staff_p7@test.com',
      passwordHash: pass,
      role: 'staff',
      assignedLocations: [loc._id],
      isActive: true
    });

    // 3. Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_p7@test.com', password: 'TestPass123!' });
    adminToken = adminLogin.body.token;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff_p7@test.com', password: 'TestPass123!' });
    staffToken = staffLogin.body.token;

    // 4. Create a test sale
    const sale = await Sale.create({
      saleNumber: 'SALE-P7-001',
      locationId: loc._id,
      saleMode: 'quick',
      saleDate: new Date(),
      items: [],
      grossAmount: 2500,
      discountAmount: 0,
      netAmount: 2500,
      amountReceived: 2500,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      isReconciled: false,
      isVoided: false,
      createdBy: adminUserId
    });
    saleId = sale._id.toString();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('TEST-20: Security and Permissions: Non-admin staff cannot access audit logs (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('TEST-20: Security and Permissions: Non-admin staff cannot void a posted sale (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/sales/${saleId}/void`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'Unauthorized staff void attempt' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Verify sale is not voided
    const sale = await Sale.findById(saleId);
    expect(sale?.isVoided).toBe(false);
  });

  it('Tamper-Proof Audit Trail: Admin voids sale with mandatory reason, recording audit log', async () => {
    const reasonText = 'Customer requested full refund due to billing discrepancy';

    const res = await request(app)
      .post(`/api/sales/${saleId}/void`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: reasonText });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sale.isVoided).toBe(true);
    expect(res.body.sale.voidReason).toBe(reasonText);

    // Verify AuditLog was recorded
    const auditLogs = await AuditLog.find({ entityId: saleId, action: 'sale_voided' });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);

    const log = auditLogs[0];
    expect(log.action).toBe('sale_voided');
    expect(log.entityType).toBe('Sale');
    expect(log.reason).toBe(reasonText);
    expect(log.userRole).toBe('admin');
    expect(log.beforeState?.isVoided).toBe(false);
    expect(log.afterState?.isVoided).toBe(true);
  });

  it('Admin Audit Trail Query: Admin can query audit logs with pagination and filters', async () => {
    const res = await request(app)
      .get(`/api/audit-logs?entityType=Sale&action=sale_voided`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeDefined();
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);

    const found = res.body.data.logs.find((l: any) => l.entityId.toString() === saleId);
    expect(found).toBeDefined();
    expect(found.action).toBe('sale_voided');
  });

  it('Tamper-proof audit trail remains immutable once recorded', async () => {
    const log = await AuditLog.findOne({ entityId: saleId, action: 'sale_voided' });
    expect(log).toBeTruthy();

    await expect(
      AuditLog.updateOne({ _id: log!._id }, { reason: 'tampered by staff' })
    ).rejects.toThrow(/immutable/i);
  });
});
