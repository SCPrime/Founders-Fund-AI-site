import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = bcrypt.hashSync('SCPRIME', 10);

  // Create or update SCPRIME admin user
  const user = await prisma.user.upsert({
    where: { email: 'scprime@foundersfund.com' },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      email: 'scprime@foundersfund.com',
      name: 'SCPRIME',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created/updated:', user.email);
  console.log('Username/Email:', user.email);
  console.log('Password: SCPRIME');
  console.log('Role:', user.role);
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
