'use client';

import { useFundStore } from '@/store/fundStore';
import { useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string; // Base64 data URL
  extractedData?: ExtractedData;
}

interface ExtractedData {
  founders?: Array<{ name?: string; date: string; amount: number }>;
  investors?: Array<{ name?: string; date: string; amount: number }>;
  settings?: {
    walletSize?: number;
    realizedProfit?: number;
    moonbagUnreal?: number;
    mgmtFeePct?: number;
    entryFeePct?: number;
    winStart?: string;
    winEnd?: string;
  };
  confidence?: number;
}

interface ClaudeChatBoxProps {
  onApplyData?: (data: ExtractedData) => void;
}

export default function ClaudeChatBox({ onApplyData }: ClaudeChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your AI assistant powered by Claude and GPT-4o Vision. I can help you:

• Extract financial data from images (95-98% accuracy)
• Analyze trading dashboards and PnL statements
• Auto-populate the calculator with founders and investors
• Answer questions about your allocation calculations

Upload an image by clicking the 📎 button, dragging & dropping, or pasting (Ctrl+V)!`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const fundStore = useFundStore();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle paste events for image upload
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            await handleImageFile(blob);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Handle drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith('image/'));

    if (imageFile) {
      await handleImageFile(imageFile);
    }
  };

  // Convert file to base64
  const handleImageFile = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPEG, PNG, WebP, or GIF.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('File too large. Maximum size is 15MB.');
      return;
    }

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target!.result as string);
      reader.readAsDataURL(file);
    });

    setCurrentImage(dataUrl);
  };

  // File input change handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageFile(file);
    }
  };

  // Process image with ultra-OCR API
  const processImageWithOCR = async (imageDataUrl: string): Promise<ExtractedData | null> => {
    try {
      // Convert dataUrl to Blob
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], 'image.png', { type: blob.type });

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ultra-ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('OCR error:', error);
      return null;
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!input.trim() && !currentImage) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim() || '(Image attached)',
      timestamp: new Date(),
      image: currentImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    let extractedData: ExtractedData | null = null;

    // Process OCR if image attached
    if (currentImage) {
      extractedData = await processImageWithOCR(currentImage);
      setCurrentImage(null);
    }

    // Generate assistant response
    let assistantContent = '';

    if (extractedData) {
      const foundersCount = extractedData.founders?.length || 0;
      const investorsCount = extractedData.investors?.length || 0;
      const confidence = extractedData.confidence || 0;

      assistantContent = `✅ Successfully extracted data with ${confidence.toFixed(0)}% confidence!\n\n`;
      assistantContent += `📊 **Extracted Data:**\n`;
      assistantContent += `• ${foundersCount} founder contribution(s)\n`;
      assistantContent += `• ${investorsCount} investor contribution(s)\n`;

      if (extractedData.settings?.walletSize) {
        assistantContent += `• Wallet Size: $${extractedData.settings.walletSize.toLocaleString()}\n`;
      }
      if (extractedData.settings?.realizedProfit) {
        assistantContent += `• Realized Profit: $${extractedData.settings.realizedProfit.toLocaleString()}\n`;
      }

      assistantContent += `\nClick "Apply to Calculator" below to populate all fields automatically!`;
    } else if (currentImage) {
      assistantContent =
        "❌ Sorry, I couldn't extract data from that image. Please try:\n• Uploading a clearer image\n• Ensuring the image contains financial data\n• Using a screenshot of your trading dashboard";
    } else {
      // Handle text-only queries (future: integrate with AI analysis)
      assistantContent = `I received your message: "${input}"\n\n(Text-based AI analysis coming soon! For now, I specialize in extracting data from images.)`;
    }

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
      extractedData: extractedData || undefined,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsProcessing(false);
  };

  // Apply extracted data to calculator
  const applyToCalculator = (data: ExtractedData) => {
    try {
      // Update settings
      if (data.settings) {
        const settingsUpdate: Record<string, unknown> = {};

        if (data.settings.walletSize !== undefined) {
          settingsUpdate.walletSize = data.settings.walletSize;
        }
        if (data.settings.realizedProfit !== undefined) {
          settingsUpdate.realizedProfit = data.settings.realizedProfit;
        }
        if (data.settings.moonbagUnreal !== undefined) {
          settingsUpdate.moonbagUnreal = data.settings.moonbagUnreal;
        }
        if (data.settings.mgmtFeePct !== undefined) {
          settingsUpdate.mgmtFeePct = data.settings.mgmtFeePct;
        }
        if (data.settings.entryFeePct !== undefined) {
          settingsUpdate.entryFeePct = data.settings.entryFeePct;
        }
        if (data.settings.winStart) {
          settingsUpdate.winStart = data.settings.winStart;
        }
        if (data.settings.winEnd) {
          settingsUpdate.winEnd = data.settings.winEnd;
        }

        fundStore.updateSettings(settingsUpdate);
      }

      // Populate contributions
      const contributions: Array<{
        name: string;
        date: string;
        amount: number;
        rule: 'net' | 'gross';
        cls: 'founder' | 'investor';
      }> = [];

      (data.founders || []).forEach((f) => {
        contributions.push({
          name: f.name || 'Founder',
          date: f.date,
          amount: f.amount,
          rule: 'net',
          cls: 'founder',
        });
      });

      (data.investors || []).forEach((i) => {
        contributions.push({
          name: i.name || 'Investor',
          date: i.date,
          amount: i.amount,
          rule: 'net',
          cls: 'investor',
        });
      });

      if (contributions.length > 0) {
        fundStore.populateContributions(contributions);
      }

      // Call parent callback if provided
      if (onApplyData) {
        onApplyData(data);
      }

      // Add confirmation message
      const confirmMessage: ChatMessage = {
        id: `confirm-${Date.now()}`,
        role: 'assistant',
        content: `✅ Successfully applied ${contributions.length} contribution(s) to the calculator! Check the tables below.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    } catch (error) {
      console.error('Error applying data:', error);
      alert('Failed to apply data to calculator. Please check the console for errors.');
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle expanded mode
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={chatContainerRef}
      className={`relative ${
        isExpanded ? 'fixed inset-0 z-50 bg-gray-900' : 'border border-gray-700 rounded-lg'
      }`}
      style={{
        backgroundColor: isExpanded ? '#1a1a1a' : 'var(--panel)',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-700"
        style={{ backgroundColor: isExpanded ? '#242424' : 'var(--panel-dark)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <h3 className="text-lg font-semibold text-white">
            AI Assistant (Claude + GPT-4o Vision)
          </h3>
        </div>
        <button
          type="button"
          onClick={toggleExpanded}
          className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title={isExpanded ? 'Exit full screen' : 'Expand to full screen'}
          aria-label={isExpanded ? 'Exit full screen' : 'Expand to full screen'}
        >
          {isExpanded ? '✕ Exit' : '⛶ Expand'}
        </button>
      </div>

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500 bg-opacity-20 border-4 border-blue-500 border-dashed rounded-lg">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">📎</div>
            <div className="text-2xl font-bold">Drop image here</div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        className="overflow-y-auto p-4 space-y-3"
        style={{
          height: isExpanded ? 'calc(100vh - 200px)' : '400px',
          backgroundColor: isExpanded ? '#1a1a1a' : 'var(--background)',
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-cyan-900 bg-opacity-30 border border-cyan-500'
                : 'bg-gray-800 border border-gray-700'
            }`}
          >
            {/* Message Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {message.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                </span>
                <span className="text-xs text-gray-400">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Message Content */}
            <div className="text-gray-200 whitespace-pre-wrap">{message.content}</div>

            {/* Image Attachment */}
            {message.image && (
              <div className="mt-3">
                <img
                  src={message.image}
                  alt="Attached"
                  className="max-w-full max-h-64 rounded border border-gray-600 cursor-pointer hover:border-cyan-500 transition-colors"
                  onClick={() => window.open(message.image, '_blank')}
                  title="Click to view full size"
                />
              </div>
            )}

            {/* Extracted Data with Apply Button */}
            {message.extractedData && (
              <div className="mt-3 p-3 bg-green-900 bg-opacity-20 border border-green-500 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-green-400">📊 Extracted Data Available</span>
                  <button
                    type="button"
                    onClick={() => applyToCalculator(message.extractedData!)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
                    aria-label="Apply extracted data to calculator"
                    title="Apply extracted data to calculator"
                  >
                    Apply to Calculator
                  </button>
                </div>
                <div className="text-sm text-gray-300">
                  Confidence: {message.extractedData.confidence?.toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="p-3 bg-cyan-900 bg-opacity-20 border border-cyan-500 rounded flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-500"></div>
            <span className="text-cyan-400">AI is processing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview (before sending) */}
      {currentImage && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="relative inline-block">
            <img
              src={currentImage}
              alt="Preview"
              className="max-h-24 rounded border border-gray-600"
            />
            <button
              onClick={() => setCurrentImage(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold"
              title="Remove image"
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-gray-400 mt-1">Image ready to send</div>
        </div>
      )}

      {/* Input Area */}
      <div
        className="p-4 border-t border-gray-700"
        style={{ backgroundColor: isExpanded ? '#242424' : 'var(--panel-dark)' }}
      >
        <div className="flex gap-2">
          {/* Image Upload Button */}
          <input
            ref={fileInputRef}
            id="claude-chat-image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload image for OCR processing"
            title="Upload image for OCR processing"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            title="Upload image (or paste/drag & drop)"
            aria-label="Upload image (or paste/drag & drop)"
          >
            📎
          </button>

          {/* Text Input */}
          <label htmlFor="claude-chat-text-input" className="sr-only">
            Chat message input
          </label>
          <textarea
            id="claude-chat-text-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything or upload an image..."
            title="Type your message here"
            aria-label="Chat message input"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-500"
            rows={2}
            disabled={isProcessing}
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={isProcessing || (!input.trim() && !currentImage)}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded font-semibold transition-colors"
            aria-label="Send message"
            title="Send message"
          >
            Send
          </button>
        </div>

        {/* Helper Text */}
        <div className="mt-2 text-xs text-gray-500">
          💡 Tip: Paste images with Ctrl+V, drag & drop, or click 📎 to upload
        </div>
      </div>
    </div>
  );
}
