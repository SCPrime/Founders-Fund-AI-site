// Single source of truth for API endpoint paths
export const API_ROUTES = {
  HEALTHZ: '/api/healthz',
  VERSION: '/api/version',
  CALCULATE: '/api/calculate',
  OCR: '/api/ocr',
  SCAN_SAVE: '/api/scan/save',
  SCAN_LIST: '/api/scan/list',
} as const;
