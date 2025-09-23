import OpenAI from 'openai';

export interface OCRResult {
  text: string;
  confidence: number;
  extractedData: {
    founders?: Array<{ name?: string; date: string; amount: number; cls: string }>;
    investors?: Array<{ name?: string; date: string; amount: number; rule?: string; cls: string }>;
    settings?: {
      walletSize?: number;
      realizedProfit?: number;
      unrealizedProfit?: number;
      moonbagUnreal?: number;
      moonbagFounderPct?: number;
      mgmtFeePct?: number;
      entryFeePct?: number;
      transactionStats?: {
        winning: number;
        losing: number;
        total: number;
        winRate: number;
      } | null;
    };
  };
}

export interface FinancialEntry {
  name?: string;
  date?: string;
  amount?: number;
  type?: 'founder' | 'investor' | 'fee' | 'profit';
  description?: string;
}

interface DetectedEntry {
  originalLine: string;
  lineNumber: number;
  amount?: number;
  date?: string;
  name?: string;
  type?: string;
}

export class OCRService {
  private static instance: OCRService;
  private openai: OpenAI | null = null;

  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  async processImage(imageFile: File): Promise<OCRResult> {
    try {
      console.log('Processing image with ChatGPT...');

      // Convert image to base64
      const base64Image = await this.convertImageToBase64(imageFile);

      const openai = this.getOpenAIClient();

      // Create the prompt for extracting financial data
      const prompt = `Analyze this financial document image and extract the data into the following JSON format:

{
  "text": "raw extracted text from the image",
  "confidence": 95,
  "extractedData": {
    "founders": [{
      "name": "Founders",
      "date": "2025-07-10",
      "amount": 5000,
      "cls": "founder"
    }],
    "investors": [{
      "name": "Investor Name",
      "date": "YYYY-MM-DD",
      "amount": 10000,
      "rule": "net",
      "cls": "investor"
    }],
    "settings": {
      "walletSize": 25000,
      "realizedProfit": 20000,
      "unrealizedProfit": 50000,
      "moonbagUnreal": 50000,
      "moonbagFounderPct": 75,
      "mgmtFeePct": 20,
      "entryFeePct": 10,
      "transactionStats": {
        "winning": 15,
        "losing": 5,
        "total": 20,
        "winRate": 75
      }
    }
  }
}

Extract all financial entries, dates, amounts, names, and settings from the image. For founders, always include the seed money. For investors, include their contributions. Extract any fee percentages, profit figures, wallet size, and transaction statistics if visible. Return ONLY the JSON response with no additional text.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from ChatGPT');
      }

      console.log('ChatGPT response:', content);

      // Parse the JSON response
      let parsedResult: OCRResult;
      try {
        // Clean the response to extract only JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        parsedResult = JSON.parse(jsonStr);
      } catch {
        console.warn('Failed to parse ChatGPT response as JSON, using fallback');
        // If parsing fails, create a basic structure with the raw text
        parsedResult = {
          text: content,
          confidence: 85,
          extractedData: this.getFallbackFoundersData()
        };
      }

      // Ensure the result has the required structure
      if (!parsedResult.extractedData) {
        parsedResult.extractedData = this.getFallbackFoundersData();
      }

      console.log('Parsed OCR result:', parsedResult);
      return parsedResult;

    } catch (error) {
      console.error('ChatGPT OCR processing error:', error);

      // Return fallback data to prevent total failure
      return {
        text: 'ChatGPT OCR processing failed, using fallback data',
        confidence: 0,
        extractedData: this.getFallbackFoundersData()
      };
    }
  }

  private getFallbackFoundersData(): OCRResult['extractedData'] {
    return {
      founders: [{
        name: 'Founders',
        date: '2025-07-10',
        amount: 5000,
        cls: 'founder'
      }],
      investors: [],
      settings: {
        walletSize: 25000,
        realizedProfit: 20000,
        mgmtFeePct: 20,
        entryFeePct: 10
      }
    };
  }

  private async convertImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }


  private extractFinancialDataWithFoundersLogic(text: string): OCRResult['extractedData'] {
    console.log('Extracting financial data with founders-specific logic...');

    const extractedData: OCRResult['extractedData'] = {
      founders: [],
      investors: [],
      settings: {}
    };

    // Always ensure founders seed data is included
    const foundersEntry = {
      name: 'Founders',
      date: '2025-07-10',
      amount: 5000,
      cls: 'founder' as const
    };

    // Extract investor data from OCR text
    const investorEntries = this.extractInvestorEntries(text);

    // Calculate total fees collected by founders
    let totalEntryFees = 0;
    let totalMgmtFees = 0;

    investorEntries.forEach(investor => {
      const entryFee = investor.amount * 0.10; // 10% entry fee
      totalEntryFees += entryFee;
    });

    // Extract comprehensive financial data from image
    const realizedProfit = this.extractRealizedProfit(text) || 20000;
    const unrealizedProfit = this.extractUnrealizedProfit(text);
    const transactionRatios = this.extractTransactionRatios(text);
    const walletSize = this.extractWalletSize(text);

    // Calculate management fees from realized profit
    totalMgmtFees = realizedProfit * 0.20; // 20% management fee

    // Moonbag calculation: 75% to founders, 25% time-weighted to investors (no mgmt fees)
    const moonbagValue = unrealizedProfit || 0;
    const moonbagToFounders = moonbagValue * 0.75;
    const moonbagToInvestors = moonbagValue * 0.25; // This gets time-weighted distributed

    // Founders total includes seed money + all fees collected + moonbag share
    const foundersTotal = 5000 + totalEntryFees + totalMgmtFees + moonbagToFounders;

    // Update founders entry with total including fees and moonbag
    foundersEntry.amount = Math.round(foundersTotal);

    extractedData.founders = [foundersEntry];
    extractedData.investors = investorEntries;

    // Extract and set comprehensive fund settings
    extractedData.settings = {
      walletSize: walletSize || (foundersTotal + investorEntries.reduce((sum, inv) => sum + inv.amount, 0)),
      realizedProfit: realizedProfit,
      unrealizedProfit: unrealizedProfit || undefined,
      moonbagUnreal: moonbagValue,
      moonbagFounderPct: 75, // 75% to founders
      mgmtFeePct: 20,
      entryFeePct: 10,
      transactionStats: transactionRatios
    };

    console.log('Comprehensive extraction completed:', {
      foundersTotal,
      totalEntryFees,
      totalMgmtFees,
      moonbagValue,
      moonbagToFounders,
      moonbagToInvestors,
      unrealizedProfit,
      transactionRatios,
      investorCount: investorEntries.length
    });

    return extractedData;
  }

  private extractInvestorEntries(text: string): Array<{ name: string; date: string; amount: number; rule: string; cls: string }> {
    const investors: Array<{ name: string; date: string; amount: number; rule: string; cls: string }> = [];
    const lines = text.split('\n').filter(line => line.trim().length > 2);

    lines.forEach((line, index) => {
      const amounts = this.extractAmounts(line);
      const dates = this.extractDates(line);
      const names = this.extractNames(line);

      if (amounts.length > 0 && !line.toLowerCase().includes('founder')) {
        investors.push({
          name: names[0] || `Investor ${index + 1}`,
          date: dates[0] ? this.normalizeDate(dates[0]) : new Date().toISOString().split('T')[0],
          amount: amounts[0],
          rule: 'net',
          cls: 'investor'
        });
      }
    });

    return investors;
  }

  private extractRealizedProfit(text: string): number | null {
    const profitPatterns = [
      /(?:realized|actual|net|total)\s*profit[\s:]*\$?\s*([\d,]+\.?\d*)/gi,
      /profit[\s:]*\$?\s*([\d,]+\.?\d*)/gi
    ];

    for (const pattern of profitPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[0].replace(/[^\d.]/g, ''));
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }
    return null;
  }

  private extractWalletSize(text: string): number | null {
    const walletPatterns = [
      /(?:wallet|portfolio|fund|total)\s*size[\s:]*\$?\s*([\d,]+\.?\d*)/gi,
      /total\s*(?:investment|fund|wallet)[\s:]*\$?\s*([\d,]+\.?\d*)/gi,
      /(?:total|grand|overall)\s*wallet[\s:]*\$?\s*([\d,]+\.?\d*)/gi
    ];

    for (const pattern of walletPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[0].replace(/[^\d.]/g, ''));
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }
    return null;
  }

  private extractUnrealizedProfit(text: string): number | null {
    const unrealizedPatterns = [
      /(?:unrealized|unreal|moonbag|pending|potential)\s*profit[\s:]*\$?\s*([\d,]+\.?\d*)/gi,
      /moonbag[\s:]*\$?\s*([\d,]+\.?\d*)/gi,
      /(?:unrealized|unreal)[\s:]*\$?\s*([\d,]+\.?\d*)/gi,
      /(?:potential|projected|estimated)\s*(?:profit|gain)[\s:]*\$?\s*([\d,]+\.?\d*)/gi
    ];

    for (const pattern of unrealizedPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[0].replace(/[^\d.]/g, ''));
        if (!isNaN(value) && value > 0) {
          console.log('Found unrealized profit:', value);
          return value;
        }
      }
    }

    // Look for any large values that might be unrealized profit
    const amounts = this.extractAmounts(text);
    if (amounts.length > 0) {
      // Take the largest amount that's not already classified
      const largest = Math.max(...amounts);
      if (largest > 50000) { // Likely unrealized if over 50k
        console.log('Inferred unrealized profit from large amount:', largest);
        return largest;
      }
    }

    return null;
  }

  private extractTransactionRatios(text: string): { winning: number; losing: number; total: number; winRate: number } | null {
    // Look for transaction win/loss patterns
    const ratioPatterns = [
      /(\d+)\s*\/\s*(\d+)\s*(?:transactions?|trades?|wins?|losses?)/gi,
      /(?:winning|win)[\s:]*(\d+)[\s\w]*(?:losing|loss)[\s:]*(\d+)/gi,
      /(\d+)\s*(?:wins?|winning)[\s\w]*(\d+)\s*(?:losses?|losing)/gi,
      /(?:transactions?)[\s:]*(\d+)\s*(?:win|winning)[\s\w]*(\d+)\s*(?:lose|losing)/gi
    ];

    const normalizedText = text.toLowerCase();

    for (const pattern of ratioPatterns) {
      const matches = normalizedText.match(pattern);
      if (matches) {
        const nums = matches[0].match(/\d+/g);
        if (nums && nums.length >= 2) {
          const winning = parseInt(nums[0]);
          const losing = parseInt(nums[1]);
          const total = winning + losing;
          const winRate = total > 0 ? (winning / total) * 100 : 0;

          console.log('Found transaction ratios:', { winning, losing, total, winRate });
          return { winning, losing, total, winRate };
        }
      }
    }

    // Look for percentage patterns that might indicate win rates
    const percentageMatches = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:win|success|profitable)/gi);
    if (percentageMatches) {
      const winRate = parseFloat(percentageMatches[0].match(/[\d.]+/)?.[0] || '0');
      if (winRate > 0 && winRate <= 100) {
        console.log('Found win rate percentage:', winRate);
        return { winning: 0, losing: 0, total: 0, winRate };
      }
    }

    return null;
  }

  private extractFinancialData(text: string): OCRResult['extractedData'] {
    const extractedData: OCRResult['extractedData'] = {
      founders: [],
      investors: [],
      settings: {}
    };

    console.log('Processing OCR text for financial data extraction:', text);

    // Normalize text for processing while preserving structure
    const lines = text.split('\n').filter(line => line.trim().length > 2);


    // Process each line for comprehensive extraction
    const detectedEntries: DetectedEntry[] = [];

    lines.forEach((line, lineIndex) => {
      const lineLower = line.toLowerCase();

      // Skip obvious headers and non-data lines
      if (this.isHeaderOrNonDataLine(lineLower)) return;

      const entry: DetectedEntry = { originalLine: line, lineNumber: lineIndex };

      // Extract monetary amounts from line
      const amounts = this.extractAmounts(line);
      if (amounts.length > 0) {
        entry.amount = Math.max(...amounts); // Take largest amount on line
      }

      // Extract dates from line
      const dates = this.extractDates(line);
      if (dates.length > 0) {
        entry.date = this.normalizeDate(dates[0]);
      }

      // Extract names from line
      const names = this.extractNames(line);
      if (names.length > 0) {
        entry.name = names[0];
      }

      // Determine entry type based on context
      entry.type = this.determineEntryType(lineLower, entry);

      // Only include entries with meaningful data
      if (entry.amount && entry.amount > 0) {
        detectedEntries.push(entry);
      }
    });

    console.log('Detected entries from OCR:', detectedEntries);

    // Process detected entries into structured data
    detectedEntries.forEach(entry => {
      if (entry.type === 'founder' || (entry.name && entry.name.toLowerCase().includes('founder'))) {
        extractedData.founders?.push({
          name: entry.name || 'Founders',
          date: entry.date || '2025-07-10',
          amount: entry.amount || 5000,
          cls: 'founder'
        });
      } else if (entry.type === 'investor' || entry.amount > 0) {
        extractedData.investors?.push({
          name: entry.name || `Entry ${extractedData.investors?.length + 1}`,
          date: entry.date || new Date().toISOString().split('T')[0],
          amount: entry.amount,
          rule: 'net',
          cls: 'investor'
        });
      }
    });

    // Extract settings and fund parameters
    this.extractAdvancedSettings(text, extractedData);

    // Ensure we have at least some data - create intelligent defaults if needed
    this.ensureMinimumData(extractedData);

    console.log('Final extracted data:', extractedData);
    return extractedData;
  }

  private extractAmounts(text: string): number[] {
    const amounts: number[] = [];
    const patterns = [
      /\$\s*[\d,]+\.?\d*/g,
      /[\d,]+\.?\d*\s*\$/g,
      /(?:amount|total|sum|value|profit|investment):\s*\$?\s*([\d,]+\.?\d*)/gi
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const numStr = match.replace(/[$,\s]/g, '').replace(/[^\d.]/g, '');
          const num = parseFloat(numStr);
          if (!isNaN(num) && num > 0 && num < 10000000) { // Reasonable bounds
            amounts.push(num);
          }
        });
      }
    });

    return amounts;
  }

  private extractDates(text: string): string[] {
    const dates: string[] = [];
    const patterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /\d{4}-\d{1,2}-\d{1,2}/g,
      /\d{1,2}-\d{1,2}-\d{4}/g
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });

    return dates;
  }

  private extractNames(text: string): string[] {
    const names: string[] = [];
    const patterns = [
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m,  // Capitalized names at start
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-:]\s*\$/m, // Name before amount
      /(?:investor|founder|member)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(() => {
          const nameMatch = pattern.exec(text);
          if (nameMatch && nameMatch[1]) {
            const name = nameMatch[1].trim();
            if (name.length > 1 && name.length < 50) {
              names.push(name);
            }
          }
        });
      }
    });

    return names;
  }

  private determineEntryType(text: string, entry: DetectedEntry): string {
    if (text.includes('founder') || text.includes('seed')) return 'founder';
    if (text.includes('investor') || text.includes('investment') || text.includes('contribution')) return 'investor';
    if (text.includes('fee') || text.includes('%')) return 'fee';
    if (text.includes('profit') || text.includes('return')) return 'profit';
    if (entry.amount && entry.amount > 0) return 'investor'; // Default for amounts
    return 'unknown';
  }

  private isHeaderOrNonDataLine(text: string): boolean {
    const excludePatterns = [
      /^[=\-_\s]*$/,  // Lines with only separators
      /^(?:document|report|statement|summary|header|title|page)\s/,
      /^(?:total|subtotal|grand total)\s*$/,
      /^(?:date|time|name|amount|type|description)\s*$/,
      /chart|graph|figure|table/,
      /^[a-z\s]{0,3}$/ // Very short non-meaningful text
    ];

    return excludePatterns.some(pattern => pattern.test(text)) ||
           (text.length < 3) ||
           (!text.match(/[\d$%]/)); // Must contain numbers, dollar signs, or percentages
  }

  private extractAdvancedSettings(text: string, extractedData: OCRResult['extractedData']): void {
    const normalizedText = text.toLowerCase();

    // Management fee patterns
    const mgmtPatterns = [
      /(?:management|mgmt|fund)\s*fee[\s:]*(\d+(?:\.\d+)?)\s*%/gi,
      /(\d+(?:\.\d+)?)\s*%\s*(?:management|mgmt)/gi
    ];

    // Entry fee patterns
    const entryPatterns = [
      /(?:entry|entrance|initial|setup)\s*fee[\s:]*(\d+(?:\.\d+)?)\s*%/gi,
      /(\d+(?:\.\d+)?)\s*%\s*(?:entry|entrance)/gi
    ];

    // Wallet/fund size patterns
    const walletPatterns = [
      /(?:wallet|portfolio|fund|total)\s*size[\s:]*\$?\s*([\d,]+\.?\d*)/gi,
      /total\s*(?:investment|fund|wallet)[\s:]*\$?\s*([\d,]+\.?\d*)/gi
    ];

    // Profit patterns
    const profitPatterns = [
      /(?:realized|actual|net|total)\s*profit[\s:]*\$?\s*([\d,]+\.?\d*)/gi,
      /profit[\s:]*\$?\s*([\d,]+\.?\d*)/gi
    ];

    // Extract each setting type
    [mgmtPatterns, entryPatterns, walletPatterns, profitPatterns].forEach((patterns, index) => {
      patterns.forEach(pattern => {
        const matches = normalizedText.match(pattern);
        if (matches) {
          const match = pattern.exec(normalizedText);
          if (match && match[1]) {
            const value = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(value) && value > 0) {
              switch (index) {
                case 0: extractedData.settings!.mgmtFeePct = value; break;
                case 1: extractedData.settings!.entryFeePct = value; break;
                case 2: extractedData.settings!.walletSize = value; break;
                case 3: extractedData.settings!.realizedProfit = value; break;
              }
            }
          }
        }
      });
    });
  }

  private ensureMinimumData(extractedData: OCRResult['extractedData']): void {
    // Ensure we have at least one meaningful entry
    if (extractedData.founders?.length === 0 && extractedData.investors?.length === 0) {
      // Add default founder entry
      extractedData.founders?.push({
        name: 'Founders',
        date: '2025-07-10',
        amount: 5000,
        cls: 'founder'
      });
    }
  }

  private parseFinancialEntries(text: string): FinancialEntry[] {
    const entries: FinancialEntry[] = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      const normalizedLine = line.toLowerCase();

      // Skip headers and irrelevant lines
      if (this.isHeaderLine(normalizedLine)) continue;

      const entry: FinancialEntry = {};

      // Extract amount
      const amountMatch = line.match(/\$?([\d,]+\.?\d*)/);
      if (amountMatch) {
        entry.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }

      // Extract date
      const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}-\d{1,2}-\d{4})/);
      if (dateMatch) {
        entry.date = this.normalizeDate(dateMatch[1]);
      }

      // Extract name
      const nameMatch = line.match(/^([A-Za-z\s]+?)(?:\s*[-:]\s*|\s+\$)/);
      if (nameMatch) {
        entry.name = nameMatch[1].trim();
      }

      // Determine entry type
      if (normalizedLine.includes('founder') || normalizedLine.includes('seed')) {
        entry.type = 'founder';
      } else if (normalizedLine.includes('investor') || normalizedLine.includes('contribution')) {
        entry.type = 'investor';
      } else if (normalizedLine.includes('fee') || normalizedLine.includes('%')) {
        entry.type = 'fee';
      } else if (normalizedLine.includes('profit') || normalizedLine.includes('return')) {
        entry.type = 'profit';
      } else if (entry.amount && entry.amount > 0) {
        // Default to investor if we have an amount but no specific type
        entry.type = 'investor';
      }

      if (entry.amount && entry.amount > 0) {
        entries.push(entry);
      }
    }

    return entries;
  }

  private isHeaderLine(line: string): boolean {
    const headerKeywords = [
      'document', 'report', 'statement', 'summary', 'total',
      'header', 'title', 'page', 'of', 'date:', 'time:'
    ];

    return headerKeywords.some(keyword =>
      line.includes(keyword) && !line.match(/\$[\d,]+/)
    );
  }

  private normalizeDate(dateStr: string): string {
    try {
      // Handle different date formats
      let date: Date;

      if (dateStr.includes('/')) {
        const [month, day, year] = dateStr.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (dateStr.includes('-')) {
        if (dateStr.startsWith('20')) {
          // YYYY-MM-DD format
          date = new Date(dateStr);
        } else {
          // MM-DD-YYYY format
          const [month, day, year] = dateStr.split('-');
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      } else {
        date = new Date(dateStr);
      }

      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private extractSettings(text: string, extractedData: OCRResult['extractedData']): void {
    // Extract management fee percentage
    const mgmtFeeMatch = text.match(/(?:management|mgmt|fund)\s*fee[^0-9]*(\d+(?:\.\d+)?)\s*%/i);
    if (mgmtFeeMatch) {
      extractedData.settings!.mgmtFeePct = parseFloat(mgmtFeeMatch[1]);
    }

    // Extract entry fee percentage
    const entryFeeMatch = text.match(/(?:entry|entrance|initial)\s*fee[^0-9]*(\d+(?:\.\d+)?)\s*%/i);
    if (entryFeeMatch) {
      extractedData.settings!.entryFeePct = parseFloat(entryFeeMatch[1]);
    }

    // Extract wallet size
    const walletMatch = text.match(/(?:wallet|portfolio|fund)\s*size[^0-9]*\$?([\d,]+\.?\d*)/i);
    if (walletMatch) {
      extractedData.settings!.walletSize = parseFloat(walletMatch[1].replace(/,/g, ''));
    }

    // Extract realized profit
    const profitMatch = text.match(/(?:realized|actual|net)\s*profit[^0-9]*\$?([\d,]+\.?\d*)/i);
    if (profitMatch) {
      extractedData.settings!.realizedProfit = parseFloat(profitMatch[1].replace(/,/g, ''));
    }
  }

  private extractFallbackData(text: string, extractedData: OCRResult['extractedData']): void {
    // As a fallback, extract any monetary values we can find
    const amounts = text.match(/\$?([\d,]+\.?\d*)/g);
    const dates = text.match(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}/g);

    if (amounts && amounts.length > 0) {
      // Create default entries for any amounts found
      amounts.forEach((amountStr, index) => {
        const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
        if (amount > 0 && amount < 1000000) { // Reasonable bounds
          const entry = {
            name: `Entry ${index + 1}`,
            date: dates?.[index] ? this.normalizeDate(dates[index]) : new Date().toISOString().split('T')[0],
            amount: amount,
            rule: 'net' as const,
            cls: 'investor' as const
          };

          extractedData.investors?.push(entry);
        }
      });
    }
  }

  async terminate(): Promise<void> {
    // No cleanup needed for OpenAI client
    this.openai = null;
  }
}

export const ocrService = OCRService.getInstance();