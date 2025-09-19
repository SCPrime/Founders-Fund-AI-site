// Minimal ambient declaration so TypeScript doesn't error when @google-cloud/vision
// is dynamically imported in the OCR route. We only need a lightweight shape
// because the library is optional in local dev; runtime usage remains unchanged.
declare module '@google-cloud/vision' {
  export const ImageAnnotatorClient: any;
  const _default: { ImageAnnotatorClient: any };
  export default _default;
}
