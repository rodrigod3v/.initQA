import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

interface UserPayload {
  id: string;
  email: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const userCount = await this.prisma.user.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await this.prisma.user.create({
        data: {
          email: 'admin@initqa.com',
          password: hashedPassword,
        },
      });
      console.log('Default admin user created: admin@initqa.com / admin123');
    }
  }

  async validateUser(email: string, pass: string): Promise<UserPayload | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = (await this.prisma.user.findUnique({
      where: { email },
    })) as any;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user && (await bcrypt.compare(pass, String(user.password)))) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = { ...user };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete result.password;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    }
    return null;
  }

  async login(user: UserPayload) {
    await Promise.resolve();
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
