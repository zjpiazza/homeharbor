import { createMiddleware } from "hono/factory";
import { getSession } from "./session.js";

export const sessionMiddleware = createMiddleware(async (c, next) => {
	const session = await getSession(c.req.raw);
	c.set("session", session);
	await next();
});
