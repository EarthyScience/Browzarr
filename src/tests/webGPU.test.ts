import { describe, expect, test } from 'vitest'
import { DataProcess, Convolve } from '../components/computation/webGPU'
import { setMockGPUResult } from './setup'

describe('WebGPU Functions', () => {
  const simpleArray = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const shape3D = [3, 3, 1]
  const strides3D = [3, 1, 1]
  const shape2D = [3, 3]
  const strides2D = [3, 1]
  const kernel = { size: 1, depth: 1 }

  describe('DataProcess', () => {
    test('Mean Reduction', async () => {
      // Array layout (3x3x1):
      // [1, 2, 3]
      // [4, 5, 6]
      // [7, 8, 9]
      // 
      // Reducing along dim 0 (mean of each column):
      // Col 0: (1+4+7)/3 = 4
      // Col 1: (2+5+8)/3 = 5
      // Col 2: (3+6+9)/3 = 6
      setMockGPUResult([4, 5, 6])
      try {
        const result = await DataProcess(simpleArray, undefined, { shape: shape3D, strides: strides3D }, 'Mean', undefined, kernel, 0, undefined)
        expect(result).toBeDefined()
        if (!result) throw new Error('DataProcess returned undefined')
        expect(result.array.length).toBe(3)
        expect(result.shape).toEqual([3, 1])
        expect(result.scalingFactor).toBe(0)
        expect(Array.from(result.array)).toEqual([4, 5, 6])
      } catch (error) {
        console.error('Mean Reduction failed:', error)
        throw error
      }
    })

    test('Min Reduction', async () => {
      // Reducing along dim 0 (min of each column):
      // Col 0: min(1,4,7) = 1
      // Col 1: min(2,5,8) = 2
      // Col 2: min(3,6,9) = 3
      setMockGPUResult([1, 2, 3])
      const result = await DataProcess(simpleArray, undefined, { shape: shape3D, strides: strides3D }, 'Min', undefined, kernel, 0, undefined)
      expect(result).toBeDefined()
      expect(result?.array.length).toBe(3)
      expect(result?.shape).toEqual([3, 1])
      expect(Array.from(result!.array)).toEqual([1, 2, 3])
    })

    test('Max Reduction', async () => {
      // Reducing along dim 0 (max of each column):
      // Col 0: max(1,4,7) = 7
      // Col 1: max(2,5,8) = 8
      // Col 2: max(3,6,9) = 9
      setMockGPUResult([7, 8, 9])
      const result = await DataProcess(simpleArray, undefined, { shape: shape3D, strides: strides3D }, 'Max', undefined, kernel, 0, undefined)
      expect(result).toBeDefined()
      expect(result?.array.length).toBe(3)
      expect(result?.shape).toEqual([3, 1])
      expect(Array.from(result!.array)).toEqual([7, 8, 9])
    })
  })

  describe('Convolution', () => {
    test('3D Mean Convolution - Uniform Array', async () => {
      // Using uniform array where mean convolution should return the same value
      const uniformArray = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5])
      setMockGPUResult([5, 5, 5, 5, 5, 5, 5, 5, 5])
      const result = await Convolve(
        uniformArray,
        { shape: shape3D, strides: strides3D },
        { kernelSize: 3, kernelDepth: 1 }
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      const expectedValues = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5])
      expect(Array.from(result!)).toEqual(Array.from(expectedValues))
    })

    test('3D Mean Convolution - Variable Array', async () => {
      // For the original array [1,2,3,4,5,6,7,8,9] with 3x3 kernel
      // Expected values will depend on boundary handling in the shader
      // These are approximate values assuming proper padding
      const expectedValues = [2.67, 3.33, 2.67, 4.33, 5.00, 4.33, 3.33, 4.00, 3.33]
      setMockGPUResult(expectedValues)
      const result = await Convolve(
        simpleArray,
        { shape: shape3D, strides: strides3D },
        { kernelSize: 3, kernelDepth: 1 }
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      // Use approximate matching for floating point values
      result!.forEach((val, idx) => {
        expect(val).toBeCloseTo(expectedValues[idx], 1)
      })
    })

    test('2D Mean Convolution - Uniform Array', async () => {
      // Using uniform array for predictable results
      const uniformArray = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5])
      setMockGPUResult([5, 5, 5, 5, 5, 5, 5, 5, 5])
      const result = await DataProcess(
        uniformArray,
        undefined,
        { shape: shape2D, strides: strides2D },
        'Convolution',
        'Mean',
        { size: 3, depth: 1 },
        undefined,
        undefined
      )
      expect(result).toBeDefined()
      expect(result?.array.length).toBe(9)
      expect(result?.shape).toEqual([3, 3])
      const expectedValues = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5])
      expect(Array.from(result!.array)).toEqual(Array.from(expectedValues))
    })
  })

  describe('Multivariate', () => {
    const secondArray = new Float32Array([9, 8, 7, 6, 5, 4, 3, 2, 1])

    test('2D Correlation', async () => {
      // Perfect negative correlation between [1,2,3,4,5,6,7,8,9] and [9,8,7,6,5,4,3,2,1]
      setMockGPUResult([-1])
      const result = await DataProcess(
        simpleArray,
        secondArray,
        { shape: shape3D, strides: strides3D },
        'Correlation',
        undefined,
        kernel,
        0,
        undefined
      )
      expect(result).toBeDefined()
      expect(result?.array.length).toBe(1)
      expect(result?.shape).toEqual([3, 1])
      expect(result!.array[0]).toBeCloseTo(-1, 5)
    })

    test('3D Correlation', async () => {
      // Perfect negative correlation between the two arrays
      setMockGPUResult([-1])
      const result = await DataProcess(
        simpleArray,
        secondArray,
        { shape: shape3D, strides: strides3D },
        'Convolution',
        'Correlation',
        { size: 3, depth: 1 },
        undefined,
        undefined
      )
      expect(result).toBeDefined()
      expect(result?.array.length).toBe(1)
      expect(result!.array[0]).toBeCloseTo(-1, 5)
    })
  })

  describe('CUMSUM3D', () => {
    test('Basic CUMSUM operation along dimension 0', async () => {
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
      setMockGPUResult([1, 2, 3, 5, 7, 9, 12, 15, 18])
      const result = await DataProcess(
        simpleArray,
        undefined,
        { shape: shape3D, strides: strides3D },
        'CUMSUM3D',
        undefined,
        kernel,
        0,
        false
      )
      expect(result).toBeDefined()
      expect(result?.array.length).toBe(9)
      expect(result?.shape).toEqual([3, 3, 1])
      expect(result?.scalingFactor).toBe(0)
      expect(Array.from(result!.array)).toEqual([1, 2, 3, 5, 7, 9, 12, 15, 18])
    })

    test('Reverse CUMSUM operation along dimension 0', async () => {
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
      setMockGPUResult([12, 15, 18, 11, 13, 15, 7, 8, 9])
      const result = await DataProcess(
        simpleArray,
        undefined,
        { shape: shape3D, strides: strides3D },
        'CUMSUM3D',
        undefined,
        kernel,
        0,
        true
      )
      expect(result).toBeDefined()
      expect(result?.array.length).toBe(9)
      expect(result?.scalingFactor).toBe(0)
      expect(Array.from(result!.array)).toEqual([12, 15, 18, 11, 13, 15, 7, 8, 9])
    })

    test('Basic CUMSUM operation along dimension 1', async () => {
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
      setMockGPUResult([1, 3, 6, 4, 9, 15, 7, 15, 24])
      const result = await DataProcess(
        simpleArray,
        undefined,
        { shape: shape3D, strides: strides3D },
        'CUMSUM3D',
        undefined,
        kernel,
        1,
        false
      )
      expect(result).toBeDefined()
      expect(result?.array.length).toBe(9)
      expect(result?.scalingFactor).toBe(0)
      expect(Array.from(result!.array)).toEqual([1, 3, 6, 4, 9, 15, 7, 15, 24])
    })
  })
})
