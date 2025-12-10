import { describe, expect, test } from "vitest";

describe("dummy test suite", () => {
	test("basic test", () => {
		expect(true).toBe(true);
	});

	test("basic math", () => {
		expect(1 + 1).toBe(2);
	});
});
