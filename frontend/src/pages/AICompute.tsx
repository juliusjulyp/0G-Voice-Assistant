import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  Activity, 
  Lightbulb, 
  Clock, 
  Layers,
  Database,
  TrendingUp,
  RefreshCw,
  Wallet,
  Play
} from 'lucide-react';

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

interface WalletState {
  connected: boolean;
  address: string;
  chainId: number;
  balance: string;
}

interface AITestResult {
  id: string;
  model: string;
  prompt: string;
  response: string;
  timestamp: number;
  verified: boolean;
  cost?: number;
}

export const AICompute: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [memoryStats, setMemoryStats] = useState<AIMemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: '',
    chainId: 0,
    balance: '0'
  });
  const [aiClient, setAiClient] = useState<any>(null);
  const [brokerInitialized, setBrokerInitialized] = useState(false);
  const [testPrompt, setTestPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-oss-120b');
  const [aiTestResults, setAiTestResults] = useState<AITestResult[]>([]);
  const [testing, setTesting] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    setTimeout(() => {
      setMemoryStats({
        userId: 'dashboard_user',
        shortTermMemory: 0,
        longTermPatterns: 0,
        contractKnowledge: 23,
        learningEnabled: true,
        memoryUtilization: {
          shortTerm: '78%',
          longTerm: 67,
          avgPatternConfidence: 0.87
        }
      });

      setInsights([]);

      setLoading(false);
    }, 1500);
  }, []);

  // Browser wallet integration
  useEffect(() => {
    const initializeBrowser0G = async () => {
      try {
        // Use regular import to avoid webpack chunk loading issues
        const Browser0GModule = await import('../browser-0g-inference-client');
        const Browser0GInferenceClient = Browser0GModule.default;
        const client = new Browser0GInferenceClient();
        setAiClient(client);
        console.log('✅ 0G Client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize 0G client:', error);
        console.error('Error details:', error);
        // Try fallback initialization
        try {
          const { Browser0GInferenceClient } = require('../browser-0g-inference-client');
          const client = new Browser0GInferenceClient();
          setAiClient(client);
          console.log('✅ 0G Client initialized successfully (fallback)');
        } catch (fallbackError) {
          console.error('❌ Fallback initialization also failed:', fallbackError);
        }
      }
    };

    initializeBrowser0G();
  }, []);

  const connectWallet = async () => {
    console.log('🎯 Connect wallet button clicked');
    console.log('AI Client available:', !!aiClient);
    
    if (!aiClient) {
      console.error('❌ AI Client not initialized');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Calling aiClient.connectWallet()...');
      const walletInfo = await aiClient.connectWallet();
      console.log('📱 Wallet info received in React:', walletInfo);
      setWallet({
        connected: walletInfo.connected,
        address: walletInfo.address,
        chainId: walletInfo.chainId,
        balance: walletInfo.balance
      });
      console.log('📱 Wallet state set:', {
        connected: walletInfo.connected,
        address: walletInfo.address,
        chainId: walletInfo.chainId,
        balance: walletInfo.balance
      });
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const initializeBroker = async () => {
    if (!aiClient || !wallet.connected) return;

    try {
      setLoading(true);
      await aiClient.initializeBroker();
      setBrokerInitialized(true);
    } catch (error) {
      console.error('Broker initialization failed:', error);
      alert('Failed to initialize 0G broker: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const switchTo0GNetwork = async () => {
    if (!aiClient) return;

    try {
      await aiClient.switchTo0GNetwork();
      // Refresh wallet info after network switch
      if (wallet.connected) {
        const walletInfo = await aiClient.connectWallet();
        setWallet({
          connected: walletInfo.connected,
          address: walletInfo.address,
          chainId: walletInfo.chainId,
          balance: walletInfo.balance
        });
      }
    } catch (error) {
      console.error('Network switch failed:', error);
      alert('Failed to switch to 0G network: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // 0G Knowledge Base for enhanced responses
  const ZG_KNOWLEDGE_BASE = [
    {
      keywords: ['0g', 'zerog', 'zero gravity', 'what is'],
      response: "I'm the 0G Voice Assistant! 0G is a modular AI blockchain designed specifically for AI and data-intensive applications with decentralized storage, AI compute network, and fast consensus."
    },
    {
      keywords: ['storage', 'how does', 'files'],
      response: "0G storage uses a decentralized network where files are split into chunks and distributed across multiple storage nodes with merkle tree verification for data integrity."
    },
    {
      keywords: ['models', 'ai', 'llama', 'mistral'],
      response: "0G supports Llama 3 (8B/70B), Mistral 7B, GPT-OSS-120B, and DeepSeek-R1-70B. You can also fine-tune custom models using our distributed GPU network."
    },
    {
      keywords: ['wallet', 'connect', 'metamask'],
      response: "Connect to 0G Galileo Testnet: Chain ID 16602, RPC: https://evmrpc-testnet.0g.ai, Symbol: 0G. Get testnet tokens from faucet.0g.ai!"
    },
    {
      keywords: ['who are you', 'assistant', 'help'],
      response: "I'm the 0G Voice Assistant! I specialize in the 0G blockchain ecosystem - technology, wallet setup, AI services, storage, and development."
    }
  ];

  // Enhanced prompt function
  const enhancePromptWithZGKnowledge = (userPrompt: string): string => {
    const promptLower = userPrompt.toLowerCase();
    
    // Find relevant 0G knowledge
    const relevantKnowledge = ZG_KNOWLEDGE_BASE.find(item =>
      item.keywords.some(keyword => promptLower.includes(keyword))
    );

    if (relevantKnowledge) {
      return `You are the 0G Voice Assistant. Based on this knowledge: "${relevantKnowledge.response}" Please respond to: ${userPrompt}`;
    }

    return `You are the 0G Voice Assistant, specialized in the 0G blockchain ecosystem. Respond to: ${userPrompt}`;
  };

  const testAIInference = async () => {
    if (!aiClient || !brokerInitialized || !testPrompt.trim()) return;

    setTesting(true);
    try {
      // Enhance prompt with 0G knowledge
      const enhancedPrompt = enhancePromptWithZGKnowledge(testPrompt);
      
      const response = await aiClient.runInference({
        model: selectedModel,
        messages: [{ role: 'user', content: enhancedPrompt }],
        max_tokens: 200,
        temperature: 0.7
      });

      const testResult: AITestResult = {
        id: response.id,
        model: selectedModel,
        prompt: testPrompt,
        response: response.choices[0].message.content,
        timestamp: Date.now(),
        verified: response.verified || false,
        cost: response.cost
      };

      setAiTestResults(prev => [testResult, ...prev]);
      setTestPrompt('');
    } catch (error) {
      console.error('AI inference failed:', error);
      alert('AI inference failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  const refreshData = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => setLoading(false), 1000);
  };

  if (loading) {
    return (
      <div className="ai-compute">
        <div className="page-header">
          <h1>AI Compute Dashboard</h1>
          <p className="page-subtitle">
            Monitor AI learning patterns and 0G compute utilization
          </p>
        </div>
        <div className="loading-state">
          <RefreshCw className="animate-spin" size={32} />
          <p>Loading AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-compute">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>AI Compute Dashboard</h1>
          <p className="page-subtitle">
            Monitor AI learning patterns and 0G compute utilization
          </p>
        </div>
        <button onClick={refreshData} className="btn btn-primary">
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>

      {/* Browser Wallet Integration */}
      <div className="card wallet-integration-card">
        <div className="card-header">
          <h2>
            <Wallet size={20} />
            0G Browser Wallet Integration
          </h2>
          <p>Connect your wallet and initialize 0G AI broker for real inference</p>
        </div>

        <div className="wallet-controls">
          {!wallet.connected ? (
            <div className="wallet-connect-section">
              <button onClick={connectWallet} className="btn btn-primary" disabled={!aiClient}>
                <Wallet size={16} />
                Connect MetaMask Wallet
              </button>
              {!aiClient && <p className="text-warning">Initializing 0G client...</p>}
            </div>
          ) : (
            <div className="wallet-connected-section">
              <div className="wallet-info">
                <div className="wallet-address">
                  <strong>Connected:</strong> {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </div>
                <div className="wallet-network">
                  <strong>Chain ID:</strong> {wallet.chainId}
                  {wallet.chainId !== 16602 && (
                    <button onClick={switchTo0GNetwork} className="btn btn-warning btn-sm">
                      Switch to 0G Network
                    </button>
                  )}
                  {wallet.chainId === 16602 && (
                    <span className="text-success">✅ Connected to 0G Galileo Testnet</span>
                  )}
                </div>
                <div className="wallet-balance">
                  <strong>Balance:</strong> {(parseFloat(wallet.balance) / 1e18).toFixed(4)} 0G
                </div>
              </div>

              {!brokerInitialized ? (
                <button onClick={initializeBroker} className="btn btn-success">
                  <Zap size={16} />
                  Initialize 0G Broker
                </button>
              ) : (
                <div className="broker-status">
                  <div className="status-indicator active">
                    <Activity size={16} />
                    0G Broker Ready
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Testing Interface - Only show when broker is ready */}
      {brokerInitialized && (
        <div className="card ai-testing-card">
          <div className="card-header">
            <h2>
              <Brain size={20} />
              Test Real 0G AI Models
            </h2>
            <p>Test your 0G AI models with real inference</p>
          </div>

          <div className="ai-test-controls">
            <div className="model-selection">
              <label>Select Model:</label>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="model-select"
              >
                <option value="gpt-oss-120b">GPT-OSS-120B</option>
                <option value="deepseek-r1-70b">DeepSeek-R1-70B</option>
              </select>
            </div>

            <div className="prompt-input">
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter your prompt for AI inference..."
                className="prompt-textarea"
                rows={3}
              />
            </div>

            <button 
              onClick={testAIInference} 
              disabled={testing || !testPrompt.trim()}
              className="btn btn-primary"
            >
              {testing ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Running Inference...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Test AI Inference
                </>
              )}
            </button>
          </div>

          {/* Quick 0G Test Questions */}
          <div className="quick-tests">
            <h4>🚀 Try These 0G Questions:</h4>
            <div className="quick-test-buttons">
              {[
                "What is 0G?",
                "How does 0G storage work?", 
                "What AI models are available?",
                "Who are you?",
                "How do I connect my wallet?"
              ].map((question) => (
                <button
                  key={question}
                  onClick={() => setTestPrompt(question)}
                  className="quick-test-btn"
                  disabled={testing}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* AI Test Results */}
          {aiTestResults.length > 0 && (
            <div className="ai-test-results">
              <h3>Recent AI Inference Results</h3>
              {aiTestResults.slice(0, 3).map((result) => (
                <div key={result.id} className="test-result-card">
                  <div className="result-header">
                    <div className="result-model">
                      <strong>{result.model}</strong>
                      {result.verified && <span className="verified-badge">✓ Verified</span>}
                    </div>
                    <div className="result-timestamp">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="result-prompt">
                    <strong>Prompt:</strong> {result.prompt}
                  </div>
                  <div className="result-response">
                    <strong>Response:</strong> {result.response}
                  </div>
                  {result.cost && (
                    <div className="result-cost">
                      <strong>Cost:</strong> {result.cost} 0G
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Brain Status */}
      <div className="card ai-brain-card">
        <div className="ai-brain-header">
          <div className="brain-icon">
            <Brain size={40} />
            {memoryStats?.learningEnabled && (
              <div className="learning-pulse"></div>
            )}
          </div>
          <div className="brain-status">
            <h2>AI Learning Engine</h2>
            <div className={`status ${memoryStats?.learningEnabled ? 'active' : 'inactive'}`}>
              <Activity size={16} />
              {memoryStats?.learningEnabled ? 'Active Learning' : 'Inactive'}
            </div>
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
      </div>

      {/* Memory Statistics */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-header">
            <Clock size={24} className="stat-icon" />
            <span className="stat-change up">+12%</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{memoryStats?.shortTermMemory}</h3>
            <p className="stat-title">Short-term Memory</p>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-header">
            <Layers size={24} className="stat-icon" />
            <span className="stat-change up">+23</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{memoryStats?.longTermPatterns}</h3>
            <p className="stat-title">Learned Patterns</p>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-header">
            <Database size={24} className="stat-icon" />
            <span className="stat-change up">+8</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{memoryStats?.contractKnowledge}</h3>
            <p className="stat-title">Contract Knowledge</p>
          </div>
        </div>
      </div>

      {/* Learning Insights */}
      <div className="card">
        <div className="card-header">
          <h2>
            <Lightbulb size={20} />
            Recent Learning Insights
          </h2>
          <p>AI-discovered patterns and optimization opportunities</p>
        </div>

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
                  <TrendingUp size={16} />
                  {insight.recommendation}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-insights">
            <Brain size={48} />
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