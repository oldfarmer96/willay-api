import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  AssignmentStatus,
  MunicipalAreaStatus,
} from '@/generated/prisma/enums';
import { CreateMunicipalAreaDto } from './dto/create-municipal-area.dto';
import { UpdateMunicipalAreaDto } from './dto/update-municipal-area.dto';
import { FindMunicipalAreasQryDto } from './dto/find-municipal-areas-qry.dto';

@Injectable()
export class MunicipalAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMunicipalAreaDto) {
    try {
      return await this.prisma.municipalArea.create({
        data: dto,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un área con ese nombre');
      }

      throw error;
    }
  }

  async findAll(qry: FindMunicipalAreasQryDto) {
    const { page = 1, limit = 10, search, status } = qry;
    const skip = (page - 1) * limit;

    const where: Prisma.MunicipalAreaWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    const [total, areas] = await Promise.all([
      this.prisma.municipalArea.count({ where }),
      this.prisma.municipalArea.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignments: {
                where: {
                  status: {
                    in: [
                      AssignmentStatus.ASSIGNED,
                      AssignmentStatus.ACCEPTED,
                      AssignmentStatus.IN_PROGRESS,
                    ],
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data: areas,
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
    const area = await this.prisma.municipalArea.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!area) {
      throw new NotFoundException('Área no encontrada');
    }

    return area;
  }

  async update(id: string, dto: UpdateMunicipalAreaDto) {
    await this.findOne(id);

    try {
      return await this.prisma.municipalArea.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un área con ese nombre');
      }

      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeAssignments = await this.prisma.incidentAssignment.count({
      where: {
        areaId: id,
        status: {
          in: [
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.IN_PROGRESS,
          ],
        },
      },
    });

    if (activeAssignments > 0) {
      throw new ConflictException(
        `No se puede desactivar el área porque tiene ${activeAssignments} asignaciones activas`,
      );
    }

    return this.prisma.municipalArea.update({
      where: { id },
      data: { status: MunicipalAreaStatus.INACTIVE },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
