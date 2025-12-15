import type { PrismaClient } from '@prisma/client'
import { randomBytes, pbkdf2Sync } from 'crypto'

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { prisma, userId }: { prisma: PrismaClient; userId?: string }) => {
      if (!userId) return null
      return await prisma.user.findUnique({ where: { id: userId } })
    },
    users: async (_: unknown, __: unknown, { prisma }: { prisma: PrismaClient }) => {
      return await prisma.user.findMany()
    },
    user: async (_: unknown, args: { id: string }, { prisma }: { prisma: PrismaClient }) => {
      return await prisma.user.findUnique({ where: { id: args.id } })
    },
  },
  Mutation: {
    createUser: async (
      _: unknown,
      args: { email: string; name?: string | null; role: 'ADMIN' | 'STAFF'; password: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const salt = randomBytes(16).toString('hex')
      const hash = pbkdf2Sync(args.password, salt, 120000, 32, 'sha256').toString('hex')
      return await prisma.user.create({
        data: { email: args.email, name: args.name ?? null, role: args.role, passwordSalt: salt, passwordHash: hash },
      })
    },
    login: async (_: unknown, args: { email: string; password: string }, { prisma }: { prisma: PrismaClient }) => {
      const user = await prisma.user.findUnique({ where: { email: args.email } })
      if (!user || !user.passwordSalt || !user.passwordHash) throw new Error('Email atau password salah')
      const hash = pbkdf2Sync(args.password, user.passwordSalt, 120000, 32, 'sha256').toString('hex')
      if (hash !== user.passwordHash) throw new Error('Email atau password salah')
      return user.id
    },
    assignStaffToWarehouse: async (
      _: unknown,
      args: { userId: string; warehouseId: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      const user = await prisma.user.findUnique({ where: { id: args.userId } })
      if (!user) throw new Error('User tidak ditemukan')
      if (user.role !== 'STAFF') throw new Error('Hanya STAFF yang bisa di-assign ke warehouse')
      await prisma.userWarehouse.upsert({
        where: { userId_warehouseId: { userId: args.userId, warehouseId: args.warehouseId } },
        update: {},
        create: { userId: args.userId, warehouseId: args.warehouseId },
      })
      return true
    },
    unassignStaffFromWarehouse: async (
      _: unknown,
      args: { userId: string; warehouseId: string },
      { prisma }: { prisma: PrismaClient }
    ) => {
      await prisma.userWarehouse.deleteMany({
        where: { userId: args.userId, warehouseId: args.warehouseId },
      })
      return true
    },
  },
  User: {
    warehouses: async (parent: { id: string }, _: unknown, { prisma }: { prisma: PrismaClient }) => {
      const links = await prisma.userWarehouse.findMany({ where: { userId: parent.id } })
      const warehouseIds = links.map((l) => l.warehouseId)
      if (warehouseIds.length === 0) return []
      return await prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } })
    },
  },
}
