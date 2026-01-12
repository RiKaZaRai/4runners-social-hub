import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
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
      role: 'client',
      accessToken: 'client-token-123'
    }
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: client.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: client.id
    }
  });

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
