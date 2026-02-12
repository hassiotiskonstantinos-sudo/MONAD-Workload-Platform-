import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmails = (process.env.ADMIN_EMAILS || 'manager@example.com')
    .split(',')
    .map((e) => e.trim());

  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: UserRole.MANAGER },
      create: {
        email,
        name: email.split('@')[0],
        role: UserRole.MANAGER,
      },
    });
    console.log(`Manager seeded: ${email}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
