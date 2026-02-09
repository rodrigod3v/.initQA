import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestExecution = await prisma.webExecution.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
        scenario: true
    }
  });

  if (!latestExecution) {
    console.log('No execution found');
    return;
  }

  await prisma.$disconnect();
}

main();
