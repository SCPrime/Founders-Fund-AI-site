// Advanced image preprocessing utilities for OCR optimization
// This module provides comprehensive image enhancement for better text recognition

export interface PreprocessingOptions {
  enhanceContrast?: boolean;
  adjustBrightness?: boolean;
  removeNoise?: boolean;
  sharpenText?: boolean;
  deskew?: boolean;
  normalizeSize?: boolean;
  targetWidth?: number;
  targetHeight?: number;
}

export interface ProcessingResult {
  processedImageData: string;
  processingSteps: string[];
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
  estimatedQuality: number;
}

/**
 * Preprocesses an image for optimal OCR results
 * @param imageData Base64 encoded image data
 * @param options Preprocessing options
 * @returns Promise with processed image and metadata
 */
export async function preprocessImageForOCR(
  imageData: string,
  options: PreprocessingOptions = {}
): Promise<ProcessingResult> {
  const defaultOptions: PreprocessingOptions = {
    enhanceContrast: true,
    adjustBrightness: true,
    removeNoise: true,
    sharpenText: true,
    deskew: false, // Can be CPU intensive
    normalizeSize: true,
    targetWidth: 1200,
    targetHeight: 1600
  };

  const config = { ...defaultOptions, ...options };
  const processingSteps: string[] = [];

  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const img = new Image();
      img.onload = () => {
        try {
          const originalSize = { width: img.width, height: img.height };

          // Step 1: Set canvas size (normalize if requested)
          if (config.normalizeSize && config.targetWidth && config.targetHeight) {
            const aspectRatio = img.width / img.height;
            const targetAspectRatio = config.targetWidth / config.targetHeight;

            if (aspectRatio > targetAspectRatio) {
              canvas.width = config.targetWidth;
              canvas.height = config.targetWidth / aspectRatio;
            } else {
              canvas.height = config.targetHeight;
              canvas.width = config.targetHeight * aspectRatio;
            }
            processingSteps.push('Normalized image size');
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          // Draw original image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Step 2: Get image data for pixel manipulation
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Step 3: Enhance contrast
          if (config.enhanceContrast) {
            enhanceContrast(data);
            processingSteps.push('Enhanced contrast');
          }

          // Step 4: Adjust brightness
          if (config.adjustBrightness) {
            adjustBrightness(data);
            processingSteps.push('Adjusted brightness');
          }

          // Step 5: Remove noise
          if (config.removeNoise) {
            removeNoise(data, canvas.width, canvas.height);
            processingSteps.push('Removed noise');
          }

          // Step 6: Sharpen text
          if (config.sharpenText) {
            sharpenImage(data, canvas.width, canvas.height);
            processingSteps.push('Sharpened text');
          }

          // Apply processed data back to canvas
          ctx.putImageData(imageData, 0, 0);

          // Step 7: Convert to high-contrast mode for better OCR
          convertToHighContrast(ctx, canvas.width, canvas.height);
          processingSteps.push('Applied high-contrast mode');

          const processedSize = { width: canvas.width, height: canvas.height };
          const processedImageData = canvas.toDataURL('image/png', 1.0);

          // Estimate quality based on processing steps
          const estimatedQuality = calculateQualityScore(processingSteps, originalSize, processedSize);

          resolve({
            processedImageData,
            processingSteps,
            originalSize,
            processedSize,
            estimatedQuality
          });

        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;

    } catch (error) {
      reject(error);
    }
  });
}

// Image enhancement functions
function enhanceContrast(data: Uint8ClampedArray): void {
  const factor = 1.5; // Contrast factor
  const intercept = 128 * (1 - factor);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, factor * data[i] + intercept)); // Red
    data[i + 1] = Math.max(0, Math.min(255, factor * data[i + 1] + intercept)); // Green
    data[i + 2] = Math.max(0, Math.min(255, factor * data[i + 2] + intercept)); // Blue
  }
}

function adjustBrightness(data: Uint8ClampedArray): void {
  // Calculate average brightness
  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const avgBrightness = totalBrightness / (data.length / 4);

  // Adjust toward optimal brightness (around 180 for text documents)
  const targetBrightness = 180;
  const adjustment = (targetBrightness - avgBrightness) * 0.3;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + adjustment));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment));
  }
}

function removeNoise(data: Uint8ClampedArray, width: number, height: number): void {
  // Simple median filter to remove noise
  const original = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Get surrounding pixels
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push((original[nIdx] + original[nIdx + 1] + original[nIdx + 2]) / 3);
        }
      }

      // Apply median value
      neighbors.sort((a, b) => a - b);
      const median = neighbors[4]; // Middle value

      data[idx] = median;
      data[idx + 1] = median;
      data[idx + 2] = median;
    }
  }
}

function sharpenImage(data: Uint8ClampedArray, width: number, height: number): void {
  // Sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  const original = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      let r = 0, g = 0, b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const nIdx = ((y + ky) * width + (x + kx)) * 4;
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          const kernelValue = kernel[kernelIdx];

          r += original[nIdx] * kernelValue;
          g += original[nIdx + 1] * kernelValue;
          b += original[nIdx + 2] * kernelValue;
        }
      }

      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
    }
  }
}

function convertToHighContrast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to grayscale and apply threshold
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const threshold = gray > 128 ? 255 : 0; // Binary threshold

    data[i] = threshold;     // Red
    data[i + 1] = threshold; // Green
    data[i + 2] = threshold; // Blue
    // Alpha stays the same
  }

  ctx.putImageData(imageData, 0, 0);
}

function calculateQualityScore(
  steps: string[],
  originalSize: { width: number; height: number },
  processedSize: { width: number; height: number }
): number {
  let score = 50; // Base score

  // Add points for processing steps
  score += steps.length * 8;

  // Add points for good resolution
  const totalPixels = processedSize.width * processedSize.height;
  if (totalPixels > 500000) score += 20;
  else if (totalPixels > 200000) score += 10;

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Browser-safe version that works without canvas (for SSR)
 */
export function preprocessImageDataSSR(base64Data: string): string {
  // For server-side, just return the original data
  // In a real implementation, you might use Sharp.js here
  return base64Data;
}