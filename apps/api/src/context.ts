import type { Context as HonoContext } from "hono";
import type { AuthSession } from "./auth/session.js";
import { prisma } from "./db.js";

export interface Context {
	hono?: HonoContext;
	session: AuthSession | null;
	userId: string | null;
	tenantId: string | null;
	bypassAuth?: boolean;
}

export async function createContext(c: HonoContext): Promise<Context> {
	const session = c.get("session") ?? null;
	return buildContext({ session });
}

export async function buildContext(
	opts: Partial<Omit<Context, "hono">> & { session?: AuthSession | null } = {},
): Promise<Context> {
	const session = opts.session ?? null;
	const bypassAuth = opts.bypassAuth ?? false;
	let userId = opts.userId ?? null;
	let tenantId = opts.tenantId ?? null;

	if (session?.user?.id) {
		userId = session.user.id;
		const tenant = await prisma.tenant.findFirst({
			where: { ownerId: userId },
			select: { id: true },
		});
		tenantId = tenant?.id ?? null;
	}

	return { session, userId, tenantId, bypassAuth };
}
