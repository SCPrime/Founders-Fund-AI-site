/**
 * Chart-to-Image Conversion Utility
 * Converts charts (TradingView, Recharts) to PNG images for PDF embedding
 * Supports both client-side canvas rendering and server-side puppeteer
 */

import type { ISeriesApi, IChartApi } from 'lightweight-charts';

export interface ChartImageOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  quality?: number; // 0-1 for JPEG, ignored for PNG
  format?: 'png' | 'jpeg';
}

export interface ChartToImageResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  format: string;
}

/**
 * Convert a DOM element (chart container) to image using html2canvas-like approach
 * This works client-side for Recharts and other React chart libraries
 */
export async function domElementToImage(
  element: HTMLElement,
  options: ChartImageOptions = {}
): Promise<ChartToImageResult> {
  const {
    width = 1200,
    height = 800,
    backgroundColor = '#ffffff',
    quality = 0.95,
    format = 'png',
  } = options;

  // Use html2canvas if available (dynamically imported)
  try {
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      width,
      height,
      backgroundColor,
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
    });

    return canvasToImage(canvas, { format, quality });
  } catch (error) {
    console.error('html2canvas not available, falling back to canvas API:', error);

    // Fallback: create canvas manually
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Try to draw the element (limited support)
    try {
      const svgElements = element.querySelectorAll('svg');
      if (svgElements.length > 0) {
        // Handle SVG charts (Recharts uses SVG)
        await drawSVGToCanvas(svgElements[0] as SVGElement, ctx, width, height);
      } else {
        // Last resort: use foreignObject (has CORS limitations)
        await drawElementViaForeignObject(element, ctx, width, height);
      }
    } catch (err) {
      console.warn('Could not render element to canvas:', err);
    }

    return canvasToImage(canvas, { format, quality });
  }
}

/**
 * Convert TradingView lightweight-charts to image
 * Works with the IChartApi instance
 */
export async function lightweightChartToImage(
  chartApi: IChartApi,
  options: ChartImageOptions = {}
): Promise<ChartToImageResult> {
  const {
    width = 1200,
    height = 800,
    format = 'png',
    quality = 0.95,
  } = options;

  // Get the chart's canvas element
  const chartContainer = (chartApi as any)._private__chartWidget?._element;

  if (!chartContainer) {
    throw new Error('Could not find chart container element');
  }

  // Find canvas elements within the chart
  const canvases = chartContainer.querySelectorAll('canvas');

  if (canvases.length === 0) {
    throw new Error('No canvas elements found in chart');
  }

  // Create a new canvas to composite all layers
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = width;
  compositeCanvas.height = height;
  const ctx = compositeCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw each canvas layer
  canvases.forEach((canvas) => {
    ctx.drawImage(canvas, 0, 0, width, height);
  });

  return canvasToImage(compositeCanvas, { format, quality });
}

/**
 * Convert a canvas element to image data
 */
function canvasToImage(
  canvas: HTMLCanvasElement,
  options: { format?: 'png' | 'jpeg'; quality?: number } = {}
): ChartToImageResult {
  const { format = 'png', quality = 0.95 } = options;
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

  // Get data URL
  const dataUrl = canvas.toDataURL(mimeType, quality);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }

        resolve({
          dataUrl,
          blob,
          width: canvas.width,
          height: canvas.height,
          format: mimeType,
        });
      },
      mimeType,
      quality
    );
  });
}

/**
 * Draw SVG element to canvas
 */
async function drawSVGToCanvas(
  svg: SVGElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Draw element using foreignObject technique
 */
async function drawElementViaForeignObject(
  element: HTMLElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): Promise<void> {
  const data = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          ${element.outerHTML}
        </div>
      </foreignObject>
    </svg>
  `;

  return drawSVGToCanvas(
    new DOMParser().parseFromString(data, 'image/svg+xml').documentElement as any,
    ctx,
    width,
    height
  );
}

/**
 * Server-side chart rendering using Puppeteer
 * This is used in API routes for generating chart images
 */
export async function renderChartServerSide(
  htmlContent: string,
  options: ChartImageOptions = {}
): Promise<Buffer> {
  const puppeteer = await import('puppeteer');

  const {
    width = 1200,
    height = 800,
    format = 'png',
    quality = 95,
  } = options;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });

    // Set content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for charts to render
    await page.waitForTimeout(1000);

    // Take screenshot
    const screenshot = await page.screenshot({
      type: format,
      quality: format === 'jpeg' ? quality : undefined,
      fullPage: false,
    });

    return screenshot as Buffer;
  } finally {
    await browser.close();
  }
}

/**
 * Generate HTML template for server-side chart rendering
 */
export function generateChartHTML(
  chartData: any,
  chartType: 'tradingview' | 'recharts' | 'custom',
  options: {
    title?: string;
    subtitle?: string;
    theme?: 'light' | 'dark';
  } = {}
): string {
  const { title = 'Chart', subtitle = '', theme = 'light' } = options;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'};
          color: ${theme === 'dark' ? '#ffffff' : '#000000'};
        }
        #chart-container {
          width: 1160px;
          height: 760px;
          margin: 0 auto;
        }
        .chart-title {
          text-align: center;
          margin-bottom: 10px;
          font-size: 24px;
          font-weight: bold;
        }
        .chart-subtitle {
          text-align: center;
          margin-bottom: 20px;
          font-size: 14px;
          color: ${theme === 'dark' ? '#aaa' : '#666'};
        }
      </style>
    </head>
    <body>
      ${title ? `<div class="chart-title">${title}</div>` : ''}
      ${subtitle ? `<div class="chart-subtitle">${subtitle}</div>` : ''}
      <div id="chart-container"></div>
      <script>
        const chartData = ${JSON.stringify(chartData)};
        const container = document.getElementById('chart-container');

        ${chartType === 'tradingview' ? generateTradingViewScript() : generateCustomChartScript()}
      </script>
    </body>
    </html>
  `;
}

function generateTradingViewScript(): string {
  return `
    const chart = LightweightCharts.createChart(container, {
      width: 1160,
      height: 760,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        borderColor: '#ccc',
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    if (chartData.candlesticks) {
      series.setData(chartData.candlesticks);
    }

    if (chartData.volume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      volumeSeries.setData(chartData.volume);
    }

    chart.timeScale().fitContent();
  `;
}

function generateCustomChartScript(): string {
  return `
    // Custom chart rendering logic
    console.log('Rendering custom chart with data:', chartData);
  `;
}

/**
 * Utility to capture chart from a URL (useful for external chart services)
 */
export async function captureChartFromURL(
  url: string,
  selector: string = 'body',
  options: ChartImageOptions = {}
): Promise<Buffer> {
  const puppeteer = await import('puppeteer');

  const {
    width = 1200,
    height = 800,
    format = 'png',
    quality = 95,
  } = options;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for specific element if selector provided
    if (selector !== 'body') {
      await page.waitForSelector(selector, { timeout: 10000 });
    }

    // Take screenshot of specific element or full page
    const element = await page.$(selector);

    const screenshot = element
      ? await element.screenshot({
          type: format,
          quality: format === 'jpeg' ? quality : undefined,
        })
      : await page.screenshot({
          type: format,
          quality: format === 'jpeg' ? quality : undefined,
          fullPage: false,
        });

    return screenshot as Buffer;
  } finally {
    await browser.close();
  }
}
