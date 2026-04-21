import { PrismaClient, WorkflowStage } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ensurePostDeployBootstrap } from './seed-extensions';
import { ensureSamplePortfolio } from './seed-portfolio';
import { ensurePetroRabighPortfolio } from './seed-petro-rabigh';

const prisma = new PrismaClient();

async function seedRolesUsersAndLookups(out: { id: string }): Promise<void> {
  const stages = Object.values(WorkflowStage);

  const adminRole = await prisma.role.create({
    data: { slug: 'admin', name: 'Administrator' },
  });

  const roleSpecs: { slug: string; name: string; stage: WorkflowStage }[] = [
    { slug: 'site_measurement', name: 'Site Measurement', stage: WorkflowStage.INPUT_SITE_MEASUREMENT },
    { slug: 'engineering', name: 'Design & Engineering', stage: WorkflowStage.DESIGNING_ENGINEERING },
    { slug: 'coordinator', name: 'Co-ordinator', stage: WorkflowStage.COORDINATION },
    { slug: 'fab_shop', name: 'Fabrication Shop', stage: WorkflowStage.FABRICATION_SHOP },
    { slug: 'machining', name: 'Machining Shop', stage: WorkflowStage.MACHINING_SHOP },
    { slug: 'warehouse', name: 'Warehouse / Store', stage: WorkflowStage.WAREHOUSE_STORE },
    { slug: 'transport', name: 'Transport', stage: WorkflowStage.TRANSPORT },
    { slug: 'site_installation', name: 'Site Installation', stage: WorkflowStage.SITE_INSTALLATION },
    { slug: 'invoice', name: 'Invoice', stage: WorkflowStage.INVOICE },
  ];

  const deptRoles: { role: { id: string }; stage: WorkflowStage }[] = [];
  for (const r of roleSpecs) {
    const role = await prisma.role.create({ data: { slug: r.slug, name: r.name } });
    deptRoles.push({ role, stage: r.stage });
  }

  for (const { role, stage } of deptRoles) {
    for (const s of stages) {
      const isOwn = s === stage;
      await prisma.roleStageAccess.create({
        data: {
          roleId: role.id,
          stage: s,
          canView: isOwn,
          canEdit: isOwn,
          canOverride: false,
        },
      });
    }
  }

  const demoAccounts: {
    email: string;
    name: string;
    password: string;
    roleSlug: string;
  }[] = [
    { email: 'admin@example.com', name: 'Admin User', password: 'Admin123!', roleSlug: 'admin' },
    { email: 'site@example.com', name: 'Site Tech', password: 'Site12345', roleSlug: 'site_measurement' },
    {
      email: 'engineering@example.com',
      name: 'Engineering User',
      password: 'Engineering123!',
      roleSlug: 'engineering',
    },
    {
      email: 'coordinator@example.com',
      name: 'Co-ordinator User',
      password: 'Coordinator123!',
      roleSlug: 'coordinator',
    },
    { email: 'fab@example.com', name: 'Fab Shop User', password: 'FabShop123!', roleSlug: 'fab_shop' },
    { email: 'machining@example.com', name: 'Machining User', password: 'Machining123!', roleSlug: 'machining' },
    {
      email: 'warehouse@example.com',
      name: 'Warehouse User',
      password: 'Warehouse123!',
      roleSlug: 'warehouse',
    },
    { email: 'transport@example.com', name: 'Transport User', password: 'Transport123!', roleSlug: 'transport' },
    {
      email: 'siteinstall@example.com',
      name: 'Site Installation User',
      password: 'SiteInstall123!',
      roleSlug: 'site_installation',
    },
    { email: 'invoice@example.com', name: 'Invoice User', password: 'Invoice123!', roleSlug: 'invoice' },
  ];

  for (const acc of demoAccounts) {
    const hash = await bcrypt.hash(acc.password, 10);
    const roleRow =
      acc.roleSlug === 'admin'
        ? adminRole
        : await prisma.role.findFirstOrThrow({ where: { slug: acc.roleSlug } });
    const u = await prisma.user.create({
      data: {
        email: acc.email,
        name: acc.name,
        passwordHash: hash,
        roles: { create: [{ roleId: roleRow.id }] },
      },
    });
    if (acc.roleSlug === 'admin') out.id = u.id;
  }

  const lookupCodes = ['VEHICLE_TYPE', 'SHIFT', 'MATERIAL', 'CLAMP_TYPE', 'JOB_STATUS'];
  for (const code of lookupCodes) {
    await prisma.lookupType.create({ data: { code, description: code } });
  }

  const vt = await prisma.lookupType.findFirstOrThrow({ where: { code: 'VEHICLE_TYPE' } });
  await prisma.lookupValue.createMany({
    data: [{ lookupTypeId: vt.id, value: 'Flatbed', sortOrder: 0 }],
    skipDuplicates: true,
  });

  const sh = await prisma.lookupType.findFirstOrThrow({ where: { code: 'SHIFT' } });
  await prisma.lookupValue.createMany({
    data: [{ lookupTypeId: sh.id, value: 'Day', sortOrder: 0 }],
    skipDuplicates: true,
  });
}

async function main() {
  const adminOut = { id: '' };

  if ((await prisma.user.count()) === 0) {
    await seedRolesUsersAndLookups(adminOut);
    if (!adminOut.id) throw new Error('Seed: admin user was not created');
    console.log('Roles & users created — see deploy/credentials.txt');
  }

  const adminUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { slug: 'admin' } } } },
  });
  if (!adminUser) throw new Error('Seed: no administrator user found');

  if ((await prisma.rateCard.count()) === 0) {
    await prisma.rateCard.create({
      data: { name: 'default', hourlyRate: 50, fuelPerKm: 0.35 },
    });
  }

  await ensureSamplePortfolio(prisma, adminUser.id);
  await ensurePetroRabighPortfolio(prisma, adminUser.id);

  await ensurePostDeployBootstrap(prisma);

  console.log(
    'Seed OK — portfolio: 9 staged demos + PRJ-GOLD-COMPLETE + Petro Rabigh Yanbu (PRJ-YANBU-2026-*).',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
