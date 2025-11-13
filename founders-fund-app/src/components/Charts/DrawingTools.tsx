'use client';

import { useState } from 'react';
import { DrawingTool } from './types';

interface DrawingToolsProps {
  onToolSelect: (tool: DrawingTool['type'] | null) => void;
  onSave: (drawings: DrawingTool[]) => Promise<void>;
  onLoad: () => Promise<DrawingTool[]>;
  onClear: () => void;
  drawings: DrawingTool[];
}

const DRAWING_TOOLS: Array<{ type: DrawingTool['type']; label: string; icon: string }> = [
  { type: 'trendline', label: 'Trend Line', icon: '📈' },
  { type: 'horizontal', label: 'Horizontal Line', icon: '━' },
  { type: 'vertical', label: 'Vertical Line', icon: '┃' },
  { type: 'fibonacci', label: 'Fibonacci', icon: '📊' },
  { type: 'rectangle', label: 'Rectangle', icon: '▭' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'arrow', label: 'Arrow', icon: '→' },
];

export default function DrawingTools({
  onToolSelect,
  onSave,
  onLoad,
  onClear,
  drawings,
}: DrawingToolsProps) {
  const [selectedTool, setSelectedTool] = useState<DrawingTool['type'] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToolSelect = (tool: DrawingTool['type']) => {
    const newTool = selectedTool === tool ? null : tool;
    setSelectedTool(newTool);
    onToolSelect(newTool);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(drawings);
      alert('Drawings saved successfully!');
    } catch (error) {
      console.error('Failed to save drawings:', error);
      alert('Failed to save drawings');
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async () => {
    setLoading(true);
    try {
      await onLoad();
      alert('Drawings loaded successfully!');
    } catch (error) {
      console.error('Failed to load drawings:', error);
      alert('Failed to load drawings');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all drawings?')) {
      onClear();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
      >
        Drawing Tools {drawings.length > 0 && `(${drawings.length})`}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Drawing Tools</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {DRAWING_TOOLS.map((tool) => (
                <button
                  key={tool.type}
                  onClick={() => handleToolSelect(tool.type)}
                  className={`p-3 rounded border-2 transition-all ${
                    selectedTool === tool.type
                      ? 'border-purple-600 bg-purple-100 dark:bg-purple-900'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }`}
                >
                  <div className="text-2xl mb-1">{tool.icon}</div>
                  <div className="text-xs">{tool.label}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-300 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={saving || drawings.length === 0}
                className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {saving ? 'Saving...' : `Save Drawings (${drawings.length})`}
              </button>
              <button
                onClick={handleLoad}
                disabled={loading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Loading...' : 'Load Saved Drawings'}
              </button>
              <button
                onClick={handleClear}
                disabled={drawings.length === 0}
                className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                Clear All
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-semibold mb-1">How to use:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Select a tool from above</li>
                <li>Click on chart to place points</li>
                <li>Right-click to cancel drawing</li>
                <li>Drawings are saved per user/portfolio</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
