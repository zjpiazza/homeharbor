import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

const propertySchema = z.object({
	name: z.string().min(1),
	address: z.string().min(1),
	type: z.string().optional(),
	imageUrl: z.string().optional(),
	description: z.string().optional(),
	anomalyCheckEnabled: z.boolean().optional(),
	anomalyCheckSchedule: z.string().nullable().optional(),
});

const listInput = z
	.object({
		limit: z.number().min(1).max(100).optional(),
		cursor: z.string().optional(),
	})
	.optional();

export const propertyRouter = createTRPCRouter({
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		if (!ctx.tenantId) return { items: [], nextCursor: null };
		const limit = input?.limit ?? 50;
		const items = await prisma.property.findMany({
			where: { tenantId: ctx.tenantId },
			take: limit + 1,
			cursor: input?.cursor ? { id: input.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: {
				devices: { select: { id: true, name: true, type: true, state: true } },
				reservations: { select: { id: true, checkIn: true, checkOut: true } },
				workOrders: { select: { id: true, status: true } },
			},
		});
		let nextCursor: string | null = null;
		if (items.length > limit) {
			const next = items.pop();
			nextCursor = next!.id;
		}
		return { items, nextCursor };
	}),

	getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
		if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
		const property = await prisma.property.findFirst({
			where: { id: input.id, tenantId: ctx.tenantId },
			include: {
				devices: true,
				reservations: true,
				workOrders: true,
			},
		});
		if (!property) throw new TRPCError({ code: "NOT_FOUND" });
		return property;
	}),

	create: protectedProcedure.input(propertySchema).mutation(async ({ ctx, input }) => {
		if (!ctx.tenantId)
			throw new TRPCError({ code: "FORBIDDEN", message: "Tenant context required." });
		if (!ctx.userId)
			throw new TRPCError({ code: "UNAUTHORIZED", message: "User context required." });
		return prisma.property.create({
			data: {
				...input,
				anomalyCheckEnabled: input.anomalyCheckEnabled ?? false,
				anomalyCheckSchedule: input.anomalyCheckSchedule ?? null,
				ownerId: ctx.userId,
				tenantId: ctx.tenantId,
			},
		});
	}),

	update: protectedProcedure
		.input(z.object({ id: z.string(), data: propertySchema.partial() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			return prisma.property.update({
				where: { id: input.id, tenantId: ctx.tenantId },
				data: input.data,
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			await prisma.property.delete({ where: { id: input.id, tenantId: ctx.tenantId } });
			return { success: true };
		}),

	bulkDelete: protectedProcedure
		.input(z.object({ ids: z.array(z.string()).min(1) }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			const result = await prisma.property.deleteMany({
				where: { id: { in: input.ids }, tenantId: ctx.tenantId },
			});
			return { deletedCount: result.count };
		}),
});
