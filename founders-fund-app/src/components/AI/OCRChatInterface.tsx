'use client';

import { useOCR } from '@/context/OCRContext';
import { aiTools, executeAITool } from '@/lib/aiTools';
import { useFundStore } from '@/store/fundStore';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[]; // Base64 or blob URLs for images
  extractedData?: Record<string, unknown>;
}

interface OCRChatInterfaceProps {
  onExtractComplete?: (data: Record<string, unknown>) => void;
}

export default function OCRChatInterface({ onExtractComplete }: OCRChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 **Welcome to OCR Chat!**\n\nI can help you:\n\n• 📷 **Upload images** directly in chat (drag & drop or click)\n• 🔍 **Extract financial data** from trading dashboards, statements, and documents\n• 💬 **Answer questions** about your fund calculations\n• 📊 **Auto-populate** calculator fields from extracted data\n• 🔎 **Analyze** your portfolio performance\n\n**Try it:** Upload an image of a trading dashboard or financial document, and I'll extract the data and answer your questions!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const { settings, updateSettings, populateContributions } = useFundStore();
  const { setOCRData } = useOCR();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = useCallback(
    (
      role: 'user' | 'assistant',
      content: string,
      images?: string[],
      extractedData?: Record<string, unknown>,
    ) => {
      const newMessage: Message = {
        id: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        timestamp: new Date(),
        images,
        extractedData,
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    [],
  );

  const processImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        addMessage('assistant', '❌ Please upload an image file (PNG, JPG, WebP, etc.)');
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        addMessage('assistant', '❌ File too large. Maximum size is 10MB.');
        return;
      }

      setIsProcessingOCR(true);
      const imageUrl = URL.createObjectURL(file);
      addMessage('user', `📷 Uploaded: ${file.name}`, [imageUrl]);

      try {
        // Show processing message
        const processingId = `processing-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: processingId,
            role: 'assistant',
            content: '🔍 Processing image with OCR...',
            timestamp: new Date(),
          },
        ]);

        // Process with OCR API
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/simple-ocr', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`OCR API error: ${response.statusText}`);
        }

        const result = await response.json();

        // Remove processing message
        setMessages((prev) => prev.filter((m) => m.id !== processingId));

        // Extract financial data
        const extractedData = result.extractedData || {};

        // Update OCR context
        setOCRData({
          uploadedImage: imageUrl,
          rawText: result.text || '',
          extractedData,
          confidence: result.confidence || 0,
        });

        // Auto-populate calculator if data is available
        let autoPopulated = false;
        if (extractedData.settings) {
          const settingsUpdates: Record<string, number> = {};
          if (extractedData.settings.walletSize)
            settingsUpdates.walletSize = Number(extractedData.settings.walletSize);
          if (extractedData.settings.realizedProfit)
            settingsUpdates.realizedProfit = Number(extractedData.settings.realizedProfit);
          if (extractedData.settings.moonbagUnreal)
            settingsUpdates.moonbagUnreal = Number(extractedData.settings.moonbagUnreal);
          if (extractedData.settings.mgmtFeePct)
            settingsUpdates.mgmtFeePct = Number(extractedData.settings.mgmtFeePct);
          if (extractedData.settings.entryFeePct)
            settingsUpdates.entryFeePct = Number(extractedData.settings.entryFeePct);

          if (Object.keys(settingsUpdates).length > 0) {
            updateSettings(settingsUpdates);
            autoPopulated = true;
          }
        }

        const combinedData = [];
        if (extractedData.founders) {
          combinedData.push(
            ...extractedData.founders.map((f: any) => ({
              name: f.name || 'Founder',
              date: f.date,
              amount: f.amount,
              rule: f.rule || 'net',
              cls: 'founder' as const,
            })),
          );
        }
        if (extractedData.investors) {
          combinedData.push(
            ...extractedData.investors.map((i: any) => ({
              name: i.name || 'Investor',
              date: i.date,
              amount: i.amount,
              rule: i.rule || 'net',
              cls: 'investor' as const,
            })),
          );
        }

        if (combinedData.length > 0) {
          populateContributions(combinedData as any);
          autoPopulated = true;
        }

        // Build response message
        let responseContent = '✅ **OCR Processing Complete!**\n\n';
        responseContent += `📊 **Confidence:** ${Math.round(result.confidence || 0)}%\n\n`;

        if (extractedData.settings) {
          responseContent += '⚙️ **Settings Extracted:**\n';
          if (extractedData.settings.walletSize)
            responseContent += `• Wallet Size: $${Number(extractedData.settings.walletSize).toLocaleString()}\n`;
          if (extractedData.settings.realizedProfit)
            responseContent += `• Realized Profit: $${Number(extractedData.settings.realizedProfit).toLocaleString()}\n`;
          if (extractedData.settings.moonbagUnreal)
            responseContent += `• Unrealized Profit: $${Number(extractedData.settings.moonbagUnreal).toLocaleString()}\n`;
          responseContent += '\n';
        }

        if (combinedData.length > 0) {
          responseContent += `👥 **Contributions Extracted:** ${combinedData.length} entries\n`;
          responseContent += `• Founders: ${extractedData.founders?.length || 0}\n`;
          responseContent += `• Investors: ${extractedData.investors?.length || 0}\n\n`;
        }

        if (autoPopulated) {
          responseContent +=
            '🚀 **Data Auto-Populated!** Calculator fields have been updated. Switch to the Calculator tab to see results.\n\n';
        }

        responseContent +=
          '💬 **Ask me anything** about the extracted data or your fund calculations!';

        addMessage('assistant', responseContent, undefined, extractedData);

        if (onExtractComplete) {
          onExtractComplete(extractedData);
        }
      } catch (error) {
        addMessage(
          'assistant',
          `❌ OCR Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } finally {
        setIsProcessingOCR(false);
      }
    },
    [addMessage, setOCRData, updateSettings, populateContributions, onExtractComplete],
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => processImageFile(file));
    } else {
      addMessage('assistant', '❌ Please drop image files only.');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Check if user is asking about OCR data
      const hasOCRContext = messages.some((m) => m.extractedData);

      // Try AI analysis
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: userMessage,
          context: hasOCRContext ? 'document_analysis' : 'user_query',
          current_snapshot: executeAITool('get_snapshot'),
          available_tools: aiTools.map((tool) => ({
            name: tool.name,
            description: tool.description,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.includes('API key not configured')) {
          addMessage(
            'assistant',
            '🔧 **AI Demo Mode**\n\nAI features require an OpenAI API key. You can still:\n\n• Use local AI tools (get_snapshot, validate_fund, simulate)\n• Upload documents for OCR text extraction\n• Test all calculator features\n\nTo enable full AI features, add OPENAI_API_KEY to your .env.local file.',
          );
        } else {
          throw new Error(`AI analysis failed: ${response.statusText}`);
        }
      } else {
        const result = await response.json();
        addMessage('assistant', result.analysis || 'Analysis completed');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        addMessage(
          'assistant',
          "🔧 **Connection Issue**\n\nCouldn't connect to AI service. Using local AI tools instead.",
        );
      } else {
        addMessage(
          'assistant',
          `❌ Error: ${error instanceof Error ? error.message : 'Failed to process your request'}`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Expanded"
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandedImage(null);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '10px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕ Close
          </button>
        </div>
      )}

      <div
        className="panel"
        style={{
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(57, 208, 216, 0.2)',
              border: '3px dashed var(--accent)',
              borderRadius: '8px',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--accent)',
            }}
          >
            📷 Drop image here to upload
          </div>
        )}

        <h2>💬 OCR Chat Assistant</h2>

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: 'var(--ink)',
            minHeight: '400px',
          }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor:
                  message.role === 'user' ? 'rgba(57, 208, 216, 0.1)' : 'var(--panel)',
                border:
                  message.role === 'user' ? '1px solid var(--accent)' : '1px solid var(--line)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{message.role === 'user' ? '👤 You' : '🤖 AI Assistant'}</span>
                <span style={{ fontWeight: 'normal' }}>
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {/* Images */}
              {message.images && message.images.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  {message.images.map((img, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                      }}
                    >
                      <img
                        src={img}
                        alt={`Uploaded ${idx + 1}`}
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '8px',
                          border: '2px solid var(--line)',
                          cursor: 'pointer',
                          objectFit: 'cover',
                        }}
                        onClick={() => setExpandedImage(img)}
                      />
                      <button
                        onClick={() => setExpandedImage(img)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Expand image"
                      >
                        🔍 Expand
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Content */}
              <div
                style={{
                  whiteSpace: 'pre-line',
                  fontSize: '13px',
                  color: 'var(--text)',
                  lineHeight: '1.6',
                }}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div
              style={{
                padding: '8px',
                fontStyle: 'italic',
                color: 'var(--muted)',
                textAlign: 'center',
              }}
            >
              🤖 AI is thinking...
            </div>
          )}

          {isProcessingOCR && (
            <div
              style={{
                padding: '8px',
                fontStyle: 'italic',
                color: 'var(--muted)',
                textAlign: 'center',
              }}
            >
              🔍 Processing OCR...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isProcessingOCR}
            style={{
              padding: '10px',
              backgroundColor: 'var(--panel)',
              color: 'var(--text)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              cursor: isLoading || isProcessingOCR ? 'not-allowed' : 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              height: '44px',
            }}
            title="Upload image"
            aria-label="Upload image"
          >
            📷
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            aria-label="Upload image file"
          />

          {/* Text Input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything or upload an image..."
            disabled={isLoading || isProcessingOCR}
            style={{
              flex: 1,
              minHeight: '44px',
              maxHeight: '120px',
              resize: 'vertical',
              padding: '10px',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              backgroundColor: 'var(--ink)',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: '14px',
            }}
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || isProcessingOCR}
            style={{
              padding: '10px 20px',
              backgroundColor:
                input.trim() && !isLoading && !isProcessingOCR ? 'var(--accent)' : 'var(--panel)',
              color: input.trim() && !isLoading && !isProcessingOCR ? 'var(--ink)' : 'var(--muted)',
              border: `1px solid ${input.trim() && !isLoading && !isProcessingOCR ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: '8px',
              cursor: input.trim() && !isLoading && !isProcessingOCR ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              minWidth: '80px',
              height: '44px',
            }}
          >
            Send
          </button>
        </div>

        {/* Helper Text */}
        <div
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--muted)',
            textAlign: 'center',
          }}
        >
          💡 Tip: Drag & drop images or click 📷 to upload. Ask questions about your fund data!
        </div>
      </div>
    </>
  );
}
