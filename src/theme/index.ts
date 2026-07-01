/**
 * theme/index.ts
 *
 * Barrel export for all theme tokens. Import colors, typography, and spacing from
 * here (or directly from the individual files) — never import from node_modules
 * style libraries or hardcode values in components. Every visual constant in the
 * app should ultimately trace back to one of these three files.
 */

export { colors } from './colors';
export { typography } from './typography';
export { spacing, radius } from './spacing';
