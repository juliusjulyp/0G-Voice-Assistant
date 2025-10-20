import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';

interface AIInsight {
  pattern: string;
  frequency: number;
  success_rate: number;
  gas_optimization: number;
  recommendation: string;
}

interface AIMemoryStats {
  userId: string;
  shortTermMemory: number;
  longTermPatterns: number;
  contractKnowledge: number;
  learningEnabled: boolean;
  memoryUtilization: {
    shortTerm: string;
    longTerm: number;
    avgPatternConfidence: number;
  };
}

const LiveAIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [memoryStats, setMemoryStats] = useState<AIMemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAIData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAIData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAIData = async () => {
    try {
      setError(null);
      const [insightsResult, memoryResult] = await Promise.all([
        apiService.getLearningInsights(),
        apiService.getMemoryStats()
      ]);

      if (insightsResult.success) {
        setInsights(insightsResult.insights || []);
      }

      if (memoryResult.success) {
        setMemoryStats(memoryResult.stats);
      }
    } catch (err) {
      setError('Failed to fetch AI data');
      console.error('AI data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-insights-loading">
        <LoadingSpinner size="md" text="Loading AI insights..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-insights-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button onClick={fetchAIData} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="live-ai-insights">
      {/* AI Brain Header */}
      <div className="ai-brain-header">
        <div className="brain-icon">
          <i className="fas fa-brain"></i>
          {memoryStats?.learningEnabled && (
            <div className="learning-pulse"></div>
          )}
        </div>
        <div className="brain-status">
          <h3>AI Learning Engine</h3>
          <p className={`status ${memoryStats?.learningEnabled ? 'active' : 'inactive'}`}>
            {memoryStats?.learningEnabled ? 'Active Learning' : 'Inactive'}
          </p>
        </div>
        <div className="confidence-meter">
          <div className="confidence-label">Confidence</div>
          <div className="confidence-bar">
            <div 
              className="confidence-fill" 
              style={{ 
                width: `${(memoryStats?.memoryUtilization.avgPatternConfidence || 0) * 100}%` 
              }}
            ></div>
          </div>
          <div className="confidence-value">
            {Math.round((memoryStats?.memoryUtilization.avgPatternConfidence || 0) * 100)}%
          </div>
        </div>
      </div>

      {/* Memory Statistics */}
      {memoryStats && (
        <div className="memory-stats-grid">
          <div className="memory-stat">
            <div className="stat-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{memoryStats.shortTermMemory}</div>
              <div className="stat-label">Short-term Memory</div>
            </div>
          </div>
          
          <div className="memory-stat">
            <div className="stat-icon">
              <i className="fas fa-layer-group"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{memoryStats.longTermPatterns}</div>
              <div className="stat-label">Learned Patterns</div>
            </div>
          </div>
          
          <div className="memory-stat">
            <div className="stat-icon">
              <i className="fas fa-cube"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{memoryStats.contractKnowledge}</div>
              <div className="stat-label">Contract Knowledge</div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Insights */}
      <div className="insights-section">
        <h4>
          <i className="fas fa-lightbulb"></i>
          Recent Learning Insights
        </h4>
        
        {insights.length > 0 ? (
          <div className="insights-list">
            {insights.map((insight, index) => (
              <div key={index} className="insight-card">
                <div className="insight-header">
                  <div className="insight-pattern">{insight.pattern}</div>
                  <div className="insight-frequency">
                    {insight.frequency} uses
                  </div>
                </div>
                
                <div className="insight-metrics">
                  <div className="metric">
                    <div className="metric-label">Success Rate</div>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill success" 
                        style={{ width: `${insight.success_rate * 100}%` }}
                      ></div>
                    </div>
                    <div className="metric-value">
                      {Math.round(insight.success_rate * 100)}%
                    </div>
                  </div>
                  
                  <div className="metric">
                    <div className="metric-label">Gas Optimization</div>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill optimization" 
                        style={{ width: `${insight.gas_optimization}%` }}
                      ></div>
                    </div>
                    <div className="metric-value">
                      {insight.gas_optimization.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="insight-recommendation">
                  <i className="fas fa-arrow-right"></i>
                  {insight.recommendation}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-insights">
            <i className="fas fa-seedling"></i>
            <p>AI is learning from your interactions...</p>
            <p className="hint">Try analyzing contracts or using tools to generate insights!</p>
          </div>
        )}
      </div>

      {/* Real-time Learning Indicator */}
      <div className="learning-indicator">
        <div className="learning-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span>Continuously learning and improving...</span>
      </div>
    </div>
  );
};

export default LiveAIInsights;