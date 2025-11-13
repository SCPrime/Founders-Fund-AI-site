'use client';

import { useAllocationStore } from '@/store/allocationStore';

export default function DiagnosticsPanel() {
  const { state, validationErrors, outputs } = useAllocationStore();

  const checks = [
    {
      name: 'Contributions Present',
      status: (state.contributions?.length || 0) > 0,
      message: state.contributions?.length
        ? `${state.contributions.length} contributions found`
        : 'No contributions found',
    },
    {
      name: 'Window Defined',
      status: !!(state.window?.start && state.window?.end),
      message:
        state.window?.start && state.window?.end
          ? `Window: ${state.window.start} to ${state.window.end}`
          : 'Allocation window not defined',
    },
    {
      name: 'Baseline Set',
      status: !!(
        state.constants.INVESTOR_SEED_BASELINE && Number(state.constants.INVESTOR_SEED_BASELINE) > 0
      ),
      message: state.constants.INVESTOR_SEED_BASELINE
        ? `Baseline: $${Number(state.constants.INVESTOR_SEED_BASELINE).toLocaleString()}`
        : 'Baseline not set',
    },
    {
      name: 'Wallet Size Set',
      status: !!(state.walletSizeEndOfWindow && Number(state.walletSizeEndOfWindow) > 0),
      message: state.walletSizeEndOfWindow
        ? `Wallet: $${Number(state.walletSizeEndOfWindow).toLocaleString()}`
        : 'Wallet size not set',
    },
    {
      name: 'Calculation Complete',
      status: !!outputs,
      message: outputs ? 'Allocation calculated successfully' : 'Calculation not run',
    },
    {
      name: 'No Validation Errors',
      status: validationErrors.length === 0,
      message:
        validationErrors.length === 0
          ? 'All validations passed'
          : `${validationErrors.length} validation error(s) found`,
    },
  ];

  const passed = checks.filter((c) => c.status).length;
  const total = checks.length;

  return (
    <div className="panel">
      <h2>Diagnostics — Presence</h2>

      <div className="mt-4">
        <div className="mb-4 p-4 bg-gray-800 rounded">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Overall Status</span>
            <span
              className={`text-2xl font-bold ${
                passed === total ? 'text-green-400' : 'text-yellow-400'
              }`}
            >
              {passed}/{total}
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${passed === total ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${(passed / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border ${
                check.status ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${check.status ? 'text-green-400' : 'text-red-400'}`}>
                    {check.status ? '✓' : '✗'}
                  </span>
                  <span className="font-medium">{check.name}</span>
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-400 ml-7">{check.message}</div>
            </div>
          ))}
        </div>

        {validationErrors.length > 0 && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded">
            <h3 className="font-semibold text-red-400 mb-2">Validation Errors</h3>
            <ul className="space-y-1 text-sm">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-red-300">
                  • {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
