import { PrismaClient } from '@prisma/client';

const listAndCreateUsers = async () => {
  console.log('Querying db');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  const userIds: { id: number }[] = await prisma.user.findMany({
    select: { id: true },
  });
  console.log('Existing user count:', userIds.length);
  console.log('Existing users:', JSON.stringify(userIds));
  const user = await prisma.user.create({
    data: { name: 'Alice', email: 'alice@example.com' },
  });
  console.log('Created new user', user);
  await prisma.$disconnect();
  console.log('Disconnected from db');
};

export const queryDatabase = async () => {
  await listAndCreateUsers();
};
