import { Injectable } from '@nestjs/common';
import { PrismaService } from './infrastructure/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello() {
    return {
      message: 'Willay API',
    };
  }

  async healthCheck() {
    return {
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
      },
    };
  }

  // utils
  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
