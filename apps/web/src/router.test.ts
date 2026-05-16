import { describe, expect, it } from "vitest";

describe("web", () => {
	it("has a router", async () => {
		const { router } = await import("./router.js");
		expect(router).toBeDefined();
	});
});
