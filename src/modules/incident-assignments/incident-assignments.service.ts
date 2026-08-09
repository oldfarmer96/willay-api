import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import {
  AssignmentStatus,
  IncidentStatus,
  MunicipalAreaStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@/generated/prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { FindAssignmentsQryDto } from './dto/find-assignments-qry.dto';

@Injectable()
export class IncidentAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssignmentDto) {
    const [incident, area, operator] = await Promise.all([
      this.prisma.incident.findUnique({
        where: { id: dto.incidentId },
        select: { id: true, status: true },
      }),
      this.prisma.municipalArea.findUnique({
        where: { id: dto.areaId },
        select: { id: true, status: true },
      }),
      dto.operatorId
        ? this.prisma.user.findUnique({
            where: { id: dto.operatorId },
            select: { id: true, role: true, status: true },
          })
        : Promise.resolve(null),
    ]);

    if (!incident) {
      throw new NotFoundException('Incidente no encontrado');
    }

    if (incident.status !== IncidentStatus.ACCEPTED) {
      throw new BadRequestException(
        'El incidente debe estar en estado ACCEPTED para ser asignado',
      );
    }

    if (!area) {
      throw new NotFoundException('Área municipal no encontrada');
    }

    if (area.status !== MunicipalAreaStatus.ACTIVE) {
      throw new BadRequestException('El área municipal no está activa');
    }

    if (dto.operatorId && !operator) {
      throw new NotFoundException('Operador no encontrado');
    }

    if (operator && operator.role !== UserRole.OPERATOR) {
      throw new BadRequestException('El usuario asignado debe ser OPERATOR');
    }

    if (operator && operator.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('El operador no está activo');
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const newAssignment = await tx.incidentAssignment.create({
        data: {
          incidentId: dto.incidentId,
          areaId: dto.areaId,
          operatorId: dto.operatorId,
          note: dto.note,
        },
        include: {
          incident: {
            select: { id: true, status: true },
          },
          area: {
            select: { id: true, name: true },
          },
          operator: {
            select: { id: true, name: true, lastName: true },
          },
        },
      });

      await tx.incident.update({
        where: { id: dto.incidentId },
        data: {
          status: IncidentStatus.ASSIGNED,
          assignedAt: new Date(),
        },
      });

      await tx.incidentHistory.create({
        data: {
          incidentId: dto.incidentId,
          userId: null,
          previousStatus: IncidentStatus.ACCEPTED,
          newStatus: IncidentStatus.ASSIGNED,
          comment: `Asignado al área: ${newAssignment.area.name}`,
        },
      });

      return newAssignment;
    });

    return assignment;
  }

  async updateStatus(
    id: string,
    dto: UpdateAssignmentStatusDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const assignment = await this.prisma.incidentAssignment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        operatorId: true,
        incidentId: true,
        incident: {
          select: { status: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    if (
      authenticatedUser.role === UserRole.OPERATOR &&
      assignment.operatorId !== authenticatedUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta asignación',
      );
    }

    const allowedTransitions: Record<AssignmentStatus, AssignmentStatus[]> = {
      [AssignmentStatus.ASSIGNED]: [
        AssignmentStatus.ACCEPTED,
        AssignmentStatus.CANCELLED,
        AssignmentStatus.REASSIGNED,
      ],
      [AssignmentStatus.ACCEPTED]: [
        AssignmentStatus.IN_PROGRESS,
        AssignmentStatus.CANCELLED,
        AssignmentStatus.REASSIGNED,
      ],
      [AssignmentStatus.IN_PROGRESS]: [
        AssignmentStatus.COMPLETED,
        AssignmentStatus.CANCELLED,
      ],
      [AssignmentStatus.COMPLETED]: [],
      [AssignmentStatus.CANCELLED]: [],
      [AssignmentStatus.REASSIGNED]: [],
    };

    const currentStatus = assignment.status;
    const newStatus = dto.status;
    const allowed = allowedTransitions[currentStatus];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar de ${currentStatus} a ${newStatus}`,
      );
    }

    const assignmentData: Prisma.IncidentAssignmentUpdateInput = {
      status: newStatus,
    };

    const incidentData: Prisma.IncidentUpdateInput = {};

    let createHistory: {
      previousStatus: IncidentStatus;
      newStatus: IncidentStatus;
      comment?: string;
    } | null = null;

    switch (newStatus) {
      case AssignmentStatus.ACCEPTED:
        assignmentData.acceptedAt = new Date();
        break;

      case AssignmentStatus.IN_PROGRESS:
        assignmentData.startedAt = new Date();
        incidentData.status = IncidentStatus.IN_PROGRESS;
        incidentData.startedAt = new Date();
        createHistory = {
          previousStatus: IncidentStatus.ASSIGNED,
          newStatus: IncidentStatus.IN_PROGRESS,
          comment: dto.note,
        };
        break;

      case AssignmentStatus.COMPLETED:
        assignmentData.completedAt = new Date();
        incidentData.status = IncidentStatus.RESOLVED;
        incidentData.resolvedAt = new Date();
        createHistory = {
          previousStatus: IncidentStatus.IN_PROGRESS,
          newStatus: IncidentStatus.RESOLVED,
          comment: dto.note,
        };
        break;

      case AssignmentStatus.CANCELLED:
        assignmentData.cancelledAt = new Date();
        incidentData.status = IncidentStatus.ACCEPTED;
        createHistory = {
          previousStatus: assignment.incident.status,
          newStatus: IncidentStatus.ACCEPTED,
          comment: dto.note,
        };
        break;

      case AssignmentStatus.REASSIGNED:
        break;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.incidentAssignment.update({
        where: { id },
        data: assignmentData,
      });

      if (Object.keys(incidentData).length > 0) {
        await tx.incident.update({
          where: { id: assignment.incidentId },
          data: incidentData,
        });
      }

      if (createHistory) {
        await tx.incidentHistory.create({
          data: {
            incidentId: assignment.incidentId,
            userId: authenticatedUser.id,
            previousStatus: createHistory.previousStatus,
            newStatus: createHistory.newStatus,
            comment: createHistory.comment,
          },
        });
      }
    });

    return this.findOne(id);
  }

  async findAll(qry: FindAssignmentsQryDto) {
    const {
      page = 1,
      limit = 10,
      incidentId,
      areaId,
      operatorId,
      status,
    } = qry;
    const skip = (page - 1) * limit;

    const where: Prisma.IncidentAssignmentWhereInput = {};

    if (incidentId) where.incidentId = incidentId;
    if (areaId) where.areaId = areaId;
    if (operatorId) where.operatorId = operatorId;
    if (status) where.status = status;

    const [total, assignments] = await Promise.all([
      this.prisma.incidentAssignment.count({ where }),
      this.prisma.incidentAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          incident: {
            select: { id: true, originalMessage: true },
          },
          area: {
            select: { id: true, name: true },
          },
          operator: {
            select: { id: true, name: true, lastName: true },
          },
        },
      }),
    ]);

    const data = assignments.map((a) => ({
      ...a,
      incident: {
        ...a.incident,
        originalMessage:
          a.incident.originalMessage.length > 120
            ? `${a.incident.originalMessage.slice(0, 120)}...`
            : a.incident.originalMessage,
      },
    }));

    const lastPage = Math.ceil(total / limit);

    return {
      data,
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

  async findOne(id: string) {
    const assignment = await this.prisma.incidentAssignment.findUnique({
      where: { id },
      include: {
        incident: {
          select: {
            id: true,
            originalMessage: true,
            status: true,
            user: {
              select: { id: true, name: true, lastName: true },
            },
          },
        },
        area: {
          select: { id: true, name: true, description: true, status: true },
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
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    return assignment;
  }
}
