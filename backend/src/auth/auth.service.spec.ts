import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(() => 'mock_token'),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data if valid', async () => {
      const password = 'password';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { id: '1', email: 'test@test.com', password: hashedPassword };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.validateUser('test@test.com', password);
      expect(result).toEqual({ id: '1', email: 'test@test.com' });
    });

    it('should return null if invalid password', async () => {
      const user = { id: '1', email: 'test@test.com', password: 'hashed_password' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      // We need to mock bcrypt.compare or rely on the real one. 
      // Since we are using real bcrypt in the service, let's rely on it failing the match.
      const result = await service.validateUser('test@test.com', 'wrong_password');
      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.validateUser('notfound@test.com', 'password');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token', async () => {
        const user = { email: 'test@test.com', id: '1' };
        const result = await service.login(user);
        expect(result).toEqual({ access_token: 'mock_token' });
    });
  });
});
