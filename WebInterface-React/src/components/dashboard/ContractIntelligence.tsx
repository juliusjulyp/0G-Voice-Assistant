import React, { useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { apiService } from '../../services/api';
import { ActivityItem } from '../../types';

interface ContractIntelligenceProps {
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void;
  notificationHook: {
    addNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  };
}

const ContractIntelligence: React.FC<ContractIntelligenceProps> = ({
  addActivity,
  notificationHook
}) => {
  const [contractAddress, setContractAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { contractAnalysis, setContractAnalysis } = useDashboardStore();

  const handleAnalyzeContract = async () => {
    if (!contractAddress || !contractAddress.startsWith('0x')) {
      notificationHook.addNotification('Please enter a valid contract address', 'error');
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await apiService.analyzeContract(contractAddress);

      if (result.success && result.data) {
        setContractAnalysis(result.data);
        
        addActivity({
          type: 'contract-analysis',
          text: `Contract analyzed: ${result.data.contractType || 'Unknown'}`,
          time: 'Just now',
          icon: 'fas fa-cube'
        });

        notificationHook.addNotification('Contract analysis completed successfully', 'success');
      } else {
        notificationHook.addNotification('Contract analysis failed', 'error');
      }
    } catch (error) {
      notificationHook.addNotification('Analysis failed. Please try again.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateTools = async () => {
    if (!contractAnalysis) return;

    try {
      const result = await apiService.generateContractTools(contractAnalysis.address);
      if (result.success) {
        notificationHook.addNotification('Contract tools generated successfully', 'success');
      }
    } catch (error) {
      notificationHook.addNotification('Tool generation failed', 'error');
    }
  };

  const handleViewFullAnalysis = () => {
    notificationHook.addNotification('Full analysis view coming soon!', 'info');
  };

  return (
    <div className="panel contract-intelligence">
      <h3 className="panel-title">
        <i className="fas fa-cube"></i>
        Contract Intelligence
      </h3>

      <div className="contract-input-section">
        <div className="input-group">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Enter contract address (0x...)"
            className="contract-input"
          />
          <button
            className="btn-primary"
            onClick={handleAnalyzeContract}
            disabled={isAnalyzing}
          >
            <i className={`fas ${isAnalyzing ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {contractAnalysis && (
        <div className="analysis-results">
          <div className="result-header">
            <h4>Analysis Complete</h4>
            <span className="analysis-time">
              Completed in {contractAnalysis.analysisTime}
            </span>
          </div>
          
          <div className="result-stats">
            <div className="result-stat">
              <span className="stat-value">{contractAnalysis.functions.length}</span>
              <span className="stat-label">Functions</span>
            </div>
            <div className="result-stat">
              <span className="stat-value">{contractAnalysis.toolsGenerated}</span>
              <span className="stat-label">Tools Generated</span>
            </div>
            <div className="result-stat">
              <span className="stat-value">{contractAnalysis.riskLevel}</span>
              <span className="stat-label">Risk Level</span>
            </div>
          </div>
          
          <div className="contract-actions">
            <button className="btn-secondary" onClick={handleGenerateTools}>
              <i className="fas fa-magic"></i>
              Generate Tools
            </button>
            <button className="btn-secondary" onClick={handleViewFullAnalysis}>
              <i className="fas fa-eye"></i>
              Full Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractIntelligence;