
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    console.log('Querying WebExecution...');
    const result = await prisma.webExecution.findMany({
      take: 1,
    });
    console.log('Query successful:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('QUERY FAILED:', err.message);
    if (err.code) console.error('Error Code:', err.code);
  } finally {
    await prisma.$disconnect();
  }
}

check();
