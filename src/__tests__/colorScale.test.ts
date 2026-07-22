import { describe, it, expect } from 'vitest';
import { applyColorScale } from '../components/textures/colormap';

describe('Color Scale Options', () => {
  describe('1. Linear Scale: identity', () => {
    it('returns original normalized x directly', () => {
      expect(applyColorScale(0.0, 'identity')).toBe(0.0);
      expect(applyColorScale(0.25, 'identity')).toBe(0.25);
      expect(applyColorScale(0.5, 'identity')).toBe(0.5);
      expect(applyColorScale(1.0, 'identity')).toBe(1.0);
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
      const logEps = 0.001; // v_pos_min = 1.0

      expect(applyColorScale(0.0, 'log(x)', 1.0, logEps, dataRange, minVal)).toBe(0.0);
      expect(applyColorScale(0.001, 'log(x)', 1.0, logEps, dataRange, minVal)).toBeCloseTo(0.0, 4);
      expect(applyColorScale(0.01, 'log(x)', 1.0, logEps, dataRange, minVal)).toBeCloseTo(0.3333, 3);
      expect(applyColorScale(0.1, 'log(x)', 1.0, logEps, dataRange, minVal)).toBeCloseTo(0.6667, 3);
      expect(applyColorScale(1.0, 'log(x)', 1.0, logEps, dataRange, minVal)).toBeCloseTo(1.0, 4);
    });
  });

  describe('3. Standard Log Offset: log(1+x)', () => {
    it('expands lower values across the range (0.0, 1000.0)', () => {
      const dataRange = 1000.0;

      expect(applyColorScale(0.0, 'log(1+x)', 1.0, 0.0001, dataRange)).toBe(0.0);
      expect(applyColorScale(0.01, 'log(1+x)', 1.0, 0.0001, dataRange)).toBeCloseTo(0.3472, 3);
      expect(applyColorScale(0.1, 'log(1+x)', 1.0, 0.0001, dataRange)).toBeCloseTo(0.6680, 3);
      expect(applyColorScale(1.0, 'log(1+x)', 1.0, 0.0001, dataRange)).toBeCloseTo(1.0, 4);
    });
  });

  describe('4. Custom Constant Log Offset: log(x+c)', () => {
    it('matches log(1+x) when c = 1.0', () => {
      const dataRange = 1000.0;

      expect(applyColorScale(0.0, 'log(x+c)', 1.0, 0.0001, dataRange)).toBe(0.0);
      expect(applyColorScale(0.01, 'log(x+c)', 1.0, 0.0001, dataRange)).toBeCloseTo(0.3472, 3);
      expect(applyColorScale(1.0, 'log(x+c)', 1.0, 0.0001, dataRange)).toBeCloseTo(1.0, 4);
    });

    it('expands lower values more aggressively when c = 0.1', () => {
      const dataRange = 1000.0;
      const c = 0.1;

      expect(applyColorScale(0.0, 'log(x+c)', c, 0.0001, dataRange)).toBe(0.0);
      expect(applyColorScale(0.01, 'log(x+c)', c, 0.0001, dataRange)).toBeCloseTo(0.5010, 3);
      expect(applyColorScale(1.0, 'log(x+c)', c, 0.0001, dataRange)).toBeCloseTo(1.0, 4);
    });
  });

  describe('5. Sign-Preserving Sqrt: sign(x)*sqrt(abs(x))', () => {
    it('expands lower-end values scale-invariantly', () => {
      expect(applyColorScale(0.0, 'sign(x)*sqrt(abs(x))')).toBe(0.0);
      expect(applyColorScale(0.01, 'sign(x)*sqrt(abs(x))')).toBeCloseTo(0.10, 4);
      expect(applyColorScale(0.25, 'sign(x)*sqrt(abs(x))')).toBeCloseTo(0.50, 4);
      expect(applyColorScale(1.0, 'sign(x)*sqrt(abs(x))')).toBeCloseTo(1.0, 4);
    });

    it('preserves negative signs for symmetric variables', () => {
      expect(applyColorScale(-0.01, 'sign(x)*sqrt(abs(x))')).toBeCloseTo(-0.10, 4);
      expect(applyColorScale(-0.25, 'sign(x)*sqrt(abs(x))')).toBeCloseTo(-0.50, 4);
    });
  });

  describe('6. Exponential Transform: exp(x)/100', () => {
    it('maps log-space input back to linear colormap coordinates', () => {
      const dataRange = 5.0;

      expect(applyColorScale(0.0, 'exp(x)/100', 1.0, 0.0001, dataRange)).toBe(0.0);
      expect(applyColorScale(0.5, 'exp(x)/100', 1.0, 0.0001, dataRange)).toBeCloseTo(0.0758, 3);
      expect(applyColorScale(1.0, 'exp(x)/100', 1.0, 0.0001, dataRange)).toBeCloseTo(1.0, 4);
    });
  });
});
