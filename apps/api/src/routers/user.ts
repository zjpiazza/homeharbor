import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

export const userRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.tenantId) return [];
		// Return users who have sessions in this tenant
		const tenant = await prisma.tenant.findUnique({
			where: { id: ctx.tenantId },
			include: { reservations: { select: { guestId: true } } },
		});
		if (!tenant) return [];
		const owner = await prisma.user.findUnique({
			where: { id: tenant.ownerId },
			select: { id: true, name: true, email: true },
		});
		return owner ? [owner] : [];
	}),

	me: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.userId) return null;
		return prisma.user.findUnique({
			where: { id: ctx.userId },
			select: { id: true, name: true, email: true, image: true },
		});
	}),
});
