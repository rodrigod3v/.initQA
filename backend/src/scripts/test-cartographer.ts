import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CartographerService } from '../web-scenario/cartographer/cartographer.service';
import { OracleService } from '../web-scenario/cartographer/oracle.service';
import { PrismaService } from '../prisma/prisma.service';

import { Module } from '@nestjs/common';
import { CartographerModule } from '../web-scenario/cartographer/cartographer.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, CartographerModule],
})
class TestModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TestModule);
  const cartographer = app.get(CartographerService);
  const oracle = app.get(OracleService);
  const prisma = app.get(PrismaService);

  const url = 'https://demo.automationtesting.in/Register.html';
  console.log(`\n🚀 Testing Semantic Brain with: ${url}`);

  try {
    // 1. Create a dummy project
    const project = await prisma.project.create({
      data: { name: 'Semantic Brain Test Project' }
    });

    // 2. Map Topology
    console.log('--- Phase 1: Mapping Topology ---');
    const mapResult = await cartographer.mapTopology(project.id, url, 2, 0); // Limiting to 2 pages, depth 0 for fast test
    console.log('Map Result:', mapResult);

    // 3. Generate Oracle Script
    console.log('\n--- Phase 2: Generating Oracle Script ---');
    const script = await oracle.generateTestScript(project.id);
    console.log('--- GENERATED SCRIPT ---');
    console.log(script);
    console.log('------------------------');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
