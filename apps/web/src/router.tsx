import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.js";

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
});

// Register router for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
