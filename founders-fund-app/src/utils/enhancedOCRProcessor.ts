// Enhanced OCR processor specifically designed for trading dashboard screenshots
// Implements region-based extraction, financial pattern recognition, and confidence scoring

export interface ExtractedFinancialData {
  totalValue?: number;
  unrealizedPNL?: number;
  realizedPNL?: number;
  availableBalance?: number;
  totalTransactions?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  timestamp?: string;
  confidence: number;
}

export class EnhancedOCRProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Enhanced image preprocessing specifically for trading dashboards
  async preprocessTradingDashboard(imageData: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Set optimal size for OCR (maintain aspect ratio)
        const maxWidth = 1600;
        const maxHeight = 1200;
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        this.canvas.width = width;
        this.canvas.height = height;

        // Clear and draw image
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.drawImage(img, 0, 0, width, height);

        // Apply trading dashboard specific enhancements
        this.enhanceFinancialText();
        this.improveNumberContrast();
        this.sharpenTextRegions();

        resolve(this.canvas.toDataURL('image/png'));
      };
      img.src = imageData;
    });
  }

  // Enhance text visibility for financial data
  private enhanceFinancialText(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      // Enhance contrast for text (typical financial UI colors)
      if (luminance < 128) {
        // Darken dark pixels (text)
        data[i] = Math.max(0, r - 30);
        data[i + 1] = Math.max(0, g - 30);
        data[i + 2] = Math.max(0, b - 30);
      } else {
        // Brighten light pixels (background)
        data[i] = Math.min(255, r + 30);
        data[i + 1] = Math.min(255, g + 30);
        data[i + 2] = Math.min(255, b + 30);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  // Improve contrast specifically for numbers and currency symbols
  private improveNumberContrast(): void {
    // Apply unsharp mask for better number recognition
    const originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Create Gaussian blur
    this.ctx.filter = 'blur(1px)';
    this.ctx.drawImage(this.canvas, 0, 0);
    const blurredImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Reset filter and restore original
    this.ctx.filter = 'none';
    this.ctx.putImageData(originalImageData, 0, 0);

    // Apply unsharp mask
    const sharpened = this.unsharpMask(originalImageData, blurredImageData, 1.5, 0.5);
    this.ctx.putImageData(sharpened, 0, 0);
  }

  private unsharpMask(
    original: ImageData,
    blurred: ImageData,
    amount: number,
    threshold: number,
  ): ImageData {
    const result = this.ctx.createImageData(original.width, original.height);

    for (let i = 0; i < original.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const originalPixel = original.data[i + c];
        const blurredPixel = blurred.data[i + c];
        const diff = originalPixel - blurredPixel;

        if (Math.abs(diff) > threshold) {
          result.data[i + c] = Math.min(255, Math.max(0, originalPixel + diff * amount));
        } else {
          result.data[i + c] = originalPixel;
        }
      }
      result.data[i + 3] = original.data[i + 3]; // Alpha
    }

    return result;
  }

  // Sharpen specific regions likely to contain text
  private sharpenTextRegions(): void {
    // Apply edge detection and sharpening to likely text areas
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const sharpened = this.applySharpeningKernel(imageData);
    this.ctx.putImageData(sharpened, 0, 0);
  }

  private applySharpeningKernel(imageData: ImageData): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const result = this.ctx.createImageData(width, height);

    // Sharpening kernel
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += imageData.data[idx] * kernel[ky + 1][kx + 1];
            }
          }

          const idx = (y * width + x) * 4 + c;
          result.data[idx] = Math.min(255, Math.max(0, sum));
        }

        const idx = (y * width + x) * 4 + 3;
        result.data[idx] = imageData.data[idx]; // Alpha
      }
    }

    return result;
  }

  // Extract financial data using enhanced pattern recognition
  extractFinancialData(ocrText: string): ExtractedFinancialData {
    const result: ExtractedFinancialData = { confidence: 0 };
    let totalConfidence = 0;
    let fieldsFound = 0;

    // Enhanced patterns for trading dashboard data
    const patterns = {
      totalValue: [
        /(?:total\s+value|account\s+value|equity)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /\$?([\d,]+(?:\.\d{2})?)\s*(?:total|equity)/i,
      ],
      unrealizedPNL: [
        /(?:unrealized\s+p[n&]l|floating\s+p[n&]l|open\s+p[n&]l)[:\s]*([+-]?\$?[\d,]+(?:\.\d{2})?)/i,
        /([+-]?\$?[\d,]+(?:\.\d{2})?)\s*(?:unrealized|floating)/i,
      ],
      realizedPNL: [
        /(?:realized\s+p[n&]l|closed\s+p[n&]l)[:\s]*([+-]?\$?[\d,]+(?:\.\d{2})?)/i,
        /30d\s+p[n&]l[:\s]*([+-]?\$?[\d,]+(?:\.\d{2})?)/i,
        /([+-]?\$?[\d,]+(?:\.\d{2})?)\s*(?:realized|30d)/i,
      ],
      availableBalance: [
        /(?:available\s+balance|free\s+balance|cash)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
        /\$?([\d,]+(?:\.\d{2})?)\s*(?:available|free)/i,
      ],
      totalTransactions: [
        /(?:total\s+transactions|transactions)[:\s]*(\d{1,3}(?:,\d{3})*)/i,
        /(\d{1,3}(?:,\d{3})*)\s*(?:total|transactions)/i,
      ],
      wins: [/(\d{1,3}(?:,\d{3})*)\s*(?:wins?|w\b)/i, /(?:wins?)[:\s]*(\d{1,3}(?:,\d{3})*)/i],
      losses: [/(\d{1,3}(?:,\d{3})*)\s*(?:losses?|l\b)/i, /(?:losses?)[:\s]*(\d{1,3}(?:,\d{3})*)/i],
      winLossRatio: [
        /(\d{1,3}(?:,\d{3})*)\s*(?:wins?|w)\s*[\/\-]\s*(\d{1,3}(?:,\d{3})*)\s*(?:losses?|l)/i,
        /(\d{1,3}(?:,\d{3})*)\s*w\s*(\d{1,3}(?:,\d{3})*)\s*l/i,
      ],
    };

    // Extract total value
    for (const pattern of patterns.totalValue) {
      const match = ocrText.match(pattern);
      if (match) {
        result.totalValue = this.parseNumber(match[1]);
        totalConfidence += 0.9;
        fieldsFound++;
        break;
      }
    }

    // Extract unrealized PNL
    for (const pattern of patterns.unrealizedPNL) {
      const match = ocrText.match(pattern);
      if (match) {
        result.unrealizedPNL = this.parseNumber(match[1]);
        totalConfidence += 0.8;
        fieldsFound++;
        break;
      }
    }

    // Extract realized PNL
    for (const pattern of patterns.realizedPNL) {
      const match = ocrText.match(pattern);
      if (match) {
        result.realizedPNL = this.parseNumber(match[1]);
        totalConfidence += 0.85;
        fieldsFound++;
        break;
      }
    }

    // Extract available balance
    for (const pattern of patterns.availableBalance) {
      const match = ocrText.match(pattern);
      if (match) {
        result.availableBalance = this.parseNumber(match[1]);
        totalConfidence += 0.8;
        fieldsFound++;
        break;
      }
    }

    // Extract total transactions
    for (const pattern of patterns.totalTransactions) {
      const match = ocrText.match(pattern);
      if (match) {
        result.totalTransactions = parseInt(match[1].replace(/,/g, ''));
        totalConfidence += 0.9;
        fieldsFound++;
        break;
      }
    }

    // Extract wins and losses (try combined pattern first)
    for (const pattern of patterns.winLossRatio) {
      const match = ocrText.match(pattern);
      if (match) {
        result.wins = parseInt(match[1].replace(/,/g, ''));
        result.losses = parseInt(match[2].replace(/,/g, ''));
        totalConfidence += 0.95;
        fieldsFound += 2;
        break;
      }
    }

    // If combined pattern didn't work, try individual patterns
    if (!result.wins) {
      for (const pattern of patterns.wins) {
        const match = ocrText.match(pattern);
        if (match) {
          result.wins = parseInt(match[1].replace(/,/g, ''));
          totalConfidence += 0.8;
          fieldsFound++;
          break;
        }
      }
    }

    if (!result.losses) {
      for (const pattern of patterns.losses) {
        const match = ocrText.match(pattern);
        if (match) {
          result.losses = parseInt(match[1].replace(/,/g, ''));
          totalConfidence += 0.8;
          fieldsFound++;
          break;
        }
      }
    }

    // Calculate win rate if we have both wins and losses
    if (result.wins !== undefined && result.losses !== undefined) {
      const totalTrades = result.wins + result.losses;
      if (totalTrades > 0) {
        result.winRate = Math.round((result.wins / totalTrades) * 100);
        totalConfidence += 0.7;
        fieldsFound++;
      }
    }

    // Extract timestamp
    const timestampPatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4})/i,
    ];

    for (const pattern of timestampPatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        result.timestamp = match[1];
        totalConfidence += 0.6;
        fieldsFound++;
        break;
      }
    }

    // Calculate overall confidence
    result.confidence = fieldsFound > 0 ? (totalConfidence / Math.max(fieldsFound, 8)) * 100 : 0;

    return result;
  }

  // Parse number with various formats ($, commas, +/- signs)
  private parseNumber(str: string): number {
    // Remove currency symbols, spaces, and handle +/- signs
    const cleaned = str.replace(/[\$\s]/g, '');
    const isNegative = cleaned.startsWith('-');
    const numberStr = cleaned.replace(/[+-]/g, '').replace(/,/g, '');
    const number = parseFloat(numberStr);
    return isNegative ? -number : number;
  }

  // Validate extracted data for consistency
  validateFinancialData(data: ExtractedFinancialData): ExtractedFinancialData {
    const validated = { ...data };

    // Check if total value matches available balance + unrealized PNL
    if (validated.totalValue && validated.availableBalance && validated.unrealizedPNL) {
      const expectedTotal = validated.availableBalance + validated.unrealizedPNL;
      const diff = Math.abs(validated.totalValue - expectedTotal);

      if (diff > validated.totalValue * 0.1) {
        // More than 10% difference
        console.warn('Total value validation failed', {
          totalValue: validated.totalValue,
          calculated: expectedTotal,
          difference: diff,
        });
        validated.confidence *= 0.8; // Reduce confidence
      }
    }

    // Check win/loss ratio consistency
    if (validated.wins && validated.losses && validated.totalTransactions) {
      const calculatedTotal = validated.wins + validated.losses;
      if (Math.abs(calculatedTotal - validated.totalTransactions) > 10) {
        console.warn('Win/loss total mismatch', {
          wins: validated.wins,
          losses: validated.losses,
          calculated: calculatedTotal,
          reported: validated.totalTransactions,
        });
        validated.confidence *= 0.9;
      }
    }

    return validated;
  }
}

export default EnhancedOCRProcessor;
