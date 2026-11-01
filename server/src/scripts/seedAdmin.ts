import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';
import { Location } from '../models/Location';

function requireSeedConfig(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required seed configuration: ${name}`);
  }

  return value;
}

async function seedAdmin() {
  try {
    const adminName = requireSeedConfig('INITIAL_ADMIN_NAME', env.INITIAL_ADMIN_NAME);
    const adminEmail = requireSeedConfig('INITIAL_ADMIN_EMAIL', env.INITIAL_ADMIN_EMAIL);
    const adminPassword = requireSeedConfig('INITIAL_ADMIN_PASSWORD', env.INITIAL_ADMIN_PASSWORD);
    const staffName = requireSeedConfig('INITIAL_STAFF_NAME', env.INITIAL_STAFF_NAME);
    const staffEmail = requireSeedConfig('INITIAL_STAFF_EMAIL', env.INITIAL_STAFF_EMAIL);
    const staffPassword = requireSeedConfig('INITIAL_STAFF_PASSWORD', env.INITIAL_STAFF_PASSWORD);

    console.log('[Seed] Connecting to database...');
    await connectDatabase();

    // 1. Ensure default location exists
    let mainLocation = await Location.findOne({ code: 'LOC-MAIN' });
    if (!mainLocation) {
      mainLocation = await Location.create({
        name: 'Main Boutique Shop',
        code: 'LOC-MAIN',
        description: 'Primary retail storefront',
        isActive: true
      });
      console.log(`[Seed] Created default location: "${mainLocation.name}" (${mainLocation.code})`);
    } else {
      console.log(`[Seed] Default location already exists: "${mainLocation.name}" (${mainLocation.code})`);
    }

    // 2. Ensure initial admin user exists
    let adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      adminUser = await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'admin',
        assignedLocations: [mainLocation._id],
        isActive: true
      });
      console.log(`[Seed] Initial Admin user created successfully:`);
      console.log(`       Name:  ${adminUser.name}`);
      console.log(`       Email: ${adminUser.email}`);
      console.log(`       Role:  ${adminUser.role}`);
    } else {
      console.log(`[Seed] Admin user with email "${adminEmail}" already exists.`);
    }

    // 3. Ensure the configured initial staff user exists
    let staffUser = await User.findOne({ email: staffEmail });

    if (!staffUser) {
      const staffPasswordHash = await bcrypt.hash(staffPassword, 10);
      staffUser = await User.create({
        name: staffName,
        email: staffEmail,
        passwordHash: staffPasswordHash,
        role: 'staff',
        assignedLocations: [mainLocation._id],
        isActive: true
      });
      console.log(`[Seed] Initial Staff user created successfully:`);
      console.log(`       Name:  ${staffUser.name}`);
      console.log(`       Email: ${staffUser.email}`);
      console.log(`       Role:  ${staffUser.role}`);
    } else {
      console.log(`[Seed] Staff user with email "${staffEmail}" already exists.`);
    }

    console.log('[Seed] Seeding completed successfully.');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

seedAdmin();
