import { beforeAll, vi } from 'vitest'

// Simple Float16Array polyfill for testing
if (typeof globalThis.Float16Array === 'undefined') {
  // @ts-expect-error - Simple polyfill for testing
  globalThis.Float16Array = Float32Array
}

// Track current mock data
let currentMockData: Float32Array = new Float32Array([1, 3, 6, 4, 9, 15, 7, 15, 24])

// Mock buffer that returns dynamic data
const mockBuffer = {
  mapAsync: vi.fn().mockResolvedValue(undefined),
  getMappedRange: vi.fn(() => currentMockData),
  unmap: vi.fn(),
  destroy: vi.fn()
}

const mockGPU = {
  requestAdapter: vi.fn().mockResolvedValue({
    limits: {
      maxBufferSize: 268435456,
      maxStorageBufferBindingSize: 134217728,
      maxComputeWorkgroupStorageSize: 16384,
      maxComputeInvocationsPerWorkgroup: 256,
      maxComputeWorkgroupSizeX: 256,
      maxComputeWorkgroupSizeY: 256,
      maxComputeWorkgroupSizeZ: 64
    },
    features: {
      has: vi.fn().mockReturnValue(false)
    },
    requestDevice: vi.fn().mockResolvedValue({
      limits: {
        maxBufferSize: 268435456,
        maxStorageBufferBindingSize: 134217728,
        maxComputeWorkgroupStorageSize: 16384,
        maxComputeInvocationsPerWorkgroup: 256,
        maxComputeWorkgroupSizeX: 256,
        maxComputeWorkgroupSizeY: 256,
        maxComputeWorkgroupSizeZ: 64
      },
      createBuffer: vi.fn().mockReturnValue(mockBuffer),
      createBindGroupLayout: vi.fn().mockReturnValue({}),
      createBindGroup: vi.fn().mockReturnValue({}),
      createComputePipeline: vi.fn().mockReturnValue({
        getBindGroupLayout: vi.fn().mockReturnValue({})
      }),
      createCommandEncoder: vi.fn().mockReturnValue({
        copyBufferToBuffer: vi.fn(),
        beginComputePass: vi.fn().mockReturnValue({
          setPipeline: vi.fn(),
          setBindGroup: vi.fn(),
          dispatchWorkgroups: vi.fn(),
          end: vi.fn()
        }),
        finish: vi.fn().mockReturnValue({})
      }),
      createShaderModule: vi.fn().mockReturnValue({}),
      queue: {
        writeBuffer: vi.fn(),
        submit: vi.fn()
      },
      destroy: vi.fn()
    })
  })
}

beforeAll(() => {
  if (!global.navigator) global.navigator = {} as Navigator
  Object.defineProperty(global.navigator, 'gpu', {
    configurable: true,
    writable: true,
    value: mockGPU as unknown as GPU
  })

  global.GPUShaderStage = {
    VERTEX: 1,
    FRAGMENT: 2,
    COMPUTE: 4
  }

  global.GPUBufferUsage = {
    MAP_READ: 1,
    MAP_WRITE: 2,
    COPY_SRC: 4,
    COPY_DST: 8,
    INDEX: 16,
    VERTEX: 32,
    UNIFORM: 64,
    STORAGE: 128,
    INDIRECT: 256,
    QUERY_RESOLVE: 512
  }

  global.GPUMapMode = {
    READ: 1,
    WRITE: 2
  }

  global.GPUTextureUsage = {
    COPY_SRC: 1,
    COPY_DST: 2,
    TEXTURE_BINDING: 4,
    STORAGE_BINDING: 8,
    RENDER_ATTACHMENT: 16
  }
})

// Export helper to set mock GPU results
export const setMockGPUResult = (data: number[] | Float32Array) => {
  currentMockData = data instanceof Float32Array ? data : new Float32Array(data)
}