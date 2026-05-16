import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db.js";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

export const storageRouter = createTRPCRouter({
	getSignedImageUrl: protectedProcedure
		.input(z.object({ path: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN" });
			// Stub: return a placeholder URL. In production, generate a presigned S3 URL.
			return { url: `${process.env.STORAGE_PUBLIC_URL ?? ""}/${input.path}`, path: input.path };
		}),
});
