import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth/better-auth.js";
import { sessionMiddleware } from "./auth/middleware.js";
import { createContext } from "./context.js";
import { inngestHandler } from "./inngest/handler.js";
import { appRouter } from "./routers/index.js";

const app = new Hono();

app.use(cors());

app.get("/healthz", (c) => c.text("ok"));
app.get("/readyz", (c) => c.text("ok"));

app.on(["POST", "GET"], "/api/auth/*", async (c) => {
	return auth.handler(c.req.raw);
});

app.use("/trpc/*", sessionMiddleware);
app.on(["GET", "POST"], "/trpc/*", async (c) => {
	return fetchRequestHandler({
		endpoint: "/trpc",
		req: c.req.raw,
		router: appRouter,
		createContext: () => createContext(c),
	});
});

app.use("/api/inngest", inngestHandler);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, (info) => {
	console.log(`API listening on http://localhost:${info.port}`);
});
