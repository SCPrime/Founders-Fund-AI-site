'use client';

import { useState, useRef, useEffect } from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import PredictiveAnalytics from './PredictiveAnalytics';
import SmartValidation from './SmartValidation';
import OCRProcessor from './OCRProcessor';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface OCRUploadResponse {
  text?: string;
  error?: string;
  processed_data?: {
    founders?: Array<{ date: string; amount: number }>;
    investors?: Array<{ date: string; amount: number }>;
    settings?: Partial<{
    walletSize: number;
    realizedProfit: number;
    mgmtFeePct: number;
    entryFeePct: number;
  }>;
  };
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for Founders Fund calculations. I can help you:\n\n• Analyze financial documents with OCR\n• Auto-populate contribution tables\n• Provide investment insights and predictions\n• Validate data and suggest optimizations\n\nHow can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const calc = useCalculator();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };


  const analyzeWithAI = async (text: string, context?: string): Promise<string> => {
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          context: context || 'financial_document',
          current_settings: {
            walletSize: calc.walletSize,
            realizedProfit: calc.realizedProfit,
            mgmtFeePct: calc.mgmtFeePct,
            entryFeePct: calc.entryFeePct
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.includes('API key not configured')) {
          return `🔧 **AI Demo Mode**\n\nAI features require an OpenAI API key. You can still:\n\n• Use the 🤖 AI Populate demo buttons\n• Upload documents for OCR text extraction\n• Test all calculator features\n\nTo enable full AI features, add OPENAI_API_KEY to your .env.local file.`;
        }
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.analysis || 'Analysis completed';
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        return `🔧 **Connection Issue**\n\nCouldn't connect to AI service. Please check your internet connection and try again.`;
      }
      throw error;
    }
  };


  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const analysis = await analyzeWithAI(userMessage, 'user_query');
      addMessage('assistant', analysis);
    } catch (error) {
      addMessage('assistant', `❌ Error: ${error instanceof Error ? error.message : 'Failed to process your request'}`);
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

  const generatePrediction = async () => {
    setIsLoading(true);
    addMessage('user', '📊 Generate investment prediction');

    try {
      const analysis = await analyzeWithAI('', 'prediction_analysis');
      addMessage('assistant', `📈 **Investment Prediction:**\n${analysis}`);
    } catch (error) {
      addMessage('assistant', `❌ Prediction error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const validateCurrentData = async () => {
    setIsLoading(true);
    addMessage('user', '🔍 Validate current data');

    try {
      const analysis = await analyzeWithAI('', 'data_validation');
      addMessage('assistant', `✅ **Data Validation:**\n${analysis}`);
    } catch (error) {
      addMessage('assistant', `❌ Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <h2>AI Assistant</h2>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={generatePrediction}
          disabled={isLoading}
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          📊 Generate Prediction
        </button>
        <button
          onClick={validateCurrentData}
          disabled={isLoading}
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          🔍 Validate Data
        </button>
      </div>

      {/* OCR Processor */}
      <OCRProcessor
        onOCRComplete={(extractedData) => {
          addMessage('assistant', '🎯 OCR Processing Complete! Extracted financial data from your image.');

          // Auto-populate data
          if (extractedData.founders && extractedData.founders.length > 0) {
            if ((window as any).populateFoundersFromAI) {
              (window as any).populateFoundersFromAI(extractedData.founders);
              addMessage('assistant', `✅ Auto-populated ${extractedData.founders.length} founder entries!`);
            }
          }

          if (extractedData.investors && extractedData.investors.length > 0) {
            if ((window as any).populateInvestorsFromAI) {
              (window as any).populateInvestorsFromAI(extractedData.investors);
              addMessage('assistant', `✅ Auto-populated ${extractedData.investors.length} investor entries!`);
            }
          }

          if (extractedData.settings) {
            // Update all calculator settings with proper validation
            if (extractedData.settings.walletSize && extractedData.settings.walletSize > 0) {
              calc.setWalletSize(Math.round(extractedData.settings.walletSize));
            }
            if (extractedData.settings.realizedProfit && extractedData.settings.realizedProfit > 0) {
              calc.setRealizedProfit(Math.round(extractedData.settings.realizedProfit));
            }
            if (extractedData.settings.unrealizedProfit && extractedData.settings.unrealizedProfit > 0) {
              calc.setMoonbagUnreal(Math.round(extractedData.settings.unrealizedProfit));
              calc.setIncludeUnreal('yes'); // Enable unrealized profit when detected
            }
            if (extractedData.settings.moonbagUnreal && extractedData.settings.moonbagUnreal > 0) {
              calc.setMoonbagUnreal(Math.round(extractedData.settings.moonbagUnreal));
              calc.setIncludeUnreal('yes');
            }
            if (extractedData.settings.moonbagFounderPct && extractedData.settings.moonbagFounderPct >= 0 && extractedData.settings.moonbagFounderPct <= 100) {
              calc.setMoonbagFounderPct(extractedData.settings.moonbagFounderPct);
            }
            if (extractedData.settings.mgmtFeePct && extractedData.settings.mgmtFeePct >= 0 && extractedData.settings.mgmtFeePct <= 100) {
              calc.setMgmtFeePct(extractedData.settings.mgmtFeePct);
            }
            if (extractedData.settings.entryFeePct && extractedData.settings.entryFeePct >= 0 && extractedData.settings.entryFeePct <= 100) {
              calc.setEntryFeePct(extractedData.settings.entryFeePct);
            }

            let settingsMessage = '⚙️ **Calculator Settings Updated:**\n\n';
            if (extractedData.settings.walletSize) {
              settingsMessage += `💰 **Wallet Size:** $${Math.round(extractedData.settings.walletSize).toLocaleString()}\n`;
            }
            if (extractedData.settings.realizedProfit) {
              settingsMessage += `📈 **Realized Profit:** $${Math.round(extractedData.settings.realizedProfit).toLocaleString()}\n`;
            }
            if (extractedData.settings.unrealizedProfit || extractedData.settings.moonbagUnreal) {
              const unrealizedAmount = extractedData.settings.unrealizedProfit || extractedData.settings.moonbagUnreal || 0;
              settingsMessage += `🌙 **Unrealized Profit (Moonbag):** $${Math.round(unrealizedAmount).toLocaleString()}\n`;
              settingsMessage += `   • 75% to founders: $${Math.round(unrealizedAmount * 0.75).toLocaleString()}\n`;
              settingsMessage += `   • 25% to investors (time-weighted): $${Math.round(unrealizedAmount * 0.25).toLocaleString()}\n`;
            }
            if (extractedData.settings.mgmtFeePct || extractedData.settings.entryFeePct) {
              settingsMessage += `💼 **Fee Structure:**\n`;
              if (extractedData.settings.mgmtFeePct) {
                settingsMessage += `   • Management Fee: ${extractedData.settings.mgmtFeePct}% (investors pay → founders receive)\n`;
              }
              if (extractedData.settings.entryFeePct) {
                settingsMessage += `   • Entry Fee: ${extractedData.settings.entryFeePct}% (investors pay → founders receive)\n`;
              }
            }
            if (extractedData.settings.transactionStats) {
              const stats = extractedData.settings.transactionStats;
              settingsMessage += `📊 **Trading Performance:** ${stats.winning}W/${stats.losing}L (${stats.winRate.toFixed(1)}% win rate)\n`;
            }

            addMessage('assistant', settingsMessage);
          }

          addMessage('assistant', '🚀 **All Done!** Your financial document has been processed and the data has been automatically populated into the calculator tables. Check the main Calculator tab to see the results.');
        }}
        onError={(error) => {
          addMessage('assistant', `❌ OCR Error: ${error}`);
        }}
      />

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '12px',
        marginBottom: '12px',
        backgroundColor: '#fafafa'
      }}>
        {messages.map((message) => (
          <div key={message.id} style={{
            marginBottom: '12px',
            padding: '8px',
            borderRadius: '6px',
            backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
            border: message.role === 'user' ? '1px solid #2196f3' : '1px solid #ccc'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '4px',
              fontWeight: 'bold'
            }}>
              {message.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
              <span style={{ float: 'right', fontWeight: 'normal' }}>
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div style={{ whiteSpace: 'pre-line', fontSize: '13px' }}>
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{
            padding: '8px',
            fontStyle: 'italic',
            color: '#666',
            textAlign: 'center'
          }}>
            🤖 AI is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Validation Section */}
      <SmartValidation />

      {/* Predictive Analytics Section */}
      <PredictiveAnalytics />

      {/* Input Area */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about your fund calculations..."
          disabled={isLoading}
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '100px',
            resize: 'vertical',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: input.trim() && !isLoading ? '#2196f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
