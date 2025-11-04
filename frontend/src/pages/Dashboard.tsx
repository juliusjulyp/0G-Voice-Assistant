import React, { useState } from 'react';
import { 
  Mic, 
  Zap, 
  Network, 
  Database, 
  Users,
  Server,
  Play,
  Settings,
  ExternalLink,
  Brain,
  MessageSquare,
  Activity,
  Layers
} from 'lucide-react';
import { VoiceInterface } from '../components/VoiceInterface';
import '../styles/dashboard.css';

const statsCards = [
  {
    title: 'Knowledge Base',
    value: '15',
    change: 'Entries',
    trend: 'stable',
    icon: Brain,
    color: 'blue'
  },
  {
    title: 'AI Models',
    value: '2',
    change: 'Available',
    trend: 'stable',
    icon: Zap,
    color: 'green'
  },
  {
    title: 'Network Status',
    value: 'dRPC',
    change: 'Connected',
    trend: 'up',
    icon: Network,
    color: 'purple'
  },
  {
    title: 'Chain ID',
    value: '16602',
    change: '0G Testnet',
    trend: 'stable',
    icon: Server,
    color: 'orange'
  }
];

const quickActions = [
  { icon: MessageSquare, label: 'Ask AI Assistant', description: 'Get help with 0G operations', action: 'ask-ai' },
  { icon: Mic, label: 'Voice Command', description: 'Use voice for commands', action: 'voice-command' },
  { icon: Zap, label: 'AI Inference', description: 'Run AI model inference', action: 'ai-inference' },
  { icon: Database, label: 'Storage Upload', description: 'Upload to 0G storage', action: 'storage-upload' },
  { icon: Network, label: 'Check Balance', description: 'View wallet balance', action: 'check-balance' },
  { icon: Settings, label: 'Developer Tools', description: 'Access development features', action: 'dev-tools' }
];

const recentActivity = [
  { type: 'ai', message: 'AI assistant answered: "What is 0G?"', time: '2 min ago' },
  { type: 'ai', message: 'AI model GPT-OSS-120B responded successfully', time: '5 min ago' },
  { type: 'storage', message: 'Uploaded training data to 0G storage', time: '8 min ago' },
  { type: 'network', message: '0G network connection established via dRPC', time: '12 min ago' },
  { type: 'ai', message: 'Knowledge base loaded: 15 entries', time: '15 min ago' }
];

export const Dashboard: React.FC = () => {
  const [commandInput, setCommandInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState('');

  const handleVoiceCommand = (command: string) => {
    setCommandInput(command);
    executeCommand(command);
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice error:', error);
  };

  const executeCommand = async (command: string) => {
    setIsProcessing(true);
    // Simulate AI processing
    setTimeout(() => {
      setResponse(`AI Assistant: Processed command "${command}"`);
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Welcome back, Julius</h1>
          <p className="page-subtitle">
            Your 0G Voice Assistant is ready. Start with voice commands or explore AI compute features.
          </p>
        </div>
        <button className="btn btn-primary">
          <Play size={16} />
          Start Voice Session
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.color}`}>
            <div className="stat-header">
              <stat.icon size={24} className="stat-icon" />
              <span className={`stat-change ${stat.trend}`}>
                {stat.change}
              </span>
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-title">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Command Interface */}
      <div className="command-section">
        <div className="card command-card">
          <div className="card-header">
            <h2>AI Voice Assistant</h2>
            <p>Ask questions or give commands about 0G operations</p>
          </div>
          <div className="command-interface">
            <div className="command-input-section">
              <textarea
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="e.g., 'Check balance of 0x123...' or 'Deploy AI model to 0G network'"
                className="command-textarea"
                rows={3}
              />
              <div className="command-controls">
                <VoiceInterface 
                  onVoiceCommand={handleVoiceCommand}
                  onError={handleVoiceError}
                  disabled={isProcessing}
                />
                <button 
                  className="btn btn-primary"
                  onClick={() => executeCommand(commandInput)}
                  disabled={isProcessing || !commandInput.trim()}
                >
                  {isProcessing ? 'Processing...' : 'Execute'}
                </button>
              </div>
            </div>
            {response && (
              <div className="command-response">
                <div className="response-content">{response}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h2>Quick Actions</h2>
            <p>Get started with these common tasks</p>
          </div>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <button key={index} className="action-card">
                <action.icon size={20} className="action-icon" />
                <div className="action-content">
                  <h4>{action.label}</h4>
                  <p>{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <button className="btn btn-ghost">
              View all
              <ExternalLink size={14} />
            </button>
          </div>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className={`activity-dot ${activity.type}`}></div>
                <div className="activity-content">
                  <p className="activity-message">{activity.message}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <h2>System Status</h2>
            <div className="status-indicator warning">
              <div className="status-dot"></div>
              Voice engine inactive
            </div>
          </div>
          <div className="status-list">
            <div className="status-item">
              <Server size={16} className="status-icon" />
              <span>0G Network</span>
              <span className="status-badge online">Online</span>
            </div>
            <div className="status-item">
              <Zap size={16} className="status-icon" />
              <span>AI Compute</span>
              <span className="status-badge online">Ready</span>
            </div>
            <div className="status-item">
              <Database size={16} className="status-icon" />
              <span>Storage</span>
              <span className="status-badge online">Connected</span>
            </div>
            <div className="status-item">
              <Mic size={16} className="status-icon" />
              <span>Voice Engine</span>
              <span className="status-badge offline">Inactive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};