import React, { useState, useRef } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';

interface ContractAnalysis {
  success: boolean;
  contractInfo?: {
    address: string;
    verified: boolean;
    functions: Array<{
      name: string;
      inputs: Array<{ type: string; name: string }>;
      stateMutability: string;
      type: string;
    }>;
    events: Array<{
      name: string;
      inputs: Array<{ type: string; name: string; indexed: boolean }>;
    }>;
  };
  suggestions: string[];
  confidence: number;
  error?: string;
}

interface GeneratedTool {
  name: string;
  description: string;
  category: 'read' | 'write' | 'payable';
  inputSchema: any;
}

interface ToolGenerationResult {
  success: boolean;
  tools: GeneratedTool[];
  warnings: string[];
  error?: string;
}

const ContractPlayground: React.FC = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTools, setIsGeneratingTools] = useState(false);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [generatedTools, setGeneratedTools] = useState<GeneratedTool[]>([]);
  const [activeTab, setActiveTab] = useState<'analysis' | 'tools' | 'testing'>('analysis');
  const [analysisTime, setAnalysisTime] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Popular contract examples for quick testing
  const exampleContracts = [
    {
      name: 'USDT Token',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      description: 'Tether USD Stablecoin'
    },
    {
      name: 'Uniswap V2 Router',
      address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      description: 'DEX Router Contract'
    },
    {
      name: 'OpenSea Registry',
      address: '0xa5409ec958c83c3f309868babaca7c86dcb077c1',
      description: 'NFT Marketplace Registry'
    }
  ];

  const handleAnalyze = async () => {
    if (!contractAddress.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysis(null);
    setGeneratedTools([]);
    const startTime = Date.now();
    
    try {
      const result = await apiService.analyzeContract(contractAddress.trim());
      setAnalysis(result);
      setAnalysisTime(Date.now() - startTime);
      
      if (result.success) {
        setActiveTab('analysis');
      }
    } catch (error) {
      setAnalysis({
        success: false,
        error: 'Failed to analyze contract',
        suggestions: ['Check your internet connection', 'Verify the contract address'],
        confidence: 0
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateTools = async () => {
    if (!analysis?.success) return;
    
    setIsGeneratingTools(true);
    
    try {
      const result: ToolGenerationResult = await apiService.generateContractTools(contractAddress.trim());
      
      if (result.success) {
        setGeneratedTools(result.tools);
        setActiveTab('tools');
      }
    } catch (error) {
      console.error('Tool generation failed:', error);
    } finally {
      setIsGeneratingTools(false);
    }
  };

  const selectExampleContract = (address: string) => {
    setContractAddress(address);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const clearResults = () => {
    setContractAddress('');
    setAnalysis(null);
    setGeneratedTools([]);
    setActiveTab('analysis');
  };

  return (
    <div className="contract-playground">
      {/* Header */}
      <div className="playground-header">
        <div className="header-content">
          <h3>
            <i className="fas fa-play-circle"></i>
            Interactive Contract Playground
          </h3>
          <p>Analyze any smart contract and generate tools instantly</p>
        </div>
        <div className="playground-stats">
          <div className="stat">
            <span className="stat-value">3s</span>
            <span className="stat-label">Avg Analysis</span>
          </div>
          <div className="stat">
            <span className="stat-value">25+</span>
            <span className="stat-label">Tools Generated</span>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="contract-input-section">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter contract address (0x...)"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="contract-address-input"
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <div className="input-actions">
            <Button
              onClick={handleAnalyze}
              disabled={!contractAddress.trim() || isAnalyzing}
              variant="primary"
              size="sm"
            >
              {isAnalyzing ? (
                <>
                  <LoadingSpinner size="sm" />
                  Analyzing...
                </>
              ) : (
                <>
                  <i className="fas fa-search"></i>
                  Analyze
                </>
              )}
            </Button>
            {(analysis || contractAddress) && (
              <Button
                onClick={clearResults}
                variant="secondary"
                size="sm"
              >
                <i className="fas fa-times"></i>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Example Contracts */}
        <div className="example-contracts">
          <span className="examples-label">Try these examples:</span>
          <div className="examples-list">
            {exampleContracts.map((contract, index) => (
              <button
                key={index}
                className="example-btn"
                onClick={() => selectExampleContract(contract.address)}
              >
                <span className="example-name">{contract.name}</span>
                <span className="example-desc">{contract.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {(analysis || generatedTools.length > 0) && (
        <div className="results-section">
          {/* Tabs */}
          <div className="results-tabs">
            <button
              className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
              disabled={!analysis}
            >
              <i className="fas fa-chart-line"></i>
              Analysis
              {analysis?.success && (
                <span className="tab-badge">{analysis.contractInfo?.functions.length || 0}</span>
              )}
            </button>
            <button
              className={`tab ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
              disabled={generatedTools.length === 0}
            >
              <i className="fas fa-tools"></i>
              Generated Tools
              {generatedTools.length > 0 && (
                <span className="tab-badge">{generatedTools.length}</span>
              )}
            </button>
            <button
              className={`tab ${activeTab === 'testing' ? 'active' : ''}`}
              onClick={() => setActiveTab('testing')}
              disabled={!analysis?.success}
            >
              <i className="fas fa-flask"></i>
              Testing
              <span className="tab-badge coming-soon-badge">Soon</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Analysis Results */}
            {activeTab === 'analysis' && analysis && (
              <div className="analysis-results">
                {analysis.success ? (
                  <>
                    <div className="analysis-header">
                      <div className="contract-info">
                        <h4>Contract Analysis Complete</h4>
                        <div className="contract-meta">
                          <span className="address">{analysis.contractInfo?.address}</span>
                          <span className={`verification ${analysis.contractInfo?.verified ? 'verified' : 'unverified'}`}>
                            <i className={`fas ${analysis.contractInfo?.verified ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
                            {analysis.contractInfo?.verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </div>
                      <div className="analysis-metrics">
                        <div className="metric">
                          <span className="metric-value">{analysisTime}ms</span>
                          <span className="metric-label">Analysis Time</span>
                        </div>
                        <div className="metric">
                          <span className="metric-value">{Math.round(analysis.confidence * 100)}%</span>
                          <span className="metric-label">Confidence</span>
                        </div>
                      </div>
                    </div>

                    <div className="analysis-stats">
                      <div className="stat-item">
                        <i className="fas fa-code"></i>
                        <span className="stat-value">{analysis.contractInfo?.functions.length || 0}</span>
                        <span className="stat-label">Functions</span>
                      </div>
                      <div className="stat-item">
                        <i className="fas fa-bolt"></i>
                        <span className="stat-value">{analysis.contractInfo?.events.length || 0}</span>
                        <span className="stat-label">Events</span>
                      </div>
                      <div className="stat-item">
                        <i className="fas fa-shield-alt"></i>
                        <span className="stat-value">
                          {analysis.contractInfo?.verified ? 'High' : 'Low'}
                        </span>
                        <span className="stat-label">Security</span>
                      </div>
                    </div>

                    {/* Functions List */}
                    {analysis.contractInfo?.functions && analysis.contractInfo.functions.length > 0 && (
                      <div className="functions-section">
                        <h5>
                          <i className="fas fa-list"></i>
                          Contract Functions
                        </h5>
                        <div className="functions-grid">
                          {analysis.contractInfo.functions.slice(0, 8).map((func, index) => (
                            <div key={index} className="function-card">
                              <div className="function-header">
                                <span className="function-name">{func.name}</span>
                                <span className={`function-type ${func.stateMutability}`}>
                                  {func.stateMutability}
                                </span>
                              </div>
                              <div className="function-inputs">
                                {func.inputs.length > 0 ? (
                                  func.inputs.map((input, i) => (
                                    <span key={i} className="input-type">
                                      {input.type}
                                    </span>
                                  ))
                                ) : (
                                  <span className="no-inputs">No inputs</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {analysis.contractInfo.functions.length > 8 && (
                          <div className="functions-more">
                            +{analysis.contractInfo.functions.length - 8} more functions
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="analysis-actions">
                      <Button
                        onClick={handleGenerateTools}
                        disabled={isGeneratingTools}
                        variant="primary"
                      >
                        {isGeneratingTools ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Generating Tools...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-magic"></i>
                            Generate Tools
                          </>
                        )}
                      </Button>
                      <Button variant="secondary" disabled>
                        <i className="fas fa-flask"></i>
                        Run Tests (Coming Soon)
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="analysis-error">
                    <i className="fas fa-exclamation-circle"></i>
                    <h4>Analysis Failed</h4>
                    <p>{analysis.error}</p>
                    <div className="suggestions">
                      <h5>Suggestions:</h5>
                      <ul>
                        {analysis.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generated Tools */}
            {activeTab === 'tools' && generatedTools.length > 0 && (
              <div className="generated-tools">
                <div className="tools-header">
                  <h4>
                    <i className="fas fa-tools"></i>
                    Generated Tools ({generatedTools.length})
                  </h4>
                  <p>Interactive tools automatically created for this contract</p>
                </div>

                <div className="tools-categories">
                  {['read', 'write', 'payable'].map(category => {
                    const categoryTools = generatedTools.filter(tool => tool.category === category);
                    if (categoryTools.length === 0) return null;

                    return (
                      <div key={category} className="tool-category">
                        <h5 className={`category-header ${category}`}>
                          <i className={`fas ${
                            category === 'read' ? 'fa-eye' : 
                            category === 'write' ? 'fa-edit' : 'fa-dollar-sign'
                          }`}></i>
                          {category.charAt(0).toUpperCase() + category.slice(1)} Functions ({categoryTools.length})
                        </h5>
                        <div className="tools-list">
                          {categoryTools.map((tool, index) => (
                            <div key={index} className={`tool-item ${category}`}>
                              <div className="tool-info">
                                <span className="tool-name">{tool.name}</span>
                                <span className="tool-description">{tool.description}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled
                              >
                                Try Tool (Coming Soon)
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Testing Tab */}
            {activeTab === 'testing' && (
              <div className="testing-section">
                <div className="coming-soon-content">
                  <i className="fas fa-flask"></i>
                  <h4>Contract Testing Suite</h4>
                  <p>Automated security analysis and function testing coming soon!</p>
                  <div className="features-preview">
                    <div className="feature">
                      <i className="fas fa-shield-alt"></i>
                      Security Analysis
                    </div>
                    <div className="feature">
                      <i className="fas fa-bug"></i>
                      Vulnerability Detection
                    </div>
                    <div className="feature">
                      <i className="fas fa-gas-pump"></i>
                      Gas Optimization
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractPlayground;