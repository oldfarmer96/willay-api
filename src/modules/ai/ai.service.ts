import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { IncidentAiProducer } from './queue/incident-ai.producer';
import { CreateIncidentDto } from '../incidents/dto/create-incident.dto';
import { Prisma } from '@/generated/prisma/client';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incidentAiProducer: IncidentAiProducer,
  ) {}

  async create(userId: string, dto: CreateIncidentDto) {
    try {
      const incident = await this.prisma.incident.create({
        data: {
          userId,
          clientRequestId: dto.clientRequestId,
          originalMessage: dto.originalMessage,
          latitude: new Prisma.Decimal(dto.latitude),
          longitude: new Prisma.Decimal(dto.longitude),
          address: dto.address,
          addressReference: dto.addressReference,
        },
        select: {
          id: true,
          originalMessage: true,
          latitude: true,
          longitude: true,
          status: true,
          aiStatus: true,
          createdAt: true,
        },
      });

      await this.incidentAiProducer.enqueue(incident.id);

      return incident;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Este incidente ya ha sido registrado.');
      }

      throw error;
    }
  }
}
