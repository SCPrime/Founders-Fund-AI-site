import { useFundStore } from '@/store/fundStore';
import { FundSnapshot, ValidationIssue, Contribution } from '@/types/fund';

/**
 * AI Assistant Tools for Founders Fund Calculator
 * These tools give the AI assistant deep access to fund state and operations
 */

interface ContributionChange {
  action: 'add' | 'modify' | 'remove';
  id?: string;
  contribution?: Partial<Contribution>;
}

interface SettingsChanges {
  realizedProfit?: number;
  moonbagUnreal?: number;
  mgmtFeePct?: number;
  entryFeePct?: number;
  moonbagFounderPct?: number;
  winStart?: string;
  winEnd?: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params?: Record<string, unknown>) => unknown;
}

/**
 * Get complete fund snapshot with all current data
 */
export const getSnapshotTool: AITool = {
  name: 'get_snapshot',
  description: 'Get complete current state of the fund including contributions, settings, results, and validation issues',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: (): FundSnapshot => {
    const store = useFundStore.getState();
    return store.getSnapshot();
  }
};

/**
 * Simulate changes without affecting current state
 */
export const simulateTool: AITool = {
  name: 'simulate',
  description: 'Run what-if scenarios by simulating changes to contributions or settings without affecting current state',
  parameters: {
    type: 'object',
    properties: {
      settingsChanges: {
        type: 'object',
        description: 'Settings to modify for simulation',
        properties: {
          realizedProfit: { type: 'number', description: 'Realized profit amount' },
          moonbagUnreal: { type: 'number', description: 'Unrealized profit amount' },
          mgmtFeePct: { type: 'number', description: 'Management fee percentage' },
          entryFeePct: { type: 'number', description: 'Entry fee percentage' },
          moonbagFounderPct: { type: 'number', description: 'Founder moonbag percentage' },
          winStart: { type: 'string', description: 'Window start date (YYYY-MM-DD)' },
          winEnd: { type: 'string', description: 'Window end date (YYYY-MM-DD)' }
        }
      },
      contributionChanges: {
        type: 'array',
        description: 'List of contribution modifications',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['add', 'modify', 'remove'], description: 'Type of change' },
            id: { type: 'string', description: 'Contribution ID (for modify/remove)' },
            contribution: {
              type: 'object',
              description: 'Contribution data (for add/modify)',
              properties: {
                name: { type: 'string' },
                date: { type: 'string' },
                amount: { type: 'number' },
                rule: { type: 'string', enum: ['net', 'gross'] },
                cls: { type: 'string', enum: ['founder', 'investor'] }
              }
            }
          }
        }
      }
    }
  },
  execute: ({ settingsChanges, contributionChanges }: {
    settingsChanges?: SettingsChanges;
    contributionChanges?: ContributionChange[];
  }) => {
    const store = useFundStore.getState();

    // Get current contributions
    let testContributions = [...store.contributions];

    // Apply contribution changes
    if (contributionChanges) {
      contributionChanges.forEach(change => {
        switch (change.action) {
          case 'add':
            if (change.contribution) {
              testContributions.push({
                id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: change.contribution.name || 'Simulated',
                date: change.contribution.date || '2025-01-01',
                amount: change.contribution.amount || 0,
                rule: change.contribution.rule || 'net',
                cls: change.contribution.cls || 'investor'
              });
            }
            break;
          case 'modify':
            if (change.id && change.contribution) {
              const index = testContributions.findIndex(c => c.id === change.id);
              if (index !== -1) {
                testContributions[index] = { ...testContributions[index], ...change.contribution };
              }
            }
            break;
          case 'remove':
            if (change.id) {
              testContributions = testContributions.filter(c => c.id !== change.id);
            }
            break;
        }
      });
    }

    return store.simulate({
      contributions: testContributions,
      settings: settingsChanges
    });
  }
};

/**
 * Apply suggested changes to the fund
 */
export const applyChangesTool: AITool = {
  name: 'apply_changes',
  description: 'Apply changes to the fund after user approval',
  parameters: {
    type: 'object',
    properties: {
      settingsChanges: {
        type: 'object',
        description: 'Settings to update'
      },
      contributionChanges: {
        type: 'array',
        description: 'Contribution changes to apply'
      },
      reason: {
        type: 'string',
        description: 'Explanation for the changes'
      }
    },
    required: ['reason']
  },
  execute: ({ settingsChanges, contributionChanges, reason }: {
    settingsChanges?: SettingsChanges;
    contributionChanges?: ContributionChange[];
    reason: string;
  }) => {
    const store = useFundStore.getState();

    // Apply settings changes
    if (settingsChanges) {
      store.updateSettings(settingsChanges);
    }

    // Apply contribution changes
    if (contributionChanges) {
      contributionChanges.forEach((change: ContributionChange) => {
        switch (change.action) {
          case 'add':
            if (change.contribution) {
              store.addContribution(change.contribution);
            }
            break;
          case 'modify':
            if (change.id && change.contribution) {
              store.updateContribution(change.id, change.contribution);
            }
            break;
          case 'remove':
            if (change.id) {
              store.removeContribution(change.id);
            }
            break;
        }
      });
    }

    return { success: true, reason, appliedAt: new Date().toISOString() };
  }
};

/**
 * Get validation issues and suggestions
 */
export const validateFundTool: AITool = {
  name: 'validate_fund',
  description: 'Run comprehensive validation and get issues with suggested fixes',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: (): ValidationIssue[] => {
    const store = useFundStore.getState();
    return store.validateData();
  }
};

/**
 * Quick fix for common validation issues
 */
export const quickFixTool: AITool = {
  name: 'quick_fix',
  description: 'Apply automatic fixes for common validation issues',
  parameters: {
    type: 'object',
    properties: {
      issueIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of validation issue IDs to fix'
      }
    },
    required: ['issueIds']
  },
  execute: ({ issueIds }: { issueIds: string[] }) => {
    const store = useFundStore.getState();
    const issues = store.validationIssues;
    const fixedIssues: string[] = [];

    issueIds.forEach(issueId => {
      const issue = issues.find(i => i.id === issueId);
      if (issue?.quickFix) {
        issue.quickFix();
        fixedIssues.push(issueId);
      }
    });

    return { fixedIssues, fixedCount: fixedIssues.length };
  }
};

/**
 * Get specific participant analysis
 */
export const analyzeParticipantTool: AITool = {
  name: 'analyze_participant',
  description: 'Get detailed analysis for a specific participant (founder or investor)',
  parameters: {
    type: 'object',
    properties: {
      participantName: {
        type: 'string',
        description: 'Name of the participant to analyze'
      }
    },
    required: ['participantName']
  },
  execute: ({ participantName }: { participantName: string }) => {
    const store = useFundStore.getState();

    // Find contributions for this participant
    const contributions = store.contributions.filter(c =>
      c.name.toLowerCase().includes(participantName.toLowerCase())
    );

    // Find results for this participant
    const results = store.results.filter(r =>
      r.name.toLowerCase().includes(participantName.toLowerCase())
    );

    if (contributions.length === 0 && results.length === 0) {
      return { error: `No participant found matching "${participantName}"` };
    }

    const analysis = {
      participantName,
      contributions,
      results: results[0] || null,
      totalContributed: contributions.reduce((sum, c) => sum + c.amount, 0),
      contributionDates: contributions.map(c => c.date).sort(),
      analysis: {
        isFounder: contributions.some(c => c.cls === 'founder'),
        contributionCount: contributions.length,
        averageContribution: contributions.length > 0 ? contributions.reduce((sum, c) => sum + c.amount, 0) / contributions.length : 0,
        firstContribution: contributions.length > 0 ? Math.min(...contributions.map(c => new Date(c.date).getTime())) : null,
        lastContribution: contributions.length > 0 ? Math.max(...contributions.map(c => new Date(c.date).getTime())) : null
      }
    };

    return analysis;
  }
};

/**
 * Export all AI tools
 */
export const aiTools: AITool[] = [
  getSnapshotTool,
  simulateTool,
  applyChangesTool,
  validateFundTool,
  quickFixTool,
  analyzeParticipantTool
];

/**
 * Get tool by name
 */
export const getAITool = (name: string): AITool | undefined => {
  return aiTools.find(tool => tool.name === name);
};

/**
 * Execute tool by name with parameters
 */
export const executeAITool = (name: string, parameters: Record<string, unknown> = {}) => {
  const tool = getAITool(name);
  if (!tool) {
    throw new Error(`Tool "${name}" not found`);
  }

  try {
    return tool.execute(parameters);
  } catch (error) {
    throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};