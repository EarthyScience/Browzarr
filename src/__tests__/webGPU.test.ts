import { describe, expect, test, beforeAll } from 'vitest'
import { DataReduction, Convolve, Multivariate2D, Multivariate3D, CUMSUM3D, Convolve2D } from '../components/computation/webGPU'
import { setMockGPUResult } from './setup'

describe('WebGPU Functions', () => {
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

  const simpleArray = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const shape3D = [3, 3, 1]
  const strides3D = [3, 1, 1]
  const shape2D = [3, 3]
  const strides2D = [3, 1]

  describe('DataReduction', () => {
    test('Mean Reduction', async () => {
      setMockGPUResult([4, 5, 6])
      try {
        const result = await DataReduction(simpleArray, { shape: shape3D, strides: strides3D }, 0, 'Mean')
        expect(result).toBeDefined()
        if (!result) throw new Error('DataReduction returned undefined')
        expect(result.length).toBe(3)
        expect(Array.from(result!)).toEqual([4, 5, 6])
      } catch (error) {
        console.error('Mean Reduction failed:', error)
        throw error
      }
    })

    test('Min Reduction', async () => {
      setMockGPUResult([1, 2, 3])
      const result = await DataReduction(simpleArray, { shape: shape3D, strides: strides3D }, 0, 'Min')
      expect(result).toBeDefined()
      expect(result?.length).toBe(3)
      expect(Array.from(result!)).toEqual([1, 2, 3])
    })

    test('Max Reduction', async () => {
      setMockGPUResult([7, 8, 9])
      const result = await DataReduction(simpleArray, { shape: shape3D, strides: strides3D }, 0, 'Max')
      expect(result).toBeDefined()
      expect(result?.length).toBe(3)
      expect(Array.from(result!)).toEqual([7, 8, 9])
    })
  })

  describe('Convolution', () => {
    test('3D Mean Convolution', async () => {
      setMockGPUResult([5, 5, 5, 5, 5, 5, 5, 5, 5])
      const result = await Convolve(
        simpleArray,
        { shape: shape3D, strides: strides3D },
        'Mean3D',
        { kernelSize: 3, kernelDepth: 1 }
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      const expectedValues = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5])
      expect(Array.from(result!)).toEqual(Array.from(expectedValues))
    })

    test('2D Mean Convolution', async () => {
      setMockGPUResult([5, 5, 5, 5, 5, 5, 5, 5, 5])
      const result = await Convolve2D(
        simpleArray,
        { shape: shape2D, strides: strides2D },
        'Mean2D',
        3
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      const expectedValues = new Float32Array([5, 5, 5, 5, 5, 5, 5, 5, 5])
      expect(Array.from(result!)).toEqual(Array.from(expectedValues))
    })
  })

  describe('Multivariate', () => {
    const secondArray = new Float32Array([9, 8, 7, 6, 5, 4, 3, 2, 1])

    test('2D Correlation', async () => {
      setMockGPUResult([-1])
      const result = await Multivariate2D(
        simpleArray,
        secondArray,
        { shape: shape3D, strides: strides3D },
        0,
        'Correlation2D'
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(1)
      expect(result![0]).toBeCloseTo(-1, 5)
    })

    test('3D Correlation', async () => {
      setMockGPUResult([-1])
      const result = await Multivariate3D(
        simpleArray,
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

  describe('CUMSUM3D', () => {
    test('Basic CUMSUM operation', async () => {
      setMockGPUResult([1, 3, 6, 4, 9, 15, 7, 15, 24])
      const result = await CUMSUM3D(
        simpleArray,
        { shape: shape3D, strides: strides3D },
        0,
        0
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      expect(Array.from(result!)).toEqual([1, 3, 6, 4, 9, 15, 7, 15, 24])
    })

    test('Reverse CUMSUM operation', async () => {
      setMockGPUResult([6, 5, 3, 15, 11, 6, 24, 17, 9])
      const result = await CUMSUM3D(
        simpleArray,
        { shape: shape3D, strides: strides3D },
        0,
        1
      )
      expect(result).toBeDefined()
      expect(result?.length).toBe(9)
      expect(Array.from(result!)).toEqual([6, 5, 3, 15, 11, 6, 24, 17, 9])
    })
  })
})