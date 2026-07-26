import { describe, it, expect } from 'vitest';
import { applyColorScale, invertColorScale, colorScaleToId, exprToGLSL, evalCustomExprJS } from '../components/textures/colormap';
import fs from 'fs';
import path from 'path';

describe('Color Scale Options & Inverse Math', () => {
  describe('1. Linear Scale: identity', () => {
    it('returns original normalized x directly', () => {
      expect(applyColorScale(0.0, 'identity')).toBe(0.0);
      expect(applyColorScale(0.25, 'identity')).toBe(0.25);
      expect(applyColorScale(0.5, 'identity')).toBe(0.5);
      expect(applyColorScale(1.0, 'identity')).toBe(1.0);
    });

    it('inverts identity scale accurately', () => {
      expect(invertColorScale(0.0, 'identity')).toBe(0.0);
      expect(invertColorScale(0.5, 'identity')).toBe(0.5);
      expect(invertColorScale(1.0, 'identity')).toBe(1.0);
    });
  });

  describe('2. Log Scale: log(x)', () => {
    it('Test 1: log(x) on range (1.0, 10.0)', () => {
      const minVal = 1.0;
      const maxVal = 10.0;
      const dataRange = maxVal - minVal;
      const n = 10;

      const logA = Math.log10(minVal);
      const logB = Math.log10(maxVal);
      const dataPoints = Array.from({ length: n }, (_, i) => {
        const logVal = logA + (i / (n - 1)) * (logB - logA);
        return Math.pow(10, logVal);
      });

      const expectedPositions = Array.from({ length: n }, (_, i) => i / (n - 1));

      dataPoints.forEach((d, i) => {
        const x = (d - minVal) / dataRange;
        const pos = applyColorScale(x, 'log(x)', 1.0, 0.0001, dataRange, minVal);
        expect(pos).toBeCloseTo(expectedPositions[i], 4);
      });
    });

    it('Test 2: log(x) on range (0.001, 1.0)', () => {
      const minVal = 0.001;
      const maxVal = 1.0;
      const dataRange = maxVal - minVal;
      const n = 10;

      const logA = Math.log10(minVal);
      const logB = Math.log10(maxVal);
      const dataPoints = Array.from({ length: n }, (_, i) => {
        const logVal = logA + (i / (n - 1)) * (logB - logA);
        return Math.pow(10, logVal);
      });

      const expectedPositions = Array.from({ length: n }, (_, i) => i / (n - 1));

      dataPoints.forEach((d, i) => {
        const x = (d - minVal) / dataRange;
        const pos = applyColorScale(x, 'log(x)', 1.0, 0.0001, dataRange, minVal);
        expect(pos).toBeCloseTo(expectedPositions[i], 4);
      });
    });

    it('Test 3: log(x) on range (0.0, 1000.0) with zero clipping', () => {
      const minVal = 0.0;
      const maxVal = 1000.0;
      const dataRange = maxVal - minVal;
      const logEps = 0.001;

      expect(applyColorScale(0.0, 'log(x)', 1.0, logEps, dataRange, minVal)).toBe(0.0);
      expect(applyColorScale(0.001, 'log(x)', 1.0, logEps, dataRange, minVal)).toBeCloseTo(0.0, 4);
      expect(applyColorScale(0.01, 'log(x)', 1.0, logEps, dataRange, minVal)).toBeCloseTo(0.3333, 3);
      expect(applyColorScale(0.1, 'log(x)', 1.0, logEps, dataRange, minVal)).toBeCloseTo(0.6667, 3);
      expect(applyColorScale(1.0, 'log(x)', 1.0, logEps, dataRange, minVal)).toBeCloseTo(1.0, 4);
    });

    it('round-trip invertibility for log(x)', () => {
      const minVal = 1.0;
      const dataRange = 99.0;
      [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0].forEach((x) => {
        const scaled = applyColorScale(x, 'log(x)', 1.0, 0.0001, dataRange, minVal);
        const restored = invertColorScale(scaled, 'log(x)', 1.0, 0.0001, dataRange, minVal);
        expect(restored).toBeCloseTo(x, 4);
      });
    });
  });

  describe('3. Offset Log Scale: log(x+c) (Default c=1.0)', () => {
    it('expands lower values across the range with c = 1.0', () => {
      const dataRange = 1000.0;

      expect(applyColorScale(0.0, 'log(x+c)', 1.0, 0.0001, dataRange)).toBe(0.0);
      expect(applyColorScale(0.01, 'log(x+c)', 1.0, 0.0001, dataRange)).toBeCloseTo(0.3472, 3);
      expect(applyColorScale(0.1, 'log(x+c)', 1.0, 0.0001, dataRange)).toBeCloseTo(0.6680, 3);
      expect(applyColorScale(1.0, 'log(x+c)', 1.0, 0.0001, dataRange)).toBeCloseTo(1.0, 4);
    });

    it('supports backward compatibility for legacy log(1+x) string', () => {
      const dataRange = 1000.0;
      expect(colorScaleToId('log(1+x)')).toBe(2);
      expect(applyColorScale(0.01, 'log(1+x)', 1.0, 0.0001, dataRange)).toBeCloseTo(0.3472, 3);
    });

    it('expands lower values more aggressively when c = 0.1', () => {
      const dataRange = 1000.0;
      const c = 0.1;

      expect(applyColorScale(0.0, 'log(x+c)', c, 0.0001, dataRange)).toBe(0.0);
      expect(applyColorScale(0.01, 'log(x+c)', c, 0.0001, dataRange)).toBeCloseTo(0.5010, 3);
      expect(applyColorScale(1.0, 'log(x+c)', c, 0.0001, dataRange)).toBeCloseTo(1.0, 4);
    });

    it('round-trip invertibility for log(x+c)', () => {
      const dataRange = 250.0;
      const c = 0.05;
      [0.0, 0.1, 0.3, 0.7, 1.0].forEach((x) => {
        const scaled = applyColorScale(x, 'log(x+c)', c, 0.0001, dataRange);
        const restored = invertColorScale(scaled, 'log(x+c)', c, 0.0001, dataRange);
        expect(restored).toBeCloseTo(x, 4);
      });
    });
  });

  describe('5. Symmetric Centered Square Root: sign(x)*sqrt(abs(x))', () => {
    it('preserves center symmetry around midpoint x = 0.5', () => {
      expect(applyColorScale(0.0, 'sign(x)*sqrt(abs(x))')).toBe(0.0);
      expect(applyColorScale(0.25, 'sign(x)*sqrt(abs(x))')).toBeCloseTo(0.1464, 4);
      expect(applyColorScale(0.5, 'sign(x)*sqrt(abs(x))')).toBe(0.5);
      expect(applyColorScale(0.75, 'sign(x)*sqrt(abs(x))')).toBeCloseTo(0.8536, 4);
      expect(applyColorScale(1.0, 'sign(x)*sqrt(abs(x))')).toBe(1.0);
    });

    it('round-trip invertibility for centered sign(x)*sqrt(abs(x))', () => {
      [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0].forEach((x) => {
        const scaled = applyColorScale(x, 'sign(x)*sqrt(abs(x))');
        const restored = invertColorScale(scaled, 'sign(x)*sqrt(abs(x))');
        expect(restored).toBeCloseTo(x, 4);
      });
    });
  });

  describe('6. Exponential Transform: exp(x)/100', () => {
    it('maps linear inputs into normalized exponential space', () => {
      const dataRange = 5.0;

      expect(applyColorScale(0.0, 'exp(x)/100', 1.0, 0.0001, dataRange)).toBe(0.0);
      expect(applyColorScale(0.5, 'exp(x)/100', 1.0, 0.0001, dataRange)).toBeCloseTo(0.0758, 3);
      expect(applyColorScale(1.0, 'exp(x)/100', 1.0, 0.0001, dataRange)).toBeCloseTo(1.0, 4);
    });

    it('round-trip invertibility for exp(x)/100', () => {
      const dataRange = 8.0;
      [0.0, 0.2, 0.5, 0.8, 1.0].forEach((x) => {
        const scaled = applyColorScale(x, 'exp(x)/100', 1.0, 0.0001, dataRange);
        const restored = invertColorScale(scaled, 'exp(x)/100', 1.0, 0.0001, dataRange);
        expect(restored).toBeCloseTo(x, 4);
      });
    });
  });

  describe('6. Generic Custom Expressions', () => {
    it('evaluates piecewise ternary "x > 0 ? x/2 : x"', () => {
      const expr = 'x > 0 ? x/2 : x';
      expect(colorScaleToId(expr)).toBe(5);
      expect(applyColorScale(0.0, expr)).toBe(0.0);
      expect(applyColorScale(0.5, expr)).toBeCloseTo(0.5, 4);
      expect(applyColorScale(1.0, expr)).toBe(1.0);
    });

    it('evaluates power expression "x * x"', () => {
      const expr = 'x * x';
      expect(applyColorScale(0.0, expr)).toBe(0.0);
      expect(applyColorScale(0.5, expr)).toBe(0.25);
      expect(applyColorScale(1.0, expr)).toBe(1.0);
    });

    it('converts JS expressions to float-safe GLSL code', () => {
      expect(exprToGLSL('x > 0 ? x/2 : x')).toBe('(val) > 0.0 ? (val)/2.0 : (val)');
      expect(exprToGLSL('x + 10')).toBe('(val) + 10.0');
    });

    it('handles invalid or malicious custom expressions safely', () => {
      expect(evalCustomExprJS('console.log("bad")')).toBeNull();
      expect(evalCustomExprJS('x ++ 2')).toBeNull();
      expect(evalCustomExprJS('')).toBeNull();
    });
  });

  describe('7. GLSL Shader Parity Verification', () => {
    it('verifies that colorPipeline.glsl defines contiguous logic for scaleType 1 through 5', () => {
      const shaderPath = path.resolve(__dirname, '../components/textures/shaders/colorPipeline.glsl');
      const glslContent = fs.readFileSync(shaderPath, 'utf8');

      expect(glslContent).toContain('if (scaleType == 1)');
      expect(glslContent).toContain('else if (scaleType == 2)');
      expect(glslContent).toContain('else if (scaleType == 3)');
      expect(glslContent).toContain('else if (scaleType == 4)');
      expect(glslContent).toContain('else if (scaleType == 5)');
      expect(glslContent).toContain('float xCentered = 2.0 * x - 1.0;');
      expect(glslContent).toContain('0.5 + 0.5 * sign(xCentered) * sqrt(abs(xCentered))');
    });
  });

  describe('9. Edge Cases & Robustness', () => {
    it('handles zero or tiny dataRange safely without NaN', () => {
      expect(applyColorScale(0.5, 'log(1+x)', 1.0, 0.0001, 0.0)).not.toBeNaN();
      expect(applyColorScale(0.5, 'log(x+c)', 0.0000001, 0.0001, 0.0)).not.toBeNaN();
      expect(invertColorScale(0.5, 'log(1+x)', 1.0, 0.0001, 0.0)).not.toBeNaN();
    });
  });
});
