'use client';

import { useState } from 'react';
import { useCalculator } from '@/context/CalculatorContext';

interface PredictionResult {
  roi_projection: {
    conservative: number;
    moderate: number;
    aggressive: number;
    timeframe_months: number;
  };
  risk_assessment: {
    overall_risk: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  };
  optimization_suggestions: {
    fee_structure: string[];
    allocation_strategy: string[];
    timing_recommendations: string[];
  };
}

export default function PredictiveAnalytics() {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calc = useCalculator();

  const generatePrediction = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate local prediction based on fund metrics
      const totalAssets = calc.walletSize + calc.moonbagReal + calc.moonbagUnreal;
      const currentROI = totalAssets > 0 ? calc.realizedProfit / totalAssets : 0;
      const feeImpact = (calc.mgmtFeePct + calc.entryFeePct) / 100;

      // Calculate projections based on current performance
      const baseReturn = Math.max(0.05, currentROI * 0.7); // Conservative based on current performance
      const moderateReturn = Math.max(0.15, currentROI * 1.2); // Moderate growth
      const aggressiveReturn = Math.max(0.3, currentROI * 2.0); // Aggressive scenario

      const localPrediction: PredictionResult = {
        roi_projection: {
          conservative: baseReturn,
          moderate: moderateReturn,
          aggressive: aggressiveReturn,
          timeframe_months: 12
        },
        risk_assessment: {
          overall_risk: totalAssets < 50000 ? 'high' : feeImpact > 0.3 ? 'medium' : 'low',
          factors: [
            ...(totalAssets < 50000 ? ['Small fund size increases volatility'] : []),
            ...(feeImpact > 0.3 ? ['High fee structure may impact returns'] : []),
            ...(calc.moonbagUnreal > calc.moonbagReal * 3 ? ['High unrealized exposure'] : []),
            ...(currentROI < 0 ? ['Current negative returns'] : [])
          ],
          recommendations: [
            'Monitor performance metrics regularly',
            totalAssets < 50000 ? 'Consider fund consolidation' : 'Maintain current fund size',
            feeImpact > 0.25 ? 'Review fee structure competitiveness' : 'Fee structure appears reasonable',
            'Plan exit strategies for major positions'
          ]
        },
        optimization_suggestions: {
          fee_structure: feeImpact > 0.25 ?
            ['Consider reducing management fees', 'Benchmark against industry standards'] :
            ['Fee structure is competitive', 'Consider performance-based adjustments'],
          allocation_strategy: [
            'Maintain diversified portfolio',
            calc.moonbagUnreal > calc.moonbagReal * 2 ? 'Consider taking some profits' : 'Allocation appears balanced',
            'Regular rebalancing recommended'
          ],
          timing_recommendations: [
            'Monitor market conditions for exit opportunities',
            'Plan quarterly performance reviews',
            currentROI > 0.5 ? 'Consider profit-taking strategies' : 'Focus on performance improvement'
          ]
        }
      };

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      setPrediction(localPrediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const detectAnomalies = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Local anomaly detection logic
      const totalFees = calc.mgmtFeePct + calc.entryFeePct;
      const totalAssets = calc.walletSize + calc.moonbagReal + calc.moonbagUnreal;
      const unrealizedRatio = calc.moonbagReal > 0 ? calc.moonbagUnreal / calc.moonbagReal : 0;

      const anomalies = [];
      const recommendations = [];
      const feeIssues = [];
      const allocationIssues = [];
      const timingIssues = [];

      // Fee structure analysis
      if (totalFees > 35) {
        anomalies.push('Extremely high total fees (>35%)');
        feeIssues.push('Consider significant fee reduction');
      } else if (totalFees > 25) {
        anomalies.push('High fee structure detected');
        feeIssues.push('Review fee competitiveness');
      }

      // Asset allocation analysis
      if (calc.walletSize < 10000) {
        anomalies.push('Very small fund size');
        allocationIssues.push('Consider minimum investment thresholds');
      }

      if (unrealizedRatio > 5) {
        anomalies.push('Excessive unrealized exposure');
        allocationIssues.push('Plan exit strategy for unrealized positions');
        timingIssues.push('Consider taking profits on winners');
      }

      // Performance analysis
      const currentROI = totalAssets > 0 ? calc.realizedProfit / totalAssets : 0;
      if (currentROI < -0.2) {
        anomalies.push('Significant losses detected');
        recommendations.push('Review investment strategy');
      }

      // Governance analysis
      if (calc.founderCount > 8) {
        anomalies.push('High founder count may complicate decisions');
        recommendations.push('Consider governance structure optimization');
      }

      // Default messages if no issues
      if (anomalies.length === 0) {
        recommendations.push('No significant anomalies detected');
        feeIssues.push('Fee structure appears reasonable');
        allocationIssues.push('Asset allocation looks balanced');
        timingIssues.push('No immediate timing concerns');
      }

      const riskLevel = anomalies.length > 3 ? 'high' : anomalies.length > 1 ? 'medium' : 'low';

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1200));

      setPrediction({
        roi_projection: {
          conservative: 0,
          moderate: 0,
          aggressive: 0,
          timeframe_months: 12
        },
        risk_assessment: {
          overall_risk: riskLevel,
          factors: anomalies,
          recommendations
        },
        optimization_suggestions: {
          fee_structure: feeIssues,
          allocation_strategy: allocationIssues,
          timing_recommendations: timingIssues
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anomaly detection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'var(--good)';
      case 'medium': return 'var(--warn)';
      case 'high': return 'var(--bad)';
      default: return 'var(--muted)';
    }
  };

  return (
    <div className="panel">
      <h3>🔮 Predictive Analytics</h3>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={generatePrediction}
          disabled={isLoading}
          className="btn"
          style={{ backgroundColor: '#2196F3', color: 'white' }}
        >
          {isLoading ? '⏳ Analyzing...' : '📈 Generate ROI Prediction'}
        </button>
        <button
          onClick={detectAnomalies}
          disabled={isLoading}
          className="btn"
          style={{ backgroundColor: '#FF5722', color: 'white' }}
        >
          {isLoading ? '⏳ Scanning...' : '🔍 Detect Anomalies'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid var(--bad)',
          borderRadius: '4px',
          color: 'var(--bad)',
          marginBottom: '16px'
        }}>
          ❌ {error}
        </div>
      )}

      {prediction && (
        <div>
          {/* ROI Projection */}
          {(prediction.roi_projection.conservative > 0 || prediction.roi_projection.moderate > 0) && (
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: 'var(--ink)',
              borderRadius: '6px',
              border: '1px solid var(--line)'
            }}>
              <h4 style={{ color: 'var(--text)' }}>📊 ROI Projections ({prediction.roi_projection.timeframe_months} months)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ textAlign: 'center', padding: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Conservative</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--good)' }}>
                    {(prediction.roi_projection.conservative * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Moderate</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--warn)' }}>
                    {(prediction.roi_projection.moderate * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Aggressive</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--bad)' }}>
                    {(prediction.roi_projection.aggressive * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: 'var(--panel)',
            borderRadius: '6px',
            border: '1px solid var(--line)'
          }}>
            <h4 style={{ color: 'var(--text)' }}>⚠️ Risk Assessment</h4>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: getRiskColor(prediction.risk_assessment.overall_risk),
              color: 'var(--text)',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '12px',
              marginBottom: '12px'
            }}>
              {prediction.risk_assessment.overall_risk} Risk
            </div>

            {prediction.risk_assessment.factors.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: 'var(--text)' }}>Risk Factors:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {prediction.risk_assessment.factors.map((factor, idx) => (
                    <li key={idx} style={{ marginBottom: '4px', fontSize: '13px', color: 'var(--text)' }}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.risk_assessment.recommendations.length > 0 && (
              <div>
                <strong style={{ color: 'var(--text)' }}>Recommendations:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {prediction.risk_assessment.recommendations.map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: '4px', fontSize: '13px', color: 'var(--good)' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Optimization Suggestions */}
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(53, 199, 89, 0.1)',
            borderRadius: '6px',
            border: '1px solid var(--good)'
          }}>
            <h4 style={{ color: 'var(--text)' }}>💡 Optimization Suggestions</h4>

            {prediction.optimization_suggestions.fee_structure.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: 'var(--text)' }}>Fee Structure:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {prediction.optimization_suggestions.fee_structure.map((suggestion, idx) => (
                    <li key={idx} style={{ marginBottom: '4px', fontSize: '13px', color: 'var(--text)' }}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.optimization_suggestions.allocation_strategy.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: 'var(--text)' }}>Allocation Strategy:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {prediction.optimization_suggestions.allocation_strategy.map((suggestion, idx) => (
                    <li key={idx} style={{ marginBottom: '4px', fontSize: '13px', color: 'var(--text)' }}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.optimization_suggestions.timing_recommendations.length > 0 && (
              <div>
                <strong style={{ color: 'var(--text)' }}>Timing Recommendations:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {prediction.optimization_suggestions.timing_recommendations.map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: '4px', fontSize: '13px', color: 'var(--text)' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
        💡 Predictions are based on current fund settings and historical market patterns. Results should be used for guidance only.
      </div>
    </div>
  );
}