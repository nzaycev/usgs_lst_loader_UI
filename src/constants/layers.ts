import type { USGSLayerType } from "../actions/main-actions";

/**
 * Required layers для входных TIF файлов
 * Эти слои необходимы для корректной работы расчетов
 */
export const REQUIRED_LAYERS: readonly USGSLayerType[] = [
  "ST_TRAD",
  "ST_ATRAN",
  "ST_URAD",
  "ST_DRAD",
  "SR_B6",
  "SR_B5",
  "SR_B4",
  "QA_PIXEL",
] as const;

