import { describe, expect, it } from "vitest";

describe("api", () => {
	it("has a hello router", async () => {
		const { appRouter } = await import("./routers/index.js");
		expect(appRouter).toBeDefined();
	});
});
