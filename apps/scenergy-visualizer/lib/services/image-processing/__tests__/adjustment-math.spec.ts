import { describe, it, expect } from 'vitest';
import {
  buildLinearCurvePoints,
  buildLuminosityCurvePoints,
  buildNormalizedLinearCurvePoints,
  buildNormalizedLuminosityCurvePoints,
  calculateLuminosityAdjustment,
  contrastToFactor,
  exposureToMultiplier,
  temperatureToRGB,
} from '../adjustment-math';

describe('adjustment-math', () => {
  it('exposureToMultiplier maps to aggressive brightness curve', () => {
    expect(exposureToMultiplier(0)).toBe(1);
    expect(exposureToMultiplier(100)).toBeCloseTo(4, 5); // 4x brighter at max
    expect(exposureToMultiplier(-100)).toBeCloseTo(0.25, 5); // 4x darker at min
    expect(exposureToMultiplier(50)).toBeCloseTo(2, 5); // 2x at half
  });

  it('contrastToFactor maps to aggressive contrast curve', () => {
    expect(contrastToFactor(0)).toBe(1);
    expect(contrastToFactor(100)).toBe(3); // 3x contrast at max
    expect(contrastToFactor(-100)).toBe(0); // flat gray at min
    expect(contrastToFactor(50)).toBe(2); // 2x at half positive
  });

  it('temperatureToRGB biases channels for warm/cool shifts', () => {
    const warm = temperatureToRGB(100);
    const cool = temperatureToRGB(-100);

    expect(Math.max(warm.r, warm.g, warm.b)).toBeCloseTo(1, 5);
    expect(Math.max(cool.r, cool.g, cool.b)).toBeCloseTo(1, 5);
    expect(warm.r).toBeGreaterThanOrEqual(warm.b);
    expect(cool.b).toBeGreaterThanOrEqual(cool.r);
  });

  it('calculateLuminosityAdjustment matches expected polarity', () => {
    const neutral = calculateLuminosityAdjustment(128, {
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
    });
    const highlightReduce = calculateLuminosityAdjustment(255, {
      highlights: 100,
      shadows: 0,
      whites: 0,
      blacks: 0,
    });
    const shadowLift = calculateLuminosityAdjustment(0, {
      highlights: 0,
      shadows: 100,
      whites: 0,
      blacks: 0,
    });

    expect(neutral).toBe(0);
    expect(highlightReduce).toBeLessThan(0);
    expect(shadowLift).toBeGreaterThan(0);
  });

  it('buildLuminosityCurvePoints returns identity for zero adjustments', () => {
    const points = buildLuminosityCurvePoints(
      { highlights: 0, shadows: 0, whites: 0, blacks: 0 },
      5
    );

    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1]).toEqual([255, 255]);
  });

  it('buildLinearCurvePoints clamps to byte range', () => {
    const points = buildLinearCurvePoints(2, 0);

    expect(points[0]).toEqual([0, 0]);
    expect(points[1][0]).toBe(255);
    expect(points[1][1]).toBe(255);
  });

  it('buildNormalizedLuminosityCurvePoints returns values in 0-1 range', () => {
    const points = buildNormalizedLuminosityCurvePoints(
      { highlights: 100, shadows: 100, whites: 100, blacks: 100 },
      5
    );

    // All input and output values should be in 0-1 range
    for (const [input, output] of points) {
      expect(input).toBeGreaterThanOrEqual(0);
      expect(input).toBeLessThanOrEqual(1);
      expect(output).toBeGreaterThanOrEqual(0);
      expect(output).toBeLessThanOrEqual(1);
    }
  });

  it('buildNormalizedLuminosityCurvePoints returns identity for zero adjustments', () => {
    const points = buildNormalizedLuminosityCurvePoints(
      { highlights: 0, shadows: 0, whites: 0, blacks: 0 },
      5
    );

    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1]).toEqual([1, 1]);
  });

  it('buildNormalizedLinearCurvePoints returns values in 0-1 range', () => {
    const points = buildNormalizedLinearCurvePoints(2, 0);

    expect(points[0]).toEqual([0, 0]);
    expect(points[1][0]).toBe(1);
    expect(points[1][1]).toBe(1);
  });

  it('buildNormalizedLinearCurvePoints applies slope and intercept correctly', () => {
    // slope 0.5, intercept 64 (normalized: 0.25)
    const points = buildNormalizedLinearCurvePoints(0.5, 64);

    // At input 0: output = 64/255 ≈ 0.25
    expect(points[0][0]).toBe(0);
    expect(points[0][1]).toBeCloseTo(0.251, 2);
    // At input 1: output = 0.5 * 1 + 0.25 = 0.75
    expect(points[1][0]).toBe(1);
    expect(points[1][1]).toBeCloseTo(0.751, 2);
  });
});
