'use client';

import { executeAITool } from '@/lib/aiTools';
import { useFundStore } from '@/store/fundStore';
import { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface ExtractedData {
  founders?: Array<{
    name?: string;
    amount?: number;
    date?: string;
    cls?: string;
  }>;
  investors?: Array<{
    name?: string;
    amount?: number;
    date?: string;
    rule?: string;
    cls?: string;
  }>;
  settings?: Record<string, unknown>;
}

export default function OCRChatBox() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 Hello! I'm your OCR Chat Assistant.\n\n📸 **Upload an image** of your trading dashboard or financial document, and I'll:\n• Extract all financial data automatically\n• Auto-populate calculator fields\n• Answer questions about your portfolio\n• Help with fund calculations\n\nYou can also ask me questions directly!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageModalRef = useRef<HTMLDivElement>(null);
  const { populateContributions, updateSettings } = useFundStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string, imageUrl?: string) => {
    const newMessage: Message = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      imageUrl,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      addMessage('assistant', '❌ Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      addMessage('assistant', '❌ File too large. Maximum size is 10MB.');
      return;
    }

    // Display image
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    addMessage('user', '📸 Uploaded image for OCR processing', imageUrl);

    setIsLoading(true);
    addMessage('assistant', '🔄 Processing image with OCR...');

    try {
      // Process with OCR API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.extractedData) {
        setExtractedData(result.extractedData);

        // Auto-populate calculator fields
        autoPopulateCalculator(result.extractedData);

        addMessage(
          'assistant',
          `✅ **OCR Complete!**\n\n📊 **Extracted Data:**\n` +
            `• Founders: ${result.extractedData.founders?.length || 0}\n` +
            `• Investors: ${result.extractedData.investors?.length || 0}\n` +
            `• Settings: ${result.extractedData.settings ? 'Yes' : 'No'}\n\n` +
            `🎯 **Calculator fields have been auto-populated!**\n\n` +
            `You can now ask me questions about your portfolio or request changes.`,
        );
      } else {
        addMessage(
          'assistant',
          '⚠️ OCR completed but no structured data was extracted. You can still ask questions!',
        );
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      addMessage(
        'assistant',
        `❌ OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try uploading the image again or ask me a question directly.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const autoPopulateCalculator = (data: ExtractedData) => {
    try {
      // Combine founders and investors
      const contributions: Array<{
        name: string;
        date: string;
        amount: number;
        rule: 'net' | 'gross';
        cls: 'founder' | 'investor';
      }> = [];

      if (data.founders && Array.isArray(data.founders)) {
        contributions.push(
          ...data.founders.map((f) => ({
            name: (f.name as string) || 'Founder',
            date: (f.date as string) || new Date().toISOString().split('T')[0],
            amount: typeof f.amount === 'number' ? f.amount : 0,
            rule: 'net' as const,
            cls: 'founder' as const,
          })),
        );
      }

      if (data.investors && Array.isArray(data.investors)) {
        contributions.push(
          ...data.investors.map((i) => ({
            name: (i.name as string) || 'Investor',
            date: (i.date as string) || new Date().toISOString().split('T')[0],
            amount: typeof i.amount === 'number' ? i.amount : 0,
            rule: ((i.rule as string) === 'gross' ? 'gross' : 'net') as 'net' | 'gross',
            cls: 'investor' as const,
          })),
        );
      }

      // Populate contributions
      if (contributions.length > 0) {
        populateContributions(contributions);
      }

      // Update settings if available
      if (data.settings) {
        const settingsUpdates: Record<string, unknown> = {};
        if (data.settings.walletSize) settingsUpdates.walletSize = data.settings.walletSize;
        if (data.settings.realizedProfit)
          settingsUpdates.realizedProfit = data.settings.realizedProfit;
        if (data.settings.moonbagUnreal)
          settingsUpdates.moonbagUnreal = data.settings.moonbagUnreal;
        if (data.settings.mgmtFeePct) settingsUpdates.mgmtFeePct = data.settings.mgmtFeePct;
        if (data.settings.entryFeePct) settingsUpdates.entryFeePct = data.settings.entryFeePct;

        if (Object.keys(settingsUpdates).length > 0) {
          updateSettings(settingsUpdates);
        }
      }
    } catch (error) {
      console.error('Error auto-populating calculator:', error);
      addMessage(
        'assistant',
        '⚠️ Data extracted but failed to auto-populate. You can manually add the data.',
      );
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !uploadedImage) return;

    const userMessage = input.trim() || '📸 [Image uploaded]';
    addMessage('user', userMessage, uploadedImage || undefined);
    setInput('');
    setIsLoading(true);

    try {
      // If there's extracted data, use AI tools to answer
      if (extractedData) {
        const response = await analyzeWithAI(userMessage, extractedData);
        addMessage('assistant', response);
      } else {
        // Generic AI response
        const response = await analyzeWithAI(userMessage);
        addMessage('assistant', response);
      }
    } catch (error) {
      addMessage(
        'assistant',
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeWithAI = async (text: string, context?: ExtractedData): Promise<string> => {
    try {
      // Use AI tools for analysis
      if (text.toLowerCase().includes('snapshot') || text.toLowerCase().includes('current state')) {
        const snapshot = executeAITool('get_snapshot', {}) as Record<string, unknown>;
        return formatSnapshotResponse(snapshot);
      }

      if (text.toLowerCase().includes('validate') || text.toLowerCase().includes('check')) {
        const validation = executeAITool('validate_fund', {}) as Record<string, unknown>;
        return formatValidationResponse(validation);
      }

      // Default response
      return `I understand you're asking about: "${text}"\n\n${
        context
          ? 'I have your extracted OCR data available. Would you like me to:\n• Analyze your portfolio performance?\n• Validate your fund data?\n• Run a simulation?\n• Get a snapshot of current state?'
          : 'Please upload an image first to extract financial data, or ask me a specific question about fund calculations.'
      }`;
    } catch (error) {
      return `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  interface SnapshotSummary {
    totalNetProfit?: number;
    totalContributions?: number;
    totalFees?: number;
  }

  interface SnapshotData {
    summary?: SnapshotSummary;
    contributions?: unknown[];
    results?: unknown[];
  }

  interface ValidationIssue {
    type: string;
    message: string;
  }

  interface ValidationData {
    issues?: ValidationIssue[];
  }

  const formatSnapshotResponse = (snapshot: SnapshotData | null | undefined): string => {
    if (!snapshot) return '❌ Unable to get snapshot.';
    return (
      `📊 **Current Fund Snapshot**\n\n` +
      `• Total Net Profit: $${snapshot.summary?.totalNetProfit?.toLocaleString() || '0'}\n` +
      `• Total Contributions: $${snapshot.summary?.totalContributions?.toLocaleString() || '0'}\n` +
      `• Total Fees: $${snapshot.summary?.totalFees?.toLocaleString() || '0'}\n` +
      `• Contributions: ${snapshot.contributions?.length || 0}`
    );
  };

  const formatValidationResponse = (validation: ValidationData | null | undefined): string => {
    if (!validation) return '❌ Unable to validate.';
    const issues = validation.issues || [];
    if (issues.length === 0) {
      return '✅ **Validation Complete**\n\nNo issues found! Your fund data looks good.';
    }
    return (
      `⚠️ **Validation Results**\n\nFound ${issues.length} issue(s):\n\n` +
      issues.map((issue: ValidationIssue) => `• ${issue.type}: ${issue.message}`).join('\n')
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Close image modal when clicking outside
  useEffect(() => {
    if (!isImageExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (imageModalRef.current && !imageModalRef.current.contains(event.target as Node)) {
        setIsImageExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isImageExpanded]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col bg-gray-900 border border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
        isExpanded ? 'w-[600px] h-[700px]' : 'w-[400px] h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-semibold text-white">OCR Chat Assistant</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            aria-label={isExpanded ? 'Minimize chat' : 'Expand chat'}
          >
            {isExpanded ? (
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🤖</span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
              }`}
            >
              {message.imageUrl && (
                <div className="mb-2 relative">
                  <img
                    src={message.imageUrl}
                    alt="Uploaded"
                    className="max-w-full h-auto rounded cursor-pointer"
                    onClick={() => setIsImageExpanded(true)}
                  />
                  <button
                    onClick={() => setIsImageExpanded(true)}
                    className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded hover:bg-opacity-75 transition-opacity"
                    aria-label="Enlarge image"
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                      />
                    </svg>
                  </button>
                </div>
              )}
              <div className="whitespace-pre-line text-sm">{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-300 text-sm">👤</span>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2 mb-2">
          <label
            htmlFor="ocr-chat-file-input"
            className="p-2 hover:bg-gray-700 rounded cursor-pointer transition-colors"
            title="Upload image"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </label>
          <input
            id="ocr-chat-file-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            aria-label="Upload image for OCR processing"
          />
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything or upload an image..."
            disabled={isLoading}
            className="flex-1 p-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={(!input.trim() && !uploadedImage) || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Image Modal */}
      {isImageExpanded && uploadedImage && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div ref={imageModalRef} className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setIsImageExpanded(false)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-75 transition-opacity z-10"
              aria-label="Close image"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={uploadedImage}
              alt="Expanded view"
              className="max-w-full max-h-[90vh] rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
