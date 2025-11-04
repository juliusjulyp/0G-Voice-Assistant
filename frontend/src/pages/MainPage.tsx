import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Code, 
  Zap, 
  Shield, 
  Users, 
  ChevronRight, 
  Play, 
  ArrowRight,
  CheckCircle,
  Star,
  Brain,
  Network,
  Database,
  Terminal,
  Sparkles,
  Rocket,
  HeadphonesIcon,
  Book,
  ExternalLink,
  Search,
  BookOpen,
  Lightbulb
} from 'lucide-react';
import '../styles/main-page.css';

interface MainPageProps {
  onNavigate?: (page: string) => void;
}

export const MainPage: React.FC<MainPageProps> = ({ onNavigate }) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);

  useEffect(() => {
    setIsAnimated(true);
    
    // Cycle through demo interactions
    const demoInteractions = [
      { query: "What is 0G blockchain and how does it work?", type: "learn" },
      { query: "Show me how to deploy a smart contract on 0G", type: "build" },
      { query: "Explain 0G's AI compute capabilities", type: "explore" },
      { query: "Help me understand 0G storage network", type: "learn" }
    ];

    const interval = setInterval(() => {
      setActiveDemo((prev) => (prev + 1) % demoInteractions.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: MessageSquare,
      title: "Voice/Text Learning",
      description: "Ask questions about 0G ecosystem using natural language through voice or text input.",
      color: "blue"
    },
    {
      icon: BookOpen,
      title: "Interactive Exploration",
      description: "Discover 0G's blockchain, AI compute, and storage capabilities through guided conversations.",
      color: "green"
    },
    {
      icon: Brain,
      title: "AI-Powered Guidance",
      description: "Get personalized learning paths and explanations tailored to your experience level.",
      color: "purple"
    },
    {
      icon: Code,
      title: "Hands-on Building",
      description: "Learn by doing with step-by-step guidance for building on the 0G ecosystem.",
      color: "orange"
    },
    {
      icon: Network,
      title: "Deep 0G Integration",
      description: "Comprehensive coverage of 0G blockchain, storage network, and AI compute features.",
      color: "blue"
    },
    {
      icon: Lightbulb,
      title: "Adaptive Teaching",
      description: "AI assistant adapts explanations and examples based on your questions and progress.",
      color: "green"
    }
  ];

  const stats = [
    { number: "100+", label: "Topics Covered", icon: Book },
    { number: "24/7", label: "AI Assistant", icon: Brain },
    { number: "Real-time", label: "Updates", icon: Zap },
    { number: "0G", label: "Native", icon: Network }
  ];

  const useCases = [
    {
      title: "Learn 0G Ecosystem",
      description: "Understand 0G blockchain, storage, and AI compute through conversational learning",
      features: ["Blockchain fundamentals", "Storage network concepts", "AI compute capabilities", "Development tools"]
    },
    {
      title: "Build on 0G",
      description: "Get hands-on guidance for developing applications on the 0G ecosystem",
      features: ["Smart contract development", "dApp architecture", "Integration patterns", "Best practices"]
    },
    {
      title: "Explore Use Cases",
      description: "Discover real-world applications and possibilities within the 0G ecosystem",
      features: ["DeFi applications", "AI-powered dApps", "Storage solutions", "Cross-chain integration"]
    }
  ];

  return (
    <div className="main-page">
      {/* Navigation */}
      <nav className="main-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-icon">0G</div>
            <span className="brand-text">Voice Assistant</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#demo">Demo</a>
            <a href="#docs">Docs</a>
            <a href="#ecosystem">Ecosystem</a>
            <button className="nav-cta" onClick={() => onNavigate?.('dashboard')}>Launch Dashboard</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`hero ${isAnimated ? 'animated' : ''}`}>
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={16} />
              <span>AI-Powered 0G Learning Platform</span>
            </div>
            <h1 className="hero-title">
              Explore and build on{' '}
              <span className="gradient-text">0G ecosystem</span>{' '}
              with Voice/Text
            </h1>
            <p className="hero-subtitle">
              The first interactive AI assistant for learning and building on 0G blockchain. 
              Discover the ecosystem, understand concepts, and get hands-on guidance through 
              natural language conversations via voice or text.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => onNavigate?.('dashboard')}>
                <Play size={20} />
                Start Learning
              </button>
              <button className="btn-secondary" onClick={() => onNavigate?.('dashboard')}>
                <Search size={20} />
                Explore 0G
              </button>
            </div>
            <div className="hero-stats">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="stat">
                    <IconComponent size={20} />
                    <div className="stat-content">
                      <div className="stat-number">{stat.number}</div>
                      <div className="stat-label">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hero-visual">
            <div className="demo-window">
              <div className="demo-header">
                <div className="demo-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="demo-title">0G Learning Assistant</div>
              </div>
              <div className="demo-content">
                <div className="demo-interaction">
                  <div className="command-input">
                    <MessageSquare className="input-icon" size={16} />
                    <span className="command-text">
                      {activeDemo === 0 && "What is 0G blockchain and how does it work?"}
                      {activeDemo === 1 && "Show me how to deploy a smart contract on 0G"}
                      {activeDemo === 2 && "Explain 0G's AI compute capabilities"}
                      {activeDemo === 3 && "Help me understand 0G storage network"}
                    </span>
                  </div>
                  <div className="processing-indicator">
                    <div className="processing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span>Analyzing your question...</span>
                  </div>
                  <div className="result-output">
                    <Brain size={16} className="ai-icon" />
                    <span>✨ Let me explain 0G's unique architecture...</span>
                    <div className="response-preview">Interactive explanation ready</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-elements">
              <div className="float-card card-1">
                <BookOpen size={16} />
                <span>Learn</span>
              </div>
              <div className="float-card card-2">
                <Code size={16} />
                <span>Build</span>
              </div>
              <div className="float-card card-3">
                <Search size={16} />
                <span>Explore</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Learn, explore, and build on 0G</h2>
            <p>Interactive AI assistant helps you understand and develop on the 0G ecosystem</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className={`feature-card ${feature.color}`}>
                  <div className="feature-icon">
                    <IconComponent size={24} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <button className="feature-link">
                    Learn more <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="use-cases-section">
        <div className="container">
          <div className="section-header">
            <h2>Your gateway to the 0G ecosystem</h2>
            <p>From learning fundamentals to building advanced applications</p>
          </div>
          <div className="use-cases-grid">
            {useCases.map((useCase, index) => (
              <div key={index} className="use-case-card">
                <h3>{useCase.title}</h3>
                <p>{useCase.description}</p>
                <ul className="feature-list">
                  {useCase.features.map((feature, fIndex) => (
                    <li key={fIndex}>
                      <CheckCircle size={16} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className="use-case-cta" onClick={() => onNavigate?.('dashboard')}>
                  Start learning <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="demo-section">
        <div className="container">
          <div className="demo-content">
            <div className="demo-text">
              <h2>See how easy it is to learn 0G</h2>
              <p>Watch how the AI assistant helps you understand and build on the 0G ecosystem</p>
              <div className="demo-features">
                <div className="demo-feature">
                  <MessageSquare size={20} />
                  <span>Natural conversations</span>
                </div>
                <div className="demo-feature">
                  <Brain size={20} />
                  <span>Personalized learning</span>
                </div>
                <div className="demo-feature">
                  <Code size={20} />
                  <span>Hands-on examples</span>
                </div>
              </div>
              <button className="demo-cta">
                <Play size={20} />
                Watch demo
              </button>
            </div>
            <div className="demo-video">
              <div className="video-placeholder">
                <Play size={48} />
                <span>Learning Demo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 0G Ecosystem Section */}
      <section id="ecosystem" className="ecosystem-section">
        <div className="container">
          <div className="section-header">
            <h2>Explore the complete 0G ecosystem</h2>
            <p>Comprehensive coverage of all 0G network capabilities</p>
          </div>
          <div className="ecosystem-grid">
            <div className="ecosystem-card">
              <Network size={32} />
              <h3>0G Blockchain</h3>
              <p>Learn about the AI-native blockchain with modular architecture</p>
              <ul>
                <li>Parallel transaction processing</li>
                <li>Smart contract development</li>
                <li>Consensus mechanisms</li>
                <li>Network governance</li>
              </ul>
            </div>
            <div className="ecosystem-card">
              <Database size={32} />
              <h3>0G Storage</h3>
              <p>Understand decentralized storage solutions and data availability</p>
              <ul>
                <li>File storage protocols</li>
                <li>Data availability layers</li>
                <li>Merkle tree verification</li>
                <li>Storage economics</li>
              </ul>
            </div>
            <div className="ecosystem-card">
              <Brain size={32} />
              <h3>0G AI Compute</h3>
              <p>Discover on-chain AI model execution and compute markets</p>
              <ul>
                <li>AI model deployment</li>
                <li>Inference services</li>
                <li>Compute resource markets</li>
                <li>TEE integration</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to explore 0G?</h2>
            <p>Start your learning journey with our AI-powered assistant</p>
            <div className="cta-actions">
              <button className="btn-primary large" onClick={() => onNavigate?.('dashboard')}>
                <Rocket size={20} />
                Start Learning Free
              </button>
              <button className="btn-secondary large" onClick={() => onNavigate?.('dashboard')}>
                <Book size={20} />
                Browse Documentation
              </button>
            </div>
            <div className="cta-note">
              <span>🚀 Free access • No registration required • Start immediately</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand-icon">0G</div>
              <span className="brand-text">Voice Assistant</span>
              <p>Your AI guide to the 0G ecosystem</p>
            </div>
            <div className="footer-links">
              <div className="link-group">
                <h4>Learn</h4>
                <a href="#features">Features</a>
                <a href="#demo">Demo</a>
                <a href="#ecosystem">Ecosystem</a>
              </div>
              <div className="link-group">
                <h4>Build</h4>
                <a href="#docs">Documentation</a>
                <a href="#">Tutorials</a>
                <a href="#">Examples</a>
              </div>
              <div className="link-group">
                <h4>0G Network</h4>
                <a href="https://docs.0g.ai" target="_blank" rel="noopener noreferrer">Official Docs</a>
                <a href="https://0g.ai" target="_blank" rel="noopener noreferrer">Website</a>
                <a href="https://faucet.0g.ai" target="_blank" rel="noopener noreferrer">Faucet</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 0G Voice Assistant. All rights reserved.</p>
            <div className="footer-social">
              <a href="#" aria-label="Twitter">
                <ExternalLink size={16} />
              </a>
              <a href="#" aria-label="GitHub">
                <ExternalLink size={16} />
              </a>
              <a href="#" aria-label="Discord">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};