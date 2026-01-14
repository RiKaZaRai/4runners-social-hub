import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Use environment variables for passwords in production
  // For development, generate a random password if not provided
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
  const clientToken = process.env.SEED_CLIENT_TOKEN || crypto.randomBytes(32).toString('hex');

  console.log('⚠️  IMPORTANT: Save these credentials securely!');
  console.log('=====================================');

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const agency = await prisma.user.upsert({
    where: { email: 'admin@4runners.local' },
    update: {},
    create: {
      email: 'admin@4runners.local',
      name: 'Agence Admin',
      role: 'agency_admin',
      passwordHash
    }
  });

  console.log(`Admin email: admin@4runners.local`);
  console.log(`Admin password: ${adminPassword}`);
  console.log('');

  const tenant = await prisma.tenant.upsert({
    where: { name: 'Acme Bikes' },
    update: {},
    create: {
      name: 'Acme Bikes'
    }
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: agency.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: agency.id
    }
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@acme.local' },
    update: {},
    create: {
      email: 'client@acme.local',
      name: 'Client Acme',
      role: 'client_user',
      accessToken: clientToken
    }
  });

  console.log(`Client email: client@acme.local`);
  console.log(`Client access token: ${clientToken}`);
  console.log('');

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: client.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: client.id
    }
  });

  console.log('=====================================');
  console.log('✅ Seed complete.');
  console.log('');
  console.log('⚠️  SECURITY NOTES:');
  console.log('- Store these credentials in a secure password manager');
  console.log('- In production, set SEED_ADMIN_PASSWORD and SEED_CLIENT_TOKEN env vars');
  console.log('- Never commit these credentials to version control');
  console.log('- Change the admin password immediately after first login');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
