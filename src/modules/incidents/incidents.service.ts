import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { FindIncidentsQryDto } from './dto/find-incidents-qry.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IncidentAiProducer } from '../ai/queue/incident-ai.producer';
import {
  AiStatus,
  IncidentStatus,
  Prisma,
  UserRole,
} from '@/generated/prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

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
          clientRequestId: true,
          originalMessage: true,
          latitude: true,
          longitude: true,
          address: true,
          addressReference: true,
          status: true,
          aiStatus: true,
          createdAt: true,
        },
      });

      try {
        await this.incidentAiProducer.enqueue(incident.id);
      } catch (error) {
        this.logger.error(
          `Could not enqueue AI analysis for incident ${incident.id}`,
          error instanceof Error ? error.stack : undefined,
        );

        try {
          await this.prisma.incident.update({
            where: { id: incident.id },
            data: {
              aiStatus: AiStatus.PENDING,
              aiError: 'The AI analysis could not be queued',
              requiresSupervision: true,
            },
          });
        } catch (updateError) {
          this.logger.error(
            `Could not mark incident ${incident.id} after enqueue failure`,
            updateError instanceof Error ? updateError.stack : undefined,
          );
        }
      }

      return incident;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This incident has already been registered',
        );
      }

      this.logger.error(
        'Could not create incident',
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException(
        'The incident could not be registered',
      );
    }
  }

  async findAll(
    qry: FindIncidentsQryDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      aiStatus,
      type,
      category,
      urgency,
      requiresSupervision,
      startDate,
      endDate,
    } = qry;

    const skip = (page - 1) * limit;

    const where: Prisma.IncidentWhereInput = {};

    if (authenticatedUser.role === UserRole.CITIZEN) {
      where.userId = authenticatedUser.id;
    }

    if (search) {
      where.OR = [
        { originalMessage: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (aiStatus) where.aiStatus = aiStatus;
    if (type) where.type = type;
    if (category) where.category = category;
    if (urgency) where.urgency = urgency;
    if (requiresSupervision !== undefined)
      where.requiresSupervision = requiresSupervision;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, incidents] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          originalMessage: true,
          type: true,
          category: true,
          urgency: true,
          status: true,
          aiStatus: true,
          requiresSupervision: true,
          createdAt: true,
          user: {
            select: { name: true, lastName: true },
          },
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data: incidents,
      meta: {
        total,
        page,
        limit,
        lastPage,
        hasNext: page < lastPage,
        hasPrev: page > 1,
        nextPage: page < lastPage ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateIncidentStatusDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    const allowedTransitions: Record<IncidentStatus, IncidentStatus[]> = {
      [IncidentStatus.RECEIVED]: [IncidentStatus.IN_REVIEW],
      [IncidentStatus.IN_REVIEW]: [
        IncidentStatus.ACCEPTED,
        IncidentStatus.REJECTED,
      ],
      [IncidentStatus.ACCEPTED]: [],
      [IncidentStatus.ASSIGNED]: [],
      [IncidentStatus.IN_PROGRESS]: [],
      [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED],
      [IncidentStatus.REJECTED]: [IncidentStatus.CLOSED],
      [IncidentStatus.CLOSED]: [],
    };

    const currentStatus = incident.status;
    const newStatus = dto.status;
    const allowed = allowedTransitions[currentStatus];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }

    const timestampField = this.getTimestampField(newStatus);

    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id },
        data: {
          status: newStatus,
          [timestampField]: new Date(),
        },
      });

      await tx.incidentHistory.create({
        data: {
          incidentId: id,
          userId: authenticatedUser.id,
          previousStatus: currentStatus,
          newStatus,
          comment: dto.comment,
        },
      });
    });

    return this.findOne(id, authenticatedUser);
  }

  private getTimestampField(status: IncidentStatus): string {
    const map: Record<IncidentStatus, string> = {
      [IncidentStatus.IN_REVIEW]: 'reviewedAt',
      [IncidentStatus.ACCEPTED]: 'acceptedAt',
      [IncidentStatus.REJECTED]: 'rejectedAt',
      [IncidentStatus.CLOSED]: 'closedAt',
      [IncidentStatus.RECEIVED]: 'createdAt',
      [IncidentStatus.ASSIGNED]: 'assignedAt',
      [IncidentStatus.IN_PROGRESS]: 'startedAt',
      [IncidentStatus.RESOLVED]: 'resolvedAt',
    };

    return map[status];
  }

  async retryAi(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      select: { id: true, aiStatus: true },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.prisma.$transaction([
      this.prisma.aiLog.deleteMany({
        where: { incidentId: id },
      }),
      this.prisma.incident.update({
        where: { id },
        data: {
          aiStatus: AiStatus.PENDING,
          aiError: null,
          aiAttempts: 0,
        },
      }),
    ]);

    await this.incidentAiProducer.enqueueRetry(id);

    return { message: 'AI retry enqueued' };
  }

  async findOne(id: string, authenticatedUser: AuthenticatedUser) {
    const incident = await this.prisma.incident.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },

        entities: {
          orderBy: {
            createdAt: 'asc',
          },
        },

        histories: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                role: true,
              },
            },
          },
        },

        assignments: {
          orderBy: {
            assignedAt: 'desc',
          },
          include: {
            area: {
              select: {
                id: true,
                name: true,
                description: true,
                status: true,
              },
            },
            operator: {
              select: {
                id: true,
                name: true,
                lastName: true,
                role: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    const isCitizen = authenticatedUser.role === UserRole.CITIZEN;
    const isOwner = incident.userId === authenticatedUser.id;

    if (isCitizen && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to view this incident',
      );
    }

    return incident;
  }
}
