import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

const reservationSchema = z.object({
	propertyId: z.string(),
	guestId: z.string(),
	checkIn: z.date(),
	checkOut: z.date(),
	notes: z.string().optional(),
});

const listInput = z
	.object({
		propertyId: z.string().optional(),
		status: z.enum(["upcoming", "active", "past"]).optional(),
		limit: z.number().min(1).max(100).optional(),
		cursor: z.string().optional(),
	})
	.optional();

export const reservationRouter = createTRPCRouter({
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		if (!ctx.tenantId) return { items: [], nextCursor: null };
		const limit = input?.limit ?? 50;
		const now = new Date();
		const where: any = {
			tenantId: ctx.tenantId,
			...(input?.propertyId ? { propertyId: input.propertyId } : {}),
		};
		if (input?.status === "upcoming") where.checkIn = { gt: now };
		if (input?.status === "active")
			where.AND = [{ checkIn: { lte: now } }, { checkOut: { gte: now } }];
		if (input?.status === "past") where.checkOut = { lt: now };

		const items = await prisma.reservation.findMany({
			where,
			take: limit + 1,
			cursor: input?.cursor ? { id: input.cursor } : undefined,
			orderBy: { checkIn: "asc" },
			include: { property: { select: { name: true } } },
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
		const res = await prisma.reservation.findFirst({
			where: { id: input.id, tenantId: ctx.tenantId },
			include: { property: true },
		});
		if (!res) throw new TRPCError({ code: "NOT_FOUND" });
		return res;
	}),

	getActive: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.tenantId) return null;
		const now = new Date();
		return prisma.reservation.findFirst({
			where: {
				tenantId: ctx.tenantId,
				checkIn: { lte: now },
				checkOut: { gte: now },
			},
			include: { property: { select: { name: true, address: true, imageUrl: true } } },
			orderBy: { createdAt: "asc" },
		});
	}),

	create: protectedProcedure.input(reservationSchema).mutation(async ({ ctx, input }) => {
		if (!ctx.tenantId)
			throw new TRPCError({ code: "FORBIDDEN", message: "Tenant context required." });
		if (input.checkOut <= input.checkIn) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Check-out must be after check-in." });
		}
		return prisma.reservation.create({
			data: {
				propertyId: input.propertyId,
				guestId: input.guestId,
				checkIn: input.checkIn,
				checkOut: input.checkOut,
				notes: input.notes,
				tenantId: ctx.tenantId,
			},
		});
	}),

	update: protectedProcedure
		.input(z.object({ id: z.string(), data: reservationSchema.partial() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			return prisma.reservation.update({
				where: { id: input.id, tenantId: ctx.tenantId },
				data: input.data,
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			await prisma.reservation.delete({ where: { id: input.id, tenantId: ctx.tenantId } });
			return { success: true };
		}),

	bulkDelete: protectedProcedure
		.input(z.object({ ids: z.array(z.string()).min(1) }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			const result = await prisma.reservation.deleteMany({
				where: { id: { in: input.ids }, tenantId: ctx.tenantId },
			});
			return { deletedCount: result.count };
		}),
});
