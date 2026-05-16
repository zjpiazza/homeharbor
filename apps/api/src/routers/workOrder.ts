import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

const woSchema = z.object({
	propertyId: z.string(),
	issue: z.string().min(1),
	details: z.string().optional(),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]).optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
	deviceId: z.string().optional(),
});

const listInput = z
	.object({
		propertyId: z.string().optional(),
		status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]).optional(),
		priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
		limit: z.number().min(1).max(100).optional(),
		cursor: z.string().optional(),
	})
	.optional();

export const workOrderRouter = createTRPCRouter({
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		if (!ctx.tenantId) return { items: [], nextCursor: null };
		const limit = input?.limit ?? 50;
		const where = {
			tenantId: ctx.tenantId,
			...(input?.propertyId ? { propertyId: input.propertyId } : {}),
			...(input?.status ? { status: input.status } : {}),
			...(input?.priority ? { priority: input.priority } : {}),
		};
		const items = await prisma.workOrder.findMany({
			where,
			take: limit + 1,
			cursor: input?.cursor ? { id: input.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: { property: { select: { name: true } }, Device: { select: { name: true } } },
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
		const wo = await prisma.workOrder.findFirst({
			where: { id: input.id, tenantId: ctx.tenantId },
			include: { property: true, Device: true },
		});
		if (!wo) throw new TRPCError({ code: "NOT_FOUND" });
		return wo;
	}),

	create: protectedProcedure.input(woSchema).mutation(async ({ ctx, input }) => {
		if (!ctx.tenantId)
			throw new TRPCError({ code: "FORBIDDEN", message: "Tenant context required." });
		if (!ctx.userId)
			throw new TRPCError({ code: "UNAUTHORIZED", message: "User context required." });
		return prisma.workOrder.create({
			data: {
				propertyId: input.propertyId,
				issue: input.issue,
				details: input.details,
				status: input.status ?? "PENDING",
				priority: input.priority ?? "MEDIUM",
				deviceId: input.deviceId,
				tenantId: ctx.tenantId,
				reportedById: ctx.userId,
			},
		});
	}),

	update: protectedProcedure
		.input(z.object({ id: z.string(), data: woSchema.partial() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			return prisma.workOrder.update({
				where: { id: input.id, tenantId: ctx.tenantId },
				data: input.data,
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			await prisma.workOrder.delete({ where: { id: input.id, tenantId: ctx.tenantId } });
			return { success: true };
		}),

	bulkDelete: protectedProcedure
		.input(z.object({ ids: z.array(z.string()).min(1) }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			const result = await prisma.workOrder.deleteMany({
				where: { id: { in: input.ids }, tenantId: ctx.tenantId },
			});
			return { deletedCount: result.count };
		}),
});
