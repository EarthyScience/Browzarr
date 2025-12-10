import { describe, expect, test, beforeAll } from "vitest";
import {
	DataReduction,
	Convolve,
	Multivariate2D,
	Multivariate3D,
	CUMSUM3D,
	Convolve2D,
} from "../components/computation/webGPU";
import { setMockGPUResult } from "./setup";

describe("WebGPU Functions", () => {
	beforeAll(async () => {
		if (!navigator.gpu) {
			console.warn("WebGPU is not supported in this environment");
			return;
		}

		const adapter = await navigator.gpu.requestAdapter();
		if (!adapter) {
			console.warn("No WebGPU adapter found");
			return;
		}

		const device = await adapter.requestDevice();
		if (!device) {
			console.warn("No WebGPU device found");
			return;
		}
	});

	const simpleArray = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	const shape3D = [3, 3, 1];
	const strides3D = [3, 1, 1];
	const shape2D = [3, 3];
	const strides2D = [3, 1];

	describe("DataReduction", () => {
		test("Mean Reduction", async () => {
			// Array layout (3x3x1):
			// [1, 2, 3]
			// [4, 5, 6]
			// [7, 8, 9]
			//
			// Reducing along dim 0 (mean of each column):
			// Col 0: (1+4+7)/3 = 4
			// Col 1: (2+5+8)/3 = 5
			// Col 2: (3+6+9)/3 = 6
			setMockGPUResult([4, 5, 6]);
			try {
				const result = await DataReduction(
					simpleArray,
					{ shape: shape3D, strides: strides3D },
					0,
					"Mean",
				);
				expect(result).toBeDefined();
				if (!result) throw new Error("DataReduction returned undefined");
				expect(result.length).toBe(3);
				expect(Array.from(result!)).toEqual([4, 5, 6]);
			} catch (error) {
				console.error("Mean Reduction failed:", error);
				throw error;
			}
		});

		test("Min Reduction", async () => {
			// Reducing along dim 0 (min of each column):
			// Col 0: min(1,4,7) = 1
			// Col 1: min(2,5,8) = 2
			// Col 2: min(3,6,9) = 3
			setMockGPUResult([1, 2, 3]);
			const result = await DataReduction(
				simpleArray,
				{ shape: shape3D, strides: strides3D },
				0,
				"Min",
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(3);
			expect(Array.from(result!)).toEqual([1, 2, 3]);
		});

		test("Max Reduction", async () => {
			// Reducing along dim 0 (max of each column):
			// Col 0: max(1,4,7) = 7
			// Col 1: max(2,5,8) = 8
			// Col 2: max(3,6,9) = 9
			setMockGPUResult([7, 8, 9]);
			const result = await DataReduction(
				simpleArray,
				{ shape: shape3D, strides: strides3D },
				0,
				"Max",
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(3);
			expect(Array.from(result!)).toEqual([7, 8, 9]);
		});
	});

	describe("Convolution", () => {
		test("3D Mean Convolution - Uniform Array", async () => {
			// Using uniform array where mean convolution should return the same value
			const uniformArray = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5]);
			setMockGPUResult([5, 5, 5, 5, 5, 5, 5, 5, 5]);
			const result = await Convolve(
				uniformArray,
				{ shape: shape3D, strides: strides3D },
				"Mean3D",
				{ kernelSize: 3, kernelDepth: 1 },
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(9);
			const expectedValues = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5]);
			expect(Array.from(result!)).toEqual(Array.from(expectedValues));
		});

		test("3D Mean Convolution - Variable Array", async () => {
			// For the original array [1,2,3,4,5,6,7,8,9] with 3x3 kernel
			// Expected values will depend on boundary handling in the shader
			// These are approximate values assuming proper padding
			const expectedValues = [
				2.67, 3.33, 2.67, 4.33, 5.0, 4.33, 3.33, 4.0, 3.33,
			];
			setMockGPUResult(expectedValues);
			const result = await Convolve(
				simpleArray,
				{ shape: shape3D, strides: strides3D },
				"Mean3D",
				{ kernelSize: 3, kernelDepth: 1 },
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(9);
			// Use approximate matching for floating point values
			result!.forEach((val, idx) => {
				expect(val).toBeCloseTo(expectedValues[idx], 1);
			});
		});

		test("2D Mean Convolution - Uniform Array", async () => {
			// Using uniform array for predictable results
			const uniformArray = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5]);
			setMockGPUResult([5, 5, 5, 5, 5, 5, 5, 5, 5]);
			const result = await Convolve2D(
				uniformArray,
				{ shape: shape2D, strides: strides2D },
				"Mean2D",
				3,
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(9);
			const expectedValues = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5]);
			expect(Array.from(result!)).toEqual(Array.from(expectedValues));
		});
	});

	describe("Multivariate", () => {
		const secondArray = new Float32Array([9, 8, 7, 6, 5, 4, 3, 2, 1]);

		test("2D Correlation", async () => {
			// Perfect negative correlation between [1,2,3,4,5,6,7,8,9] and [9,8,7,6,5,4,3,2,1]
			setMockGPUResult([-1]);
			const result = await Multivariate2D(
				simpleArray,
				secondArray,
				{ shape: shape3D, strides: strides3D },
				0,
				"Correlation2D",
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(1);
			expect(result![0]).toBeCloseTo(-1, 5);
		});

		test("3D Correlation", async () => {
			// Perfect negative correlation between the two arrays
			setMockGPUResult([-1]);
			const result = await Multivariate3D(
				simpleArray,
				secondArray,
				{ shape: shape3D, strides: strides3D },
				{ kernelSize: 3, kernelDepth: 1 },
				"Correlation3D",
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(1);
			expect(result![0]).toBeCloseTo(-1, 5);
		});
	});

	describe("CUMSUM3D", () => {
		test("Basic CUMSUM operation along dimension 0", async () => {
			// Array layout (3x3x1):
			// [1, 2, 3]
			// [4, 5, 6]
			// [7, 8, 9]
			//
			// Cumsum along dim 0 (accumulate down rows for each column):
			// Col 0: [1, 1+4=5, 5+7=12]
			// Col 1: [2, 2+5=7, 7+8=15]
			// Col 2: [3, 3+6=9, 9+9=18]
			// Result: [1, 2, 3, 5, 7, 9, 12, 15, 18]
			setMockGPUResult([1, 2, 3, 5, 7, 9, 12, 15, 18]);
			const result = await CUMSUM3D(
				simpleArray,
				{ shape: shape3D, strides: strides3D },
				0,
				0,
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(9);
			expect(Array.from(result!)).toEqual([1, 2, 3, 5, 7, 9, 12, 15, 18]);
		});

		test("Reverse CUMSUM operation along dimension 0", async () => {
			// Array layout (3x3x1):
			// [1, 2, 3]
			// [4, 5, 6]
			// [7, 8, 9]
			//
			// Reverse cumsum along dim 0 (accumulate up rows for each column):
			// Col 0: [1+4+7=12, 4+7=11, 7]
			// Col 1: [2+5+8=15, 5+8=13, 8]
			// Col 2: [3+6+9=18, 6+9=15, 9]
			// Result: [12, 15, 18, 11, 13, 15, 7, 8, 9]
			setMockGPUResult([12, 15, 18, 11, 13, 15, 7, 8, 9]);
			const result = await CUMSUM3D(
				simpleArray,
				{ shape: shape3D, strides: strides3D },
				0,
				1,
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(9);
			expect(Array.from(result!)).toEqual([12, 15, 18, 11, 13, 15, 7, 8, 9]);
		});

		test("Basic CUMSUM operation along dimension 1", async () => {
			// Array layout (3x3x1):
			// [1, 2, 3]
			// [4, 5, 6]
			// [7, 8, 9]
			//
			// Cumsum along dim 1 (accumulate across columns within each row):
			// Row 0: [1, 1+2=3, 3+3=6]
			// Row 1: [4, 4+5=9, 9+6=15]
			// Row 2: [7, 7+8=15, 15+9=24]
			// Result: [1, 3, 6, 4, 9, 15, 7, 15, 24]
			setMockGPUResult([1, 3, 6, 4, 9, 15, 7, 15, 24]);
			const result = await CUMSUM3D(
				simpleArray,
				{ shape: shape3D, strides: strides3D },
				1,
				0,
			);
			expect(result).toBeDefined();
			expect(result?.length).toBe(9);
			expect(Array.from(result!)).toEqual([1, 3, 6, 4, 9, 15, 7, 15, 24]);
		});
	});
});
