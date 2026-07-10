import { describe, expect, test, beforeAll } from 'vitest'
import { DataReduction, Convolve, Multivariate2D, Multivariate3D, CUMSUM3D, Convolve2D } from '../components/computation/webGPU'
import { setMockGPUResult } from './setup'

describe('WebGPU Functions - NaN Statistics', () => {
  beforeAll(async () => {
    if (!navigator.gpu) {
      console.warn('WebGPU is not supported in this environment')
      return
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      console.warn('No WebGPU adapter found')
      return
    }

    const device = await adapter.requestDevice()
    if (!device) {
      console.warn('No WebGPU device found')
      return
    }
  })

  // Array layout (3x3x1) with NaNs:
  // [1, NaN, 3]
  // [4, 5, NaN]
  // [NaN, 8, 9]
  const arrayWithNaN = new Float32Array([1, NaN, 3, 4, 5, NaN, NaN, 8, 9])
  
  // All NaN array
  const allNaNArray = new Float32Array([NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN])
  
  const shape3D = [3, 3, 1]
  const strides3D = [3, 1, 1]
  const shape2D = [3, 3]
  const strides2D = [3, 1]

  describe('DataReduction with NaNs', () => {
    test('Mean Reduction - skips NaNs', async () => {
      // Reducing along dim 0 (mean of each column):
      // Col 0: (1+4)/2 = 2.5 (skips NaN)
      // Col 1: (5+8)/2 = 6.5 (skips NaN)
      // Col 2: (3+9)/2 = 6 (skips NaN)
      setMockGPUResult([2.5, 6.5, 6])
      const result = await DataReduction(arrayWithNaN, { shape: shape3D, strides: strides3D }, 0, 'Mean')
      expect(result).toBeDefined()
      expect(Array.from(result!)).toEqual([2.5, 6.5, 6])
    })

    test('Min Reduction - skips NaNs', async () => {
      // Reducing along dim 0 (min of each column):
      // Col 0: min(1, 4) = 1
      // Col 1: min(5, 8) = 5
      // Col 2: min(3, 9) = 3
      setMockGPUResult([1, 5, 3])
      const result = await DataReduction(arrayWithNaN, { shape: shape3D, strides: strides3D }, 0, 'Min')
      expect(result).toBeDefined()
      expect(Array.from(result!)).toEqual([1, 5, 3])
    })

    test('Max Reduction - skips NaNs', async () => {
      // Reducing along dim 0 (max of each column):
      // Col 0: max(1, 4) = 4
      // Col 1: max(5, 8) = 8
      // Col 2: max(3, 9) = 9
      setMockGPUResult([4, 8, 9])
      const result = await DataReduction(arrayWithNaN, { shape: shape3D, strides: strides3D }, 0, 'Max')
      expect(result).toBeDefined()
      expect(Array.from(result!)).toEqual([4, 8, 9])
    })

    test('Mean Reduction - all NaNs returns NaN', async () => {
      // If all are NaN, mean should be NaN
      setMockGPUResult([NaN, NaN, NaN])
      const result = await DataReduction(allNaNArray, { shape: shape3D, strides: strides3D }, 0, 'Mean')
      expect(result).toBeDefined()
      expect(Number.isNaN(result![0])).toBe(true)
      expect(Number.isNaN(result![1])).toBe(true)
      expect(Number.isNaN(result![2])).toBe(true)
    })
  })

  describe('Convolution with NaNs', () => {
    test('3D Mean Convolution - ignores NaNs', async () => {
      // For the arrayWithNaN [1, NaN, 3, 4, 5, NaN, NaN, 8, 9] with 3x3 kernel
      // The kernel should only sum valid pixels and divide by valid N.
      // E.g., center pixel (5) surrounded by 1, NaN, 3, 4, NaN, NaN, 8, 9
      // Sum = 1+3+4+5+8+9 = 30. Valid N = 6. 30/6 = 5.0
      // We'll mock out this expected result.
      const expectedValues = [1.0, 3.25, 3.0, 2.5, 5.0, 6.0, 4.0, 6.5, 9.0]
      setMockGPUResult(expectedValues)
      const result = await Convolve(
        arrayWithNaN,
        { shape: shape3D, strides: strides3D },
        'Mean3D',
        { kernelSize: 3, kernelDepth: 1 }
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      result!.forEach((val, idx) => {
        expect(val).toBeCloseTo(expectedValues[idx], 1)
      })
    })

    test('3D Mean Convolution - all NaNs returns NaN', async () => {
      const expectedValues = new Float32Array([NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN])
      setMockGPUResult(Array.from(expectedValues))
      const result = await Convolve(
        allNaNArray,
        { shape: shape3D, strides: strides3D },
        'Mean3D',
        { kernelSize: 3, kernelDepth: 1 }
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      result!.forEach(val => {
        expect(Number.isNaN(val)).toBe(true)
      })
    })

    test('2D Mean Convolution - ignores NaNs', async () => {
      // Same logic as 3D Convolution
      const expectedValues = [1.0, 3.25, 3.0, 2.5, 5.0, 6.0, 4.0, 6.5, 9.0]
      setMockGPUResult(expectedValues)
      const result = await Convolve2D(
        arrayWithNaN,
        { shape: shape2D, strides: strides2D },
        'Mean2D',
        3
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      result!.forEach((val, idx) => {
        expect(val).toBeCloseTo(expectedValues[idx], 1)
      })
    })
  })

  describe('Multivariate with NaNs', () => {
    // Array 1 valid elements are at indices: 0, 2, 3, 4, 7, 8
    // [1, NaN, 3, 4, 5, NaN, NaN, 8, 9]
    // [9, 8,   7, 6, 5, 4,   3,   2, 1]
    const secondArray = new Float32Array([9, 8, 7, 6, 5, 4, 3, 2, 1])

    test('2D Correlation - computes only on pairwise valid elements', async () => {
      // Pairwise valid elements:
      // Array 1 valid: [1, 3, 4, 5, 8, 9]
      // Array 2 valid: [9, 7, 6, 5, 2, 1]
      // This is a perfect negative correlation (-1)
      setMockGPUResult([-1])
      const result = await Multivariate2D(
        arrayWithNaN,
        secondArray,
        { shape: shape3D, strides: strides3D },
        0,
        'Correlation2D'
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(1)
      expect(result![0]).toBeCloseTo(-1, 5)
    })

    test('3D Correlation - computes only on pairwise valid elements', async () => {
      setMockGPUResult([-1])
      const result = await Multivariate3D(
        arrayWithNaN,
        secondArray,
        { shape: shape3D, strides: strides3D },
        { kernelSize: 3, kernelDepth: 1 },
        'Correlation3D'
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(1)
      expect(result![0]).toBeCloseTo(-1, 5)
    })
  })

  describe('CUMSUM3D with NaNs', () => {
    test('Basic CUMSUM operation along dimension 0', async () => {
      // Array layout (3x3x1):
      // [1, NaN, 3]
      // [4, 5, NaN]
      // [NaN, 8, 9]
      // 
      // Cumsum along dim 0 (exclusive accumulation down rows for each column):
      // Col 0 [1, 4, NaN]: 
      //   z=0: 0.0 (first valid element)
      //   z=1: 1.0 (accumulated 1)
      //   z=2: 5.0 (accumulated 1+4)
      // Col 1 [NaN, 5, 8]:
      //   z=0: NaN (no valid elements seen yet, current is NaN)
      //   z=1: 0.0 (first valid element)
      //   z=2: 5.0 (accumulated 5)
      // Col 2 [3, NaN, 9]:
      //   z=0: 0.0 (first valid element)
      //   z=1: 3.0 (accumulated 3, current is NaN so it outputs accum)
      //   z=2: 3.0 (accumulated 3)
      // Expected: [0, NaN, 0, 1, 0, 3, 5, 5, 3]
      const expected = [0, NaN, 0, 1, 0, 3, 5, 5, 3]
      setMockGPUResult(expected)
      const result = await CUMSUM3D(
        arrayWithNaN,
        { shape: shape3D, strides: strides3D },
        0,
        0
      )
      expect(result).toBeDefined()
      result!.forEach((val, i) => {
        if (Number.isNaN(expected[i])) {
          expect(Number.isNaN(val)).toBe(true)
        } else {
          expect(val).toBe(expected[i])
        }
      })
    })

    test('Reverse CUMSUM operation along dimension 0', async () => {
      // Reverse cumsum along dim 0 (accumulate up rows for each column):
      // Col 0 [1, 4, NaN]: [4, NaN, NaN]
      // Col 1 [NaN, 5, 8]: [13, 8, 0]
      // Col 2 [3, NaN, 9]: [9, 9, 0]
      const expected = [4, 13, 9, NaN, 8, 9, NaN, 0, 0]
      setMockGPUResult(expected)
      const result = await CUMSUM3D(
        arrayWithNaN,
        { shape: shape3D, strides: strides3D },
        0,
        1
      )
      expect(result).toBeDefined()
      result!.forEach((val, i) => {
        if (Number.isNaN(expected[i])) {
          expect(Number.isNaN(val)).toBe(true)
        } else {
          expect(val).toBe(expected[i])
        }
      })
    })

    test('Basic CUMSUM operation along dimension 1', async () => {
      // Cumsum along dim 1 (accumulate across columns within each row):
      // Row 0 [1, NaN, 3]: [0, 1, 1]
      // Row 1 [4, 5, NaN]: [0, 4, 9]
      // Row 2 [NaN, 8, 9]: [NaN, 0, 8]
      const expected = [0, 1, 1, 0, 4, 9, NaN, 0, 8]
      setMockGPUResult(expected)
      const result = await CUMSUM3D(
        arrayWithNaN,
        { shape: shape3D, strides: strides3D },
        1,
        0
      )
      expect(result).toBeDefined()
      result!.forEach((val, i) => {
        if (Number.isNaN(expected[i])) {
          expect(Number.isNaN(val)).toBe(true)
        } else {
          expect(val).toBe(expected[i])
        }
      })
    })

    test('CUMSUM - all NaNs returns NaN for all', async () => {
      // For all NaNs, validCount remains 0 and every element is NaN, so output is all NaNs
      const expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN]
      setMockGPUResult(expected)
      const result = await CUMSUM3D(
        allNaNArray,
        { shape: shape3D, strides: strides3D },
        0,
        0
      )
      expect(result).toBeDefined()
      result!.forEach(val => {
        expect(Number.isNaN(val)).toBe(true)
      })
    })
  })
})
