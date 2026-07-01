/**
 * engine/body-metrics/bmi.ts
 *
 * Calculates BMI (Body Mass Index) — weight in kg divided by height in metres squared.
 * A rough health indicator only: it can't distinguish muscle from fat, so a muscular
 * person may show "overweight" even at low body fat. Used here as a fallback input
 * for the body fat estimate when tape measurements aren't available.
 */

export function calcBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}
