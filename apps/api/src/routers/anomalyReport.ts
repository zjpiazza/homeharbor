import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { inngest } from "../inngest/client.js";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

const listInput = z
	.object({
		propertyId: z.string().optional(),
		status: z.enum(["NEW", "REVIEWED", "COMPLETED", "ERROR"]).optional(),
		limit: z.number().min(1).max(100).optional(),
		cursor: z.string().optional(),
	})
	.optional();

export const anomalyReportRouter = createTRPCRouter({
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		if (!ctx.tenantId) return { items: [], nextCursor: null };
		const limit = input?.limit ?? 50;
		const where: any = {
			tenantId: ctx.tenantId,
			...(input?.propertyId ? { propertyId: input.propertyId } : {}),
			...(input?.status ? { status: input.status } : {}),
		};
		const items = await prisma.anomalyReport.findMany({
			where,
			take: limit + 1,
			cursor: input?.cursor ? { id: input.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: {
				property: { select: { name: true } },
				findings: { select: { id: true, metric: true, severity: true, status: true } },
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
		const report = await prisma.anomalyReport.findFirst({
			where: { id: input.id, tenantId: ctx.tenantId },
			include: {
				property: true,
				findings: { include: { device: { select: { name: true, type: true } } } },
				anomalyDetectionJob: true,
			},
		});
		if (!report) throw new TRPCError({ code: "NOT_FOUND" });
		return report;
	}),

	updateFindingStatus: protectedProcedure
		.input(
			z.object({
				findingId: z.string(),
				status: z.enum(["PENDING", "APPROVED", "REJECTED", "RESOLVED"]),
				resolutionDetails: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			return prisma.anomalyReportFinding.update({
				where: { id: input.findingId, tenantId: ctx.tenantId },
				data: {
					status: input.status,
					resolutionDetails: input.resolutionDetails,
					resolvedAt: input.status === "RESOLVED" ? new Date() : undefined,
					resolvedByUserId: input.status === "RESOLVED" ? ctx.userId : undefined,
				},
			});
		}),

	completeReport: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			return prisma.anomalyReport.update({
				where: { id: input.id, tenantId: ctx.tenantId },
				data: { status: "COMPLETED" },
			});
		}),

	triggerDetection: protectedProcedure
		.input(z.object({ propertyId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			await inngest.send({
				name: "anomaly/detection.requested",
				data: { propertyId: input.propertyId, tenantId: ctx.tenantId },
			});
			return { success: true, message: "Anomaly detection triggered." };
		}),
});
