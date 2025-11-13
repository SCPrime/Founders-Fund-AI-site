'use client';

import { useOCR } from '@/context/OCRContext';
import { aiTools, executeAITool } from '@/lib/aiTools';
import { useFundStore } from '@/store/fundStore';
import { useEffect, useRef, useState } from 'react';
import OCRChatInterface from './OCRChatInterface';
import OCRProcessor from './OCRProcessor';
import PredictiveAnalytics from './PredictiveAnalytics';
import SmartValidation from './SmartValidation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

interface Contribution {
  date: string;
  amount: number;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
}

interface SimulationResult {
  currentSummary: {
    totalNetProfit: number;
    totalContributions: number;
    [key: string]: unknown;
  };
  simulatedSummary: {
    totalNetProfit: number;
    totalContributions: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SnapshotData {
  contributions: Contribution[];
  settings: {
    walletSize: number;
    realizedProfit: number;
    moonbagUnreal: number;
    mgmtFeePct: number;
    entryFeePct: number;
    winStart: string;
    winEnd: string;
    [key: string]: unknown;
  };
  results: Array<Record<string, unknown>>;
  summary: {
    totalNetProfit: number;
    totalFees: number;
    [key: string]: unknown;
  };
  validationIssues: ValidationIssue[];
  [key: string]: unknown;
}

export default function AIAssistant() {
  const [useChatInterface, setUseChatInterface] = useState(true); // Default to new chat interface
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your AI assistant for Founders Fund calculations. I can help you:\n\n• Analyze fund snapshots and performance\n• Run what-if scenarios with simulations\n• Validate fund data and suggest fixes\n• Auto-populate contribution tables from OCR\n• Provide detailed participant analysis\n\nI have access to powerful AI tools:\n🔍 **get_snapshot** - Get complete fund state\n🎯 **simulate** - Run what-if scenarios\n✅ **validate_fund** - Check for issues\n🔧 **quick_fix** - Auto-fix common problems\n👤 **analyze_participant** - Deep participant analysis\n⚡ **apply_changes** - Apply approved changes\n\nHow can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { settings, updateSettings, populateContributions } = useFundStore();
  const { ocrData } = useOCR();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const analyzeWithAI = async (text: string, context?: string): Promise<string> => {
    try {
      // Try to execute AI tools locally first
      if (context === 'get_snapshot') {
        const snapshot = executeAITool('get_snapshot') as SnapshotData;
        return formatSnapshotResponse(snapshot);
      }

      if (context === 'validate_fund') {
        const issues = executeAITool('validate_fund') as ValidationIssue[];
        return formatValidationResponse(issues);
      }

      // For complex queries, try the AI API
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          context: context || 'user_query',
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
          return `🔧 **AI Demo Mode**\n\nAI features require an OpenAI API key. You can still:\n\n• Use local AI tools (get_snapshot, validate_fund, simulate)\n• Upload documents for OCR text extraction\n• Test all calculator features\n\nTo enable full AI features, add OPENAI_API_KEY to your .env.local file.`;
        }
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.analysis || 'Analysis completed';
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        return `🔧 **Connection Issue**\n\nCouldn't connect to AI service. Using local AI tools instead.`;
      }
      throw error;
    }
  };

  const formatSnapshotResponse = (snapshot: SnapshotData): string => {
    let response = '📊 **Fund Snapshot**\n\n';

    response += `**Settings:**\n`;
    response += `• Wallet Size: $${snapshot.settings.walletSize.toLocaleString()}\n`;
    response += `• Realized Profit: $${snapshot.settings.realizedProfit.toLocaleString()}\n`;
    response += `• Unrealized Profit: $${snapshot.settings.moonbagUnreal.toLocaleString()}\n`;
    response += `• Management Fee: ${snapshot.settings.mgmtFeePct}%\n`;
    response += `• Entry Fee: ${snapshot.settings.entryFeePct}%\n`;
    response += `• Window: ${snapshot.settings.winStart} to ${snapshot.settings.winEnd}\n\n`;

    response += `**Contributions:** ${snapshot.contributions.length} entries\n`;
    const totalContributions = snapshot.contributions.reduce(
      (sum: number, c: Contribution) => sum + c.amount,
      0,
    );
    response += `• Total Amount: $${totalContributions.toLocaleString()}\n`;

    if (snapshot.results.length > 0) {
      response += `\n**Results:** ${snapshot.results.length} participants\n`;
      response += `• Total Net Profit: $${snapshot.summary.totalNetProfit.toLocaleString()}\n`;
      response += `• Total Fees Collected: $${snapshot.summary.totalFees.toLocaleString()}\n`;
    }

    response += `\n**Validation:** ${snapshot.validationIssues.length} issue${snapshot.validationIssues.length !== 1 ? 's' : ''}`;

    return response;
  };

  const formatValidationResponse = (issues: ValidationIssue[]): string => {
    let response = '✅ **Fund Validation**\n\n';

    if (issues.length === 0) {
      response += '🎉 **No issues found!** Your fund data is valid and ready for calculations.';
      return response;
    }

    const errors = issues.filter((i) => i.type === 'error');
    const warnings = issues.filter((i) => i.type === 'warning');
    const infos = issues.filter((i) => i.type === 'info');

    if (errors.length > 0) {
      response += `❌ **${errors.length} Error${errors.length > 1 ? 's' : ''}:**\n`;
      errors.forEach((issue) => {
        response += `• ${issue.message}\n`;
      });
      response += '\n';
    }

    if (warnings.length > 0) {
      response += `⚠️ **${warnings.length} Warning${warnings.length > 1 ? 's' : ''}:**\n`;
      warnings.forEach((issue) => {
        response += `• ${issue.message}\n`;
      });
      response += '\n';
    }

    if (infos.length > 0) {
      response += `ℹ️ **${infos.length} Info:**\n`;
      infos.forEach((issue) => {
        response += `• ${issue.message}\n`;
      });
    }

    return response;
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
      addMessage(
        'assistant',
        `❌ Error: ${error instanceof Error ? error.message : 'Failed to process your request'}`,
      );
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

  const getSnapshot = async () => {
    setIsLoading(true);
    addMessage('user', '📊 Get fund snapshot');

    try {
      const analysis = await analyzeWithAI('', 'get_snapshot');
      addMessage('assistant', analysis);
    } catch (error) {
      addMessage(
        'assistant',
        `❌ Snapshot error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateCurrentData = async () => {
    setIsLoading(true);
    addMessage('user', '🔍 Validate current data');

    try {
      const analysis = await analyzeWithAI('', 'validate_fund');
      addMessage('assistant', analysis);
    } catch (error) {
      addMessage(
        'assistant',
        `❌ Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runSimulation = async () => {
    setIsLoading(true);
    addMessage('user', '🎯 Run simulation');

    try {
      // Example simulation - double Laura's contributions
      const simulation = executeAITool('simulate', {
        contributionChanges: [
          {
            action: 'add',
            contribution: {
              name: 'Laura (Simulated)',
              date: '2025-09-15',
              amount: 10000,
              rule: 'net',
              cls: 'investor',
            },
          },
        ],
      }) as SimulationResult;

      let response = '🎯 **Simulation Results**\n\n';
      response += `**Current Results:**\n`;
      response += `• Total Net Profit: $${simulation.currentSummary.totalNetProfit.toLocaleString()}\n`;
      response += `• Total Contributions: $${simulation.currentSummary.totalContributions.toLocaleString()}\n\n`;

      response += `**Simulated Results:**\n`;
      response += `• Total Net Profit: $${simulation.simulatedSummary.totalNetProfit.toLocaleString()}\n`;
      response += `• Total Contributions: $${simulation.simulatedSummary.totalContributions.toLocaleString()}\n\n`;

      const profitDiff =
        simulation.simulatedSummary.totalNetProfit - simulation.currentSummary.totalNetProfit;
      response += `**Impact:** ${profitDiff >= 0 ? '+' : ''}$${profitDiff.toLocaleString()} net profit change`;

      addMessage('assistant', response);
    } catch (error) {
      addMessage(
        'assistant',
        `❌ Simulation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const pushOCRToCalculator = () => {
    if (!ocrData.extractedData) {
      addMessage(
        'assistant',
        '❌ No OCR data available. Please upload and process an image first.',
      );
      return;
    }

    addMessage('user', '📊 Push OCR data to calculator');

    try {
      const data = ocrData.extractedData;

      // Update fund store settings
      if (data.settings) {
        const settingsUpdates: Record<string, number> = {};
        if (data.settings.walletSize) settingsUpdates.walletSize = Number(data.settings.walletSize);
        if (data.settings.realizedProfit)
          settingsUpdates.realizedProfit = Number(data.settings.realizedProfit);
        if (data.settings.moonbagUnreal)
          settingsUpdates.moonbagUnreal = Number(data.settings.moonbagUnreal);
        if (data.settings.moonbagFounderPct)
          settingsUpdates.moonbagFounderPct = Number(data.settings.moonbagFounderPct);
        if (data.settings.mgmtFeePct) settingsUpdates.mgmtFeePct = Number(data.settings.mgmtFeePct);
        if (data.settings.entryFeePct)
          settingsUpdates.entryFeePct = Number(data.settings.entryFeePct);

        if (Object.keys(settingsUpdates).length > 0) {
          updateSettings(settingsUpdates);
        }
      }

      // Combine founders and investors for the table
      import type { Contribution } from '@/types/fund';
      const combinedData: Omit<Contribution, 'id'>[] = [];
      if (data.founders) {
        combinedData.push(
          ...data.founders.map((f: Record<string, unknown>) => ({
            name: (typeof f.name === 'string' ? f.name : 'Founder') || 'Founder',
            date: (typeof f.date === 'string' ? f.date : '') || '',
            amount: (typeof f.amount === 'number' ? f.amount : 0) || 0,
            rule: ((typeof f.rule === 'string' ? f.rule : 'net') || 'net') as 'net' | 'gross',
            cls: 'founder' as const,
          })),
        );
      }
      interface InvestorData {
        name?: string;
        date: string;
        amount: number;
        rule?: string;
      }

      if (data.investors) {
        combinedData.push(
          ...data.investors.map((i: InvestorData) => ({
            name: i.name || 'Investor',
            date: i.date,
            amount: i.amount,
            rule: (i.rule || 'net') as 'net' | 'gross',
            cls: 'investor' as const,
          })),
        );
      }

      // Push to fund store using populateContributions
      if (combinedData.length > 0) {
        populateContributions(combinedData);
      }

      let message = '✅ **OCR Data Successfully Pushed to Fund Store!**\n\n';

      if (data.settings) {
        message += '⚙️ **Updated Settings:**\n';
        if (data.settings.walletSize)
          message += `💰 Wallet Size: $${data.settings.walletSize.toLocaleString()}\n`;
        if (data.settings.realizedProfit)
          message += `📈 Realized Profit: $${data.settings.realizedProfit.toLocaleString()}\n`;
        if (data.settings.moonbagUnreal)
          message += `🌙 Moonbag: $${data.settings.moonbagUnreal.toLocaleString()}\n`;
        if (data.settings.mgmtFeePct)
          message += `💼 Management Fee: ${data.settings.mgmtFeePct}%\n`;
        if (data.settings.entryFeePct) message += `💼 Entry Fee: ${data.settings.entryFeePct}%\n`;
      }

      if (combinedData.length > 0) {
        message += `\n👥 **Populated ${combinedData.length} entries** in the Founders & Investors table.\n`;
      }

      message +=
        '\n🔄 **Switch to the Calculator tab** to see all the updated data and automatic calculations!';

      addMessage('assistant', message);
    } catch (error) {
      addMessage(
        'assistant',
        `❌ Error pushing data to fund store: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  // If using new chat interface, render it
  if (useChatInterface) {
    return (
      <div
        className="panel"
        style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2>AI Assistant</h2>
          <button
            onClick={() => setUseChatInterface(false)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: 'var(--panel)',
              color: 'var(--text)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            title="Switch to classic interface"
          >
            🔄 Classic Mode
          </button>
        </div>
        <OCRChatInterface
          onExtractComplete={(data) => {
            console.log('OCR Chat extraction complete:', data);
          }}
        />
      </div>
    );
  }

  return (
    <div className="panel" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2>AI Assistant</h2>
        <button
          onClick={() => setUseChatInterface(true)}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: 'var(--accent)',
            color: 'var(--ink)',
            border: '1px solid var(--accent)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
          title="Switch to new chat interface with image upload"
        >
          💬 Chat Mode
        </button>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button className="btn" onClick={getSnapshot} disabled={isLoading}>
          📊 Get Snapshot
        </button>
        <button className="btn" onClick={validateCurrentData} disabled={isLoading}>
          🔍 Validate Data
        </button>
        <button className="btn" onClick={runSimulation} disabled={isLoading}>
          🎯 Run Simulation
        </button>
        {ocrData.extractedData && (
          <button
            onClick={pushOCRToCalculator}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: 'var(--good)',
              color: 'var(--text)',
              border: '1px solid var(--good)',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            📊 Push OCR to Fund Store
          </button>
        )}
      </div>

      {/* OCR Processor */}
      <OCRProcessor
        onOCRComplete={(extractedData) => {
          addMessage(
            'assistant',
            '🎯 OCR Processing Complete! Extracted financial data from your image.',
          );

          // Prepare contributions for fund store
          const combinedData = [];

          interface FounderData {
            name?: string;
            date: string;
            amount: number;
            rule?: string;
          }

          interface InvestorData {
            name?: string;
            date: string;
            amount: number;
            rule?: string;
          }

          if (extractedData.founders && extractedData.founders.length > 0) {
            combinedData.push(
              ...extractedData.founders.map((f: FounderData) => ({
                name: f.name || 'Founder',
                ts: f.date || new Date().toISOString().split('T')[0],
                amount: f.amount || 0,
                owner: 'founders' as const,
                type: 'seed' as const,
                earnsDollarDaysThisWindow: true,
              })),
            );
            addMessage(
              'assistant',
              `✅ Processed ${extractedData.founders.length} founder entries!`,
            );
          }

          if (extractedData.investors && extractedData.investors.length > 0) {
            combinedData.push(
              ...extractedData.investors.map((i) => ({
                name: i.name || 'Investor',
                date: i.date || new Date().toISOString().split('T')[0],
                amount: i.amount || 0,
                rule: i.rule || 'net',
                cls: 'investor' as const,
              })),
            );
            addMessage(
              'assistant',
              `✅ Processed ${extractedData.investors.length} investor entries!`,
            );
          }

          // Auto-populate contributions to fund store
          if (combinedData.length > 0) {
            populateContributions(combinedData);
          }

          if (extractedData.settings) {
            // Update fund store settings with proper validation
            const settingsUpdates: Record<string, number> = {};

            if (
              extractedData.settings.walletSize &&
              Number(extractedData.settings.walletSize) > 0
            ) {
              settingsUpdates.walletSize = Math.round(Number(extractedData.settings.walletSize));
            }
            if (
              extractedData.settings.realizedProfit &&
              Number(extractedData.settings.realizedProfit) > 0
            ) {
              settingsUpdates.realizedProfit = Math.round(
                Number(extractedData.settings.realizedProfit),
              );
            }
            if (
              extractedData.settings.unrealizedProfit &&
              Number(extractedData.settings.unrealizedProfit) > 0
            ) {
              settingsUpdates.moonbagUnreal = Math.round(
                Number(extractedData.settings.unrealizedProfit),
              );
            }
            if (
              extractedData.settings.moonbagUnreal &&
              Number(extractedData.settings.moonbagUnreal) > 0
            ) {
              settingsUpdates.moonbagUnreal = Math.round(
                Number(extractedData.settings.moonbagUnreal),
              );
            }
            if (
              extractedData.settings.moonbagFounderPct &&
              Number(extractedData.settings.moonbagFounderPct) >= 0 &&
              Number(extractedData.settings.moonbagFounderPct) <= 100
            ) {
              settingsUpdates.moonbagFounderPct = Number(extractedData.settings.moonbagFounderPct);
            }
            if (
              extractedData.settings.mgmtFeePct &&
              Number(extractedData.settings.mgmtFeePct) >= 0 &&
              Number(extractedData.settings.mgmtFeePct) <= 100
            ) {
              settingsUpdates.mgmtFeePct = Number(extractedData.settings.mgmtFeePct);
            }
            if (
              extractedData.settings.entryFeePct &&
              Number(extractedData.settings.entryFeePct) >= 0 &&
              Number(extractedData.settings.entryFeePct) <= 100
            ) {
              settingsUpdates.entryFeePct = Number(extractedData.settings.entryFeePct);
            }

            if (Object.keys(settingsUpdates).length > 0) {
              updateSettings(settingsUpdates);
            }

            let settingsMessage = '⚙️ **Fund Settings Updated:**\n\n';
            if (settingsUpdates.walletSize) {
              settingsMessage += `💰 **Wallet Size:** $${settingsUpdates.walletSize.toLocaleString()}\n`;
            }
            if (settingsUpdates.realizedProfit) {
              settingsMessage += `📈 **Realized Profit:** $${settingsUpdates.realizedProfit.toLocaleString()}\n`;
            }
            if (settingsUpdates.moonbagUnreal) {
              const unrealizedAmount = settingsUpdates.moonbagUnreal;
              settingsMessage += `🌙 **Unrealized Profit (Moonbag):** $${unrealizedAmount.toLocaleString()}\n`;
              settingsMessage += `   • ${settings.moonbagFounderPct}% to founders: $${Math.round(unrealizedAmount * (settings.moonbagFounderPct / 100)).toLocaleString()}\n`;
              settingsMessage += `   • ${100 - settings.moonbagFounderPct}% to investors (time-weighted): $${Math.round(unrealizedAmount * ((100 - settings.moonbagFounderPct) / 100)).toLocaleString()}\n`;
            }
            if (settingsUpdates.mgmtFeePct || settingsUpdates.entryFeePct) {
              settingsMessage += `💼 **Fee Structure:**\n`;
              if (settingsUpdates.mgmtFeePct) {
                settingsMessage += `   • Management Fee: ${settingsUpdates.mgmtFeePct}% (investors pay → founders receive)\n`;
              }
              if (settingsUpdates.entryFeePct) {
                settingsMessage += `   • Entry Fee: ${settingsUpdates.entryFeePct}% (investors pay → founders receive)\n`;
              }
            }
            if (extractedData.settings.transactionStats) {
              interface TransactionStats {
                totalTransactions?: number;
                averageAmount?: number;
                [key: string]: unknown;
              }
              const stats = extractedData.settings.transactionStats as TransactionStats | undefined;
              settingsMessage += `📊 **Trading Performance:** ${stats.winning}W/${stats.losing}L (${stats.winRate.toFixed(1)}% win rate)\n`;
            }

            addMessage('assistant', settingsMessage);
          }

          addMessage(
            'assistant',
            '🚀 **All Done!** Your financial document has been processed and the data has been automatically populated into the fund store with real-time calculations. Check the main Calculator tab to see the results.',
          );
        }}
        onError={(error) => {
          addMessage('assistant', `❌ OCR Error: ${error}`);
        }}
      />

      {/* Extracted Data Display */}
      {ocrData.extractedData && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: 'var(--panel)',
            border: '2px solid var(--accent)',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--accent)' }}>📊 Extracted Data Ready</h3>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Confidence: {ocrData.confidence || 0}%
            </span>
          </div>

          {/* Data Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {Object.entries(ocrData.extractedData || {}).map(([key, value]) => (
              <div
                key={key}
                style={{
                  backgroundColor: 'var(--ink)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: value !== null && value !== undefined ? 'var(--text)' : 'var(--muted)',
                    fontWeight: 'bold',
                  }}
                >
                  {value !== null && value !== undefined
                    ? typeof value === 'number' &&
                      (key.includes('Value') || key.includes('PNL') || key.includes('Balance'))
                      ? `$${value.toLocaleString()}`
                      : String(value)
                    : 'Not Found'}
                </div>
              </div>
            ))}
          </div>

          {/* Push Button */}
          <button
            onClick={pushOCRToCalculator}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: 'var(--good)',
              color: 'var(--text)',
              border: '2px solid var(--good)',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isLoading
              ? '⏳ Pushing to Fund Store...'
              : '📊 Push Data to Calculator & Verify Calculations'}
          </button>

          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            This will populate the calculator tables and trigger real-time calculations
          </div>
        </div>
      )}

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
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '12px',
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: message.role === 'user' ? 'rgba(57, 208, 216, 0.1)' : 'var(--panel)',
              border: message.role === 'user' ? '1px solid var(--accent)' : '1px solid var(--line)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--muted)',
                marginBottom: '4px',
                fontWeight: 'bold',
              }}
            >
              {message.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
              <span style={{ float: 'right', fontWeight: 'normal' }}>
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            {message.imageUrl && (
              <div style={{ marginBottom: '8px' }}>
                <img
                  src={message.imageUrl}
                  alt="Uploaded image"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                  }}
                />
              </div>
            )}
            <div style={{ whiteSpace: 'pre-line', fontSize: '13px', color: 'var(--text)' }}>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Validation Section */}
      <SmartValidation />

      {/* Predictive Analytics Section */}
      <PredictiveAnalytics />

      {/* Legacy Input Area (kept for backward compatibility) */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Or type a message here..."
          disabled={isLoading}
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '100px',
            resize: 'vertical',
            padding: '8px',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            backgroundColor: 'var(--ink)',
            color: 'var(--text)',
          }}
        />
        <button
          className="btn"
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            backgroundColor: input.trim() && !isLoading ? 'var(--accent)' : 'var(--panel)',
            color: input.trim() && !isLoading ? 'var(--ink)' : 'var(--muted)',
            border: `1px solid ${input.trim() && !isLoading ? 'var(--accent)' : 'var(--line)'}`,
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

          </div>

          {/* Data Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {Object.entries(ocrData.extractedData || {}).map(([key, value]) => (
              <div
                key={key}
                style={{
                  backgroundColor: 'var(--ink)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: value !== null && value !== undefined ? 'var(--text)' : 'var(--muted)',
                    fontWeight: 'bold',
                  }}
                >
                  {value !== null && value !== undefined
                    ? typeof value === 'number' &&
                      (key.includes('Value') || key.includes('PNL') || key.includes('Balance'))
                      ? `$${value.toLocaleString()}`
                      : String(value)
                    : 'Not Found'}
                </div>
              </div>
            ))}
          </div>

          {/* Push Button */}
          <button
            onClick={pushOCRToCalculator}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: 'var(--good)',
              color: 'var(--text)',
              border: '2px solid var(--good)',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isLoading
              ? '⏳ Pushing to Fund Store...'
              : '📊 Push Data to Calculator & Verify Calculations'}
          </button>

          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            This will populate the calculator tables and trigger real-time calculations
          </div>
        </div>
      )}

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
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '12px',
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: message.role === 'user' ? 'rgba(57, 208, 216, 0.1)' : 'var(--panel)',
              border: message.role === 'user' ? '1px solid var(--accent)' : '1px solid var(--line)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--muted)',
                marginBottom: '4px',
                fontWeight: 'bold',
              }}
            >
              {message.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
              <span style={{ float: 'right', fontWeight: 'normal' }}>
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            {message.imageUrl && (
              <div style={{ marginBottom: '8px' }}>
                <img
                  src={message.imageUrl}
                  alt="Uploaded image"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                  }}
                />
              </div>
            )}
            <div style={{ whiteSpace: 'pre-line', fontSize: '13px', color: 'var(--text)' }}>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Validation Section */}
      <SmartValidation />

      {/* Predictive Analytics Section */}
      <PredictiveAnalytics />

      {/* Legacy Input Area (kept for backward compatibility) */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Or type a message here..."
          disabled={isLoading}
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '100px',
            resize: 'vertical',
            padding: '8px',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            backgroundColor: 'var(--ink)',
            color: 'var(--text)',
          }}
        />
        <button
          className="btn"
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            backgroundColor: input.trim() && !isLoading ? 'var(--accent)' : 'var(--panel)',
            color: input.trim() && !isLoading ? 'var(--ink)' : 'var(--muted)',
            border: `1px solid ${input.trim() && !isLoading ? 'var(--accent)' : 'var(--line)'}`,
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
