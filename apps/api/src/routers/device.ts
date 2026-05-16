import type { DeviceType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

const deviceSchema = z.object({
	name: z.string().min(1),
	propertyId: z.string(),
	type: z.string(),
	category: z.enum(["ENVIRONMENTAL", "SECURITY", "ENTERTAINMENT"]),
	capabilities: z.array(z.string()).default([]),
	state: z.record(z.unknown()).optional(),
	lastConnected: z.date().optional(),
});

const listInput = z
	.object({
		propertyId: z.string().optional(),
		limit: z.number().min(1).max(100).optional(),
		cursor: z.string().optional(),
	})
	.optional();

export const deviceRouter = createTRPCRouter({
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		if (!ctx.tenantId) return { items: [], nextCursor: null };
		const limit = input?.limit ?? 50;
		const where = {
			tenantId: ctx.tenantId,
			...(input?.propertyId ? { propertyId: input.propertyId } : {}),
		};
		const items = await prisma.device.findMany({
			where,
			take: limit + 1,
			cursor: input?.cursor ? { id: input.cursor } : undefined,
			orderBy: { name: "asc" },
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
		const device = await prisma.device.findFirst({
			where: { id: input.id, tenantId: ctx.tenantId },
			include: {
				property: true,
				events: { take: 20, orderBy: { timestamp: "desc" } },
				deviceReadings: { take: 20, orderBy: { timestamp: "desc" } },
			},
		});
		if (!device) throw new TRPCError({ code: "NOT_FOUND" });
		return device;
	}),

	create: protectedProcedure.input(deviceSchema).mutation(async ({ ctx, input }) => {
		const property = await prisma.property.findUnique({
			where: { id: input.propertyId },
			select: { id: true, tenantId: true },
		});
		if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });
		const tenantId = ctx.tenantId ?? property.tenantId;
		return prisma.device.create({
			data: {
				name: input.name,
				propertyId: input.propertyId,
				type: input.type as DeviceType,
				category: input.category,
				capabilities: input.capabilities,
				state: input.state as any,
				lastConnected: input.lastConnected,
				tenantId,
			},
		});
	}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				data: z.object({
					name: z.string().min(1).optional(),
					type: z.string().optional(),
					category: z.enum(["ENVIRONMENTAL", "SECURITY", "ENTERTAINMENT"]).optional(),
					capabilities: z.array(z.string()).optional(),
					state: z.record(z.unknown()).optional(),
					lastConnected: z.date().optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			const { state, ...rest } = input.data;
			return prisma.device.update({
				where: { id: input.id, tenantId: ctx.tenantId },
				data: {
					...rest,
					...(state !== undefined ? { state: state as any } : {}),
				} as any,
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			await prisma.device.delete({ where: { id: input.id, tenantId: ctx.tenantId } });
			return { success: true };
		}),

	bulkDelete: protectedProcedure
		.input(z.object({ ids: z.array(z.string()).min(1) }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			const result = await prisma.device.deleteMany({
				where: { id: { in: input.ids }, tenantId: ctx.tenantId },
			});
			return { deletedCount: result.count };
		}),

	getStatusCountsByTenant: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.tenantId) return { total: 0, online: 0, offline: 0 };
		const devices = await prisma.device.findMany({
			where: { tenantId: ctx.tenantId },
			select: { lastConnected: true },
		});
		const now = Date.now();
		const fiveMinutesAgo = now - 5 * 60 * 1000;
		return {
			total: devices.length,
			online: devices.filter((d) => d.lastConnected && d.lastConnected.getTime() > fiveMinutesAgo)
				.length,
			offline: devices.filter(
				(d) => !d.lastConnected || d.lastConnected.getTime() <= fiveMinutesAgo,
			).length,
		};
	}),

	sendCommand: protectedProcedure
		.input(z.object({ id: z.string(), command: z.string(), value: z.unknown().optional() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			const device = await prisma.device.findFirst({
				where: { id: input.id, tenantId: ctx.tenantId },
			});
			if (!device) throw new TRPCError({ code: "NOT_FOUND" });
			const state = (device.state as Record<string, unknown> | null) ?? {};
			const newState = { ...state, [input.command]: input.value ?? true };
			return prisma.device.update({
				where: { id: input.id },
				data: {
					state: newState as any,
					lastControlledAt: new Date(),
					lastControlCommand: input.command,
				},
			});
		}),
});
