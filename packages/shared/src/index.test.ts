import { describe, expect, it } from "vitest";

describe("shared", () => {
	it("exports helloSchema", async () => {
		const { helloSchema } = await import("./index.js");
		expect(helloSchema).toBeDefined();
	});
});
