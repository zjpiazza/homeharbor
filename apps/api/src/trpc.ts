import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "./context.js";

export const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.session && !ctx.bypassAuth) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
	}
	return next({
		ctx,
	});
});
