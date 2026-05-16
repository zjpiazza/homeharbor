import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { inngest } from "../inngest/client.js";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc.js";
import { anomalyReportRouter } from "./anomalyReport.js";
import { deviceRouter } from "./device.js";
import { eventRouter } from "./event.js";
import { propertyRouter } from "./property.js";
import { reservationRouter } from "./reservation.js";
import { roleRouter } from "./role.js";
import { storageRouter } from "./storage.js";
import { userRouter } from "./user.js";
import { workOrderRouter } from "./workOrder.js";

const seedConfigSchema = z
	.object({
		numProperties: z.number().int().positive().optional(),
		numDevicesPerProperty: z.number().int().positive().optional(),
		numWorkOrdersPerProperty: z.number().int().nonnegative().optional(),
		numReservationsPerProperty: z.number().int().nonnegative().optional(),
		numEventsPerDevice: z.number().int().nonnegative().optional(),
	})
	.optional();

const createTenantInput = z.object({
	name: z.string().min(1, "Tenant name cannot be empty"),
	runId: z.string().uuid("Run ID must be a valid UUID"),
	seedConfig: seedConfigSchema,
});

export const tenantRouter = createTRPCRouter({
	create: protectedProcedure.input(createTenantInput).mutation(async ({ ctx, input }) => {
		const userId = ctx.userId;
		if (!userId) {
			throw new TRPCError({ code: "UNAUTHORIZED" });
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { email: true },
		});
		if (!user?.email) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "User email not found.",
			});
		}

		// Delete existing tenant for this user (idempotent reset)
		const existing = await prisma.tenant.findFirst({
			where: { ownerId: userId },
		});
		if (existing) {
			await prisma.tenant.delete({ where: { id: existing.id } });
		}

		await inngest.send({
			name: "tenant/create.requested",
			data: {
				userId,
				userEmail: user.email,
				tenantName: input.name,
				runId: input.runId,
				seedConfig: input.seedConfig,
			},
		});

		return { runId: input.runId };
	}),

	getStatus: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.userId) return null;
		const tenant = await prisma.tenant.findFirst({
			where: { ownerId: ctx.userId },
			select: { metadata: true },
		});
		if (!tenant) return null;
		const metadata = (tenant.metadata ?? {}) as Record<string, unknown>;
		return {
			seedComplete: (metadata.seedComplete as boolean) ?? false,
			seedRunId: (metadata.seedRunId as string) ?? null,
			seedStartTime: (metadata.seedStartTime as string) ?? null,
		};
	}),

	reseed: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.userId;
		if (!userId) {
			throw new TRPCError({ code: "UNAUTHORIZED" });
		}

		const tenant = await prisma.tenant.findFirst({
			where: { ownerId: userId },
		});
		if (!tenant) {
			return { success: true, message: "No tenant to reset." };
		}

		await prisma.$transaction(async (tx) => {
			await tx.event.deleteMany({ where: { tenantId: tenant.id } });
			await tx.device.deleteMany({ where: { tenantId: tenant.id } });
			await tx.workOrder.deleteMany({ where: { tenantId: tenant.id } });
			await tx.reservation.deleteMany({ where: { tenantId: tenant.id } });
			await tx.property.deleteMany({ where: { tenantId: tenant.id } });
		});

		await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});

		return { success: true, message: "Tenant has been reset." };
	}),
});

export const appRouter = createTRPCRouter({
	hello: publicProcedure.input(z.object({ name: z.string() })).query(({ input }) => {
		return { greeting: `Hello, ${input.name}!` };
	}),
	tenant: tenantRouter,
	property: propertyRouter,
	device: deviceRouter,
	reservation: reservationRouter,
	workOrder: workOrderRouter,
	event: eventRouter,
	storage: storageRouter,
	anomalyReport: anomalyReportRouter,
	user: userRouter,
	role: roleRouter,
});

export type AppRouter = typeof appRouter;
