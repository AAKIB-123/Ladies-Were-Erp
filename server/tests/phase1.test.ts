import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'express';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models/User';
import { Location } from '../src/models/Location';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 1 Tests: Auth, Roles, Permissions and Dynamic Locations', () => {
  let adminToken: string;
  let staffToken: string;
  let assignedLocationId: string;
  let unassignedLocationId: string;
  let staffUserId: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();

    // Clean test collections
    await User.deleteMany({ email: { $in: ['admin_test@test.com', 'staff_test@test.com', 'deactivated_test@test.com'] } });
    await Location.deleteMany({ code: { $in: ['TEST-LOC-1', 'TEST-LOC-2', 'TEST-NEW-LOC'] } });

    // 1. Create two test locations
    const loc1 = await Location.create({
      name: 'Assigned Shop 1',
      code: 'TEST-LOC-1',
      isActive: true
    });
    assignedLocationId = loc1._id.toString();

    const loc2 = await Location.create({
      name: 'Unassigned Shop 2',
      code: 'TEST-LOC-2',
      isActive: true
    });
    unassignedLocationId = loc2._id.toString();

    // 2. Create Admin user
    const adminPasswordHash = await bcrypt.hash('AdminTest123!', 10);
    await User.create({
      name: 'Admin Tester',
      email: 'admin_test@test.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      assignedLocations: [loc1._id, loc2._id],
      isActive: true
    });

    // 3. Create Staff user (assigned ONLY to loc1)
    const staffPasswordHash = await bcrypt.hash('StaffTest123!', 10);
    const staff = await User.create({
      name: 'Staff Tester',
      email: 'staff_test@test.com',
      passwordHash: staffPasswordHash,
      role: 'staff',
      assignedLocations: [loc1._id],
      isActive: true
    });
    staffUserId = staff._id.toString();

    // 4. Create Deactivated user
    await User.create({
      name: 'Deactivated Tester',
      email: 'deactivated_test@test.com',
      passwordHash: staffPasswordHash,
      role: 'staff',
      assignedLocations: [loc1._id],
      isActive: false
    });

    // Obtain Admin JWT
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_test@test.com', password: 'AdminTest123!' });
    adminToken = adminRes.body.token;

    // Obtain Staff JWT
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff_test@test.com', password: 'StaffTest123!' });
    staffToken = staffRes.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: { $in: ['admin_test@test.com', 'staff_test@test.com', 'deactivated_test@test.com'] } });
    await Location.deleteMany({ code: { $in: ['TEST-LOC-1', 'TEST-LOC-2', 'TEST-NEW-LOC'] } });
    await disconnectDatabase();
  });

  it('should authenticate admin and staff successfully with valid credentials', () => {
    expect(adminToken).toBeDefined();
    expect(staffToken).toBeDefined();
  });

  it('should reject login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_test@test.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should prevent deactivated users from logging in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'deactivated_test@test.com', password: 'StaffTest123!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('deactivated');
  });

  it('TEST-01: A staff user cannot access an unassigned location', async () => {
    const res = await request(app)
      .get(`/api/locations/${unassignedLocationId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Forbidden');
  });

  it('should allow staff user to access their assigned location', async () => {
    const res = await request(app)
      .get(`/api/locations/${assignedLocationId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.location._id).toBe(assignedLocationId);
  });

  it('should only return assigned locations when staff lists locations', async () => {
    const res = await request(app)
      .get('/api/locations')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const locationIds = res.body.locations.map((l: any) => l._id);
    expect(locationIds).toContain(assignedLocationId);
    expect(locationIds).not.toContain(unassignedLocationId);
  });

  it('should allow admin to list all locations', async () => {
    const res = await request(app)
      .get('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const locationIds = res.body.locations.map((l: any) => l._id);
    expect(locationIds).toContain(assignedLocationId);
    expect(locationIds).toContain(unassignedLocationId);
  });

  it('should prevent staff from accessing admin-only user management endpoints', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to dynamically create, edit and deactivate locations', async () => {
    // 1. Create dynamic location
    const createRes = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Home Boutique',
        code: 'TEST-NEW-LOC',
        address: 'Villa 42, Green Avenue',
        description: 'Boutique showroom at home'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.location.code).toBe('TEST-NEW-LOC');
    const newLocationId = createRes.body.location._id;

    // 2. Edit dynamic location
    const editRes = await request(app)
      .put(`/api/locations/${newLocationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Home Boutique & Studio',
        description: 'Renamed boutique showroom'
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.location.name).toBe('Home Boutique & Studio');

    // 3. Deactivate dynamic location
    const deactRes = await request(app)
      .put(`/api/locations/${newLocationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.location.isActive).toBe(false);

    // 4. Verify deactivated location is excluded from active list by default
    const listRes = await request(app)
      .get('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`);

    const ids = listRes.body.locations.map((l: any) => l._id);
    expect(ids).not.toContain(newLocationId);

    // 5. Verify deactivated location is included when includeInactive=true
    const listAllRes = await request(app)
      .get('/api/locations?includeInactive=true')
      .set('Authorization', `Bearer ${adminToken}`);

    const allIds = listAllRes.body.locations.map((l: any) => l._id);
    expect(allIds).toContain(newLocationId);
  });
});
