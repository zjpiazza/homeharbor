import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

const listInput = z
	.object({
		deviceId: z.string().optional(),
		type: z.string().optional(),
		limit: z.number().min(1).max(100).optional(),
		cursor: z.string().optional(),
	})
	.optional();

export const eventRouter = createTRPCRouter({
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		if (!ctx.tenantId) return { items: [], nextCursor: null };
		const limit = input?.limit ?? 50;
		const where: any = {
			tenantId: ctx.tenantId,
			...(input?.deviceId ? { deviceId: input.deviceId } : {}),
			...(input?.type ? { type: input.type } : {}),
		};
		const items = await prisma.event.findMany({
			where,
			take: limit + 1,
			cursor: input?.cursor ? { id: input.cursor } : undefined,
			orderBy: { timestamp: "desc" },
			include: { device: { select: { name: true } } },
		});
		let nextCursor: string | null = null;
		if (items.length > limit) {
			const next = items.pop();
			nextCursor = next!.id;
		}
		return { items, nextCursor };
	}),
});
