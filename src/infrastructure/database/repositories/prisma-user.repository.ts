import { Injectable } from '@nestjs/common';
import type { User as PrismaUser } from '@prisma/client';
import { User } from '../../../domain/entities/user.entity';
import { Role } from '../../../domain/enums/role.enum';
import {
  CreateUserData,
  UpdateUserData,
  UserRepository,
} from '../../../domain/repositories/user.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data,
    });

    return this.toDomain(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.toDomain(user) : null;
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const existingUser = await this.findById(id);

    if (!existingUser) {
      return null;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toDomain(user);
  }

  private toDomain(user: PrismaUser): User {
    return new User({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as Role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
