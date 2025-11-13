/**
 * OCR Chat Box Component
 *
 * Claude-style chat interface with integrated image upload for OCR processing
 * Features:
 * - Image upload directly in chat
 * - Expand/enlarge buttons for images
 * - Auto-population of calculator fields
 * - Direct querying with OCR context
 */

'use client';

import { executeAITool } from '@/lib/aiTools';
import { useAllocationStore } from '@/store/allocationStore';
import { useFundStore } from '@/store/fundStore';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  ocrData?: Record<string, unknown>;
  confidence?: number;
}

interface OCRChatBoxProps {
  onMessage?: (message: Message) => void;
  onOCRComplete?: (data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  onAutoPopulate?: (data: Record<string, unknown>) => void;
  className?: string;
}

export default function OCRChatBox({
  onMessage,
  onOCRComplete,
  onError: _onError,
  onAutoPopulate,
  className = '',
}: OCRChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 Hello! I'm your OCR-powered AI assistant.\n\n📸 **Upload an image** of your trading dashboard or financial document, and I'll:\n• Extract all financial data automatically\n• Auto-populate calculator fields\n• Answer questions about your fund\n• Run calculations and simulations\n\n💬 You can also ask me questions directly!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { addContribution, updateWalletSize, updateUnrealizedPnl } = useAllocationStore();
  const { updateSettings } = useFundStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const addMessage = useCallback(
    (
      role: 'user' | 'assistant',
      content: string,
      imageUrl?: string,
      ocrData?: Record<string, unknown>,
      confidence?: number,
    ) => {
      const newMessage: Message = {
        id: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        timestamp: new Date(),
        imageUrl,
        ocrData,
        confidence,
      };
      setMessages((prev) => [...prev, newMessage]);
      onMessage?.(newMessage);
    },
    [onMessage],
  );

  const processImage = async (file: File) => {
    setIsProcessingImage(true);
    const imageUrl = URL.createObjectURL(file);

    // Add user message with image
    addMessage('user', `📸 Uploaded image: ${file.name}`, imageUrl);

    try {
      // Process with OCR API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.status}`);
      }

      const result = await response.json();

      // Extract data
      const extractedData: Record<string, unknown> = {
        walletSize: result.walletSize,
        unrealized: result.unrealized,
        ocrText: result.ocrText,
      };

      // Auto-populate calculator fields
      if (result.walletSize && Number(result.walletSize) > 0) {
        updateWalletSize(Number(result.walletSize));
      }
      if (result.unrealized !== undefined) {
        updateUnrealizedPnl(Number(result.unrealized));
      }

      // Try to extract more detailed data using enhanced OCR
      try {
        const enhancedResponse = await fetch('/api/simple-ocr', {
          method: 'POST',
          body: formData,
        });

        if (enhancedResponse.ok) {
          const enhancedResult = await enhancedResponse.json();

          // Merge enhanced data
          Object.assign(extractedData, enhancedResult.extractedData || {});

          // Auto-populate contributions
          if (
            enhancedResult.extractedData?.founders &&
            Array.isArray(enhancedResult.extractedData.founders)
          ) {
            enhancedResult.extractedData.founders.forEach((f: Record<string, unknown>) => {
              addContribution({
                name: (typeof f.name === 'string' ? f.name : 'Founders') || 'Founders',
                ts:
                  (typeof f.date === 'string' ? f.date : new Date().toISOString().split('T')[0]) ||
                  new Date().toISOString().split('T')[0],
                amount: Number(f.amount) || 0,
                owner: 'founders',
                type: f.rule === 'gross' ? 'founders_entry_fee' : 'seed',
                earnsDollarDaysThisWindow: true,
              });
            });
          }

          if (
            enhancedResult.extractedData?.investors &&
            Array.isArray(enhancedResult.extractedData.investors)
          ) {
            enhancedResult.extractedData.investors.forEach((i: Record<string, unknown>) => {
              addContribution({
                name: (typeof i.name === 'string' ? i.name : 'Investor') || 'Investor',
                ts:
                  (typeof i.date === 'string' ? i.date : new Date().toISOString().split('T')[0]) ||
                  new Date().toISOString().split('T')[0],
                amount: Number(i.amount) || 0,
                owner: 'investor',
                type: 'investor_contribution',
                earnsDollarDaysThisWindow: true,
              });
            });
          }

          // Update settings if available
          if (enhancedResult.extractedData?.settings) {
            const settings = enhancedResult.extractedData.settings as Record<string, unknown>;
            const settingsUpdates: Record<string, number> = {};

            if (settings.walletSize && Number(settings.walletSize) > 0) {
              settingsUpdates.walletSize = Number(settings.walletSize);
            }
            if (settings.realizedProfit && Number(settings.realizedProfit) > 0) {
              settingsUpdates.realizedProfit = Number(settings.realizedProfit);
            }
            if (settings.unrealizedProfit && Number(settings.unrealizedProfit) > 0) {
              settingsUpdates.moonbagUnreal = Number(settings.unrealizedProfit);
            }

            if (Object.keys(settingsUpdates).length > 0) {
              updateSettings(settingsUpdates);
            }
          }

          // Call onAutoPopulate callback if provided
          if (onAutoPopulate) {
            onAutoPopulate(enhancedResult.extractedData);
          }

          // Add assistant response with extracted data
          let responseText = '✅ **OCR Processing Complete!**\n\n';
          responseText += `📊 **Extracted Data:**\n`;

          if (result.walletSize) {
            responseText += `• Wallet Size: $${Number(result.walletSize).toLocaleString()}\n`;
          }
          if (result.unrealized !== undefined) {
            responseText += `• Unrealized P/L: $${Number(result.unrealized).toLocaleString()}\n`;
          }

          if (enhancedResult.extractedData?.founders?.length) {
            responseText += `• Founders: ${enhancedResult.extractedData.founders.length} entries\n`;
          }
          if (enhancedResult.extractedData?.investors?.length) {
            responseText += `• Investors: ${enhancedResult.extractedData.investors.length} entries\n`;
          }

          responseText += `\n🚀 **Auto-populated calculator fields!** Check the Calculator tab to see the results.`;

          addMessage(
            'assistant',
            responseText,
            undefined,
            enhancedResult.extractedData,
            enhancedResult.confidence,
          );
          onOCRComplete?.(enhancedResult.extractedData);
        } else {
          // Fallback to basic OCR result
          let responseText = '✅ **OCR Processing Complete!**\n\n';
          responseText += `📊 **Extracted Data:**\n`;
          if (result.walletSize) {
            responseText += `• Wallet Size: $${Number(result.walletSize).toLocaleString()}\n`;
          }
          if (result.unrealized !== undefined) {
            responseText += `• Unrealized P/L: $${Number(result.unrealized).toLocaleString()}\n`;
          }
          responseText += `\n🚀 **Auto-populated calculator fields!**`;

          addMessage('assistant', responseText, undefined, extractedData);
          onOCRComplete?.(extractedData);
        }
      } catch {
        // Fallback to basic OCR
        let responseText = '✅ **Basic OCR Complete!**\n\n';
        responseText += `📊 **Extracted:**\n`;
        if (result.walletSize) {
          responseText += `• Wallet Size: $${Number(result.walletSize).toLocaleString()}\n`;
        }
        if (result.unrealized !== undefined) {
          responseText += `• Unrealized P/L: $${Number(result.unrealized).toLocaleString()}\n`;
        }
        responseText += `\n🚀 **Auto-populated calculator fields!**`;

        addMessage('assistant', responseText, undefined, extractedData);
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      addMessage(
        'assistant',
        `❌ OCR Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Use AI tools to process query
      let response = '';

      if (
        userMessage.toLowerCase().includes('analyze') ||
        userMessage.toLowerCase().includes('what') ||
        userMessage.toLowerCase().includes('show')
      ) {
        // Use get_snapshot tool
        try {
          const snapshot = executeAITool('get_snapshot', {}) as Record<string, unknown>;
          const summary = snapshot.summary as Record<string, unknown> | undefined;
          const results = snapshot.results as unknown[] | undefined;
          response = '📊 **Current Fund Snapshot:**\n\n';
          response += `• Total Net Profit: $${typeof summary?.totalNetProfit === 'number' ? summary.totalNetProfit.toLocaleString() : '0'}\n`;
          response += `• Total Contributions: $${typeof summary?.totalContributions === 'number' ? summary.totalContributions.toLocaleString() : '0'}\n`;
          if (Array.isArray(results) && results.length > 0) {
            response += `• Participants: ${results.length}\n`;
          }
        } catch {
          response =
            'I can help you analyze your fund data. Try asking about specific metrics or run a calculation first.';
        }
      } else if (
        userMessage.toLowerCase().includes('simulate') ||
        userMessage.toLowerCase().includes('what if')
      ) {
        response =
          '🎯 To run a simulation, I can help you test different scenarios. What would you like to simulate?';
      } else {
        // General AI response
        response = `I understand you're asking: "${userMessage}"\n\n`;
        response += 'I can help you with:\n';
        response += '• Analyzing fund data\n';
        response += '• Running simulations\n';
        response += '• Validating calculations\n';
        response += '• Answering questions about your portfolio\n\n';
        response += 'Try asking: "Show me the current fund snapshot" or "Analyze the portfolio"';
      }

      addMessage('assistant', response);
    } catch (error) {
      addMessage(
        'assistant',
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 ${className}`}
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
              }`}
            >
              {/* Image Display */}
              {message.imageUrl && (
                <div className="mb-2 relative group">
                  <img
                    src={message.imageUrl}
                    alt="Uploaded"
                    className="max-w-full max-h-64 rounded cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setExpandedImage(message.imageUrl!)}
                  />
                  <button
                    onClick={() => setExpandedImage(message.imageUrl!)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Expand image"
                  >
                    🔍
                  </button>
                </div>
              )}

              {/* Message Content */}
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>

              {/* OCR Data Summary */}
              {message.ocrData && (
                <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
                  {message.confidence && <div>Confidence: {Math.round(message.confidence)}%</div>}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {isProcessingImage && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin">⏳</div>
                <span>Processing image with OCR...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2 items-end">
          {/* Image Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isProcessingImage}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Upload image"
          >
            📸
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload image for OCR processing"
            title="Upload image"
          />

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything or upload an image..."
            disabled={isLoading || isProcessingImage}
            rows={1}
            className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isProcessingImage}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="Send message"
          >
            ➤
          </button>
        </div>
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={expandedImage}
              alt="Expanded"
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
