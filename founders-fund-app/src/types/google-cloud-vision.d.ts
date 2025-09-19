// Minimal ambient declaration so TypeScript doesn't error when @google-cloud/vision
// is dynamically imported in the OCR route. We only need a lightweight shape
// because the library is optional in local dev; runtime usage remains unchanged.
declare module '@google-cloud/vision' {
  export const ImageAnnotatorClient: new (config?: { credentials?: unknown }) => {
    textDetection: (params: { image: { content: Buffer } }) => Promise<[{ textAnnotations?: { description?: string }[] }]>;
  };
  const _default: { ImageAnnotatorClient: typeof ImageAnnotatorClient };
  export default _default;
}
