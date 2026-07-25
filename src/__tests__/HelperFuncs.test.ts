import { describe, expect, test } from 'vitest';
import { parseTimeUnit, parseLoc, unitToMilliseconds } from '@/utils/HelperFuncs';

describe('HelperFuncs time parsing & location formatting', () => {
  describe('parseTimeUnit', () => {
    test('supports hour unit aliases with "since"', () => {
      const [scale1, offset1] = parseTimeUnit('hours since 2024-01-01');
      const [scale2, offset2] = parseTimeUnit('h since 2024-01-01');
      const [scale3, offset3] = parseTimeUnit('hr since 2024-01-01');
      const [scale4, offset4] = parseTimeUnit('hrs since 2024-01-01');

      expect(scale1).toBe(3600000);
      expect(scale2).toBe(3600000);
      expect(scale3).toBe(3600000);
      expect(scale4).toBe(3600000);

      expect(offset1).toBe(offset2);
      expect(offset2).toBe(offset3);
      expect(offset3).toBe(offset4);
    });

    test('supports minute, second, day, and ms unit aliases with "since"', () => {
      expect(parseTimeUnit('min since 2024-01-01')[0]).toBe(60000);
      expect(parseTimeUnit('mins since 2024-01-01')[0]).toBe(60000);
      expect(parseTimeUnit('s since 2024-01-01')[0]).toBe(1000);
      expect(parseTimeUnit('sec since 2024-01-01')[0]).toBe(1000);
      expect(parseTimeUnit('secs since 2024-01-01')[0]).toBe(1000);
      expect(parseTimeUnit('d since 2024-01-01')[0]).toBe(86400000);
      expect(parseTimeUnit('ms since 2024-01-01')[0]).toBe(1);
    });

    test('supports bare time duration units without "since"', () => {
      expect(parseTimeUnit('hours')[0]).toBe(3600000);
      expect(parseTimeUnit('hour')[0]).toBe(3600000);
      expect(parseTimeUnit('h')[0]).toBe(3600000);
      expect(parseTimeUnit('hr')[0]).toBe(3600000);
      expect(parseTimeUnit('hrs')[0]).toBe(3600000);
      expect(parseTimeUnit('days')[0]).toBe(86400000);
      expect(parseTimeUnit('minutes')[0]).toBe(60000);
    });
  });

  describe('parseLoc', () => {
    test('formats bare hour duration values correctly', () => {
      expect(parseLoc(12, 'hours')).toBe('12 h');
      expect(parseLoc(24, 'h')).toBe('24 h');
      expect(parseLoc(6, 'hr')).toBe('6 h');
      expect(parseLoc(48, 'hrs')).toBe('48 h');
      expect(parseLoc(0, 'hour')).toBe('0 h');
      expect(parseLoc(12.5, 'hours')).toBe('12.50 h');
    });

    test('formats bare duration values for other time units and converts to coarsest unit', () => {
      expect(parseLoc(0, 'seconds')).toBe('0 h');
      expect(parseLoc(3600, 'seconds')).toBe('1 h');
      expect(parseLoc(7200, 's')).toBe('2 h');
      expect(parseLoc(10800, 'sec')).toBe('3 h');
      expect(parseLoc(30, 'seconds')).toBe('30 s');
      expect(parseLoc(1800, 'seconds')).toBe('30 min');
      expect(parseLoc(5, 'd')).toBe('5 d');
      expect(parseLoc(500, 'ms')).toBe('500 ms');
    });

    test('formats CF absolute datetime values with hour aliases', () => {
      // 12 hours after 2024-01-01 00:00 UTC
      expect(parseLoc(12, 'hours since 2024-01-01')).toBe('01-01-2024 12:00');
      expect(parseLoc(12, 'h since 2024-01-01')).toBe('01-01-2024 12:00');
      expect(parseLoc(12, 'hrs since 2024-01-01')).toBe('01-01-2024 12:00');
    });

    test('formats degrees correctly', () => {
      expect(parseLoc(-120.5, 'degrees_east')).toBe('-120.50°');
      expect(parseLoc(45, 'deg')).toBe('45.00°');
    });

    test('fallback for unknown units or null values', () => {
      expect(parseLoc(100, 'hPa')).toBe('100.00');
      expect(parseLoc(null, 'hours')).toBe(null);
      expect(parseLoc(undefined, 'hours')).toBe(undefined);
    });
  });
});
