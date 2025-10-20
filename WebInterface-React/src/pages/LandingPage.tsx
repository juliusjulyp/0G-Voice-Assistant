import React, { useEffect } from 'react';
import Navigation from '../components/Navigation';

const LandingPage: React.FC = () => {
  useEffect(() => {
    // Initialize animations and interactions
    const initializeAnimations = () => {
      // Particle animation
      const container = document.querySelector('.hero-bg-animation');
      if (container) {
        for (let i = 0; i < 20; i++) {
          const particle = document.createElement('div');
          particle.className = 'particle';
          particle.style.left = Math.random() * 100 + '%';
          particle.style.animationDelay = Math.random() * 20 + 's';
          particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
          container.appendChild(particle);
        }
      }

      // Demo simulation
      simulateDemo();
      
      // Cycle demo commands
      const commands = [
        "Deploy an ERC20 token called MyToken with 1000 total supply",
        "Call the transfer function to send 100 tokens to 0x742d...35cc",
        "Check my current 0G balance",
        "Show me the 0G visualization for recent transactions"
      ];
      
      let currentCommand = 0;
      const cycleDemoCommands = () => {
        const voiceText = document.querySelector('.voice-text');
        if (voiceText && commands.length > 0) {
          const command = commands[currentCommand] || commands[0] || "Hello, I'm your 0G Voice Assistant";
          typeWriter(voiceText as HTMLElement, command);
          currentCommand = (currentCommand + 1) % commands.length;
        }
      };

      cycleDemoCommands();
      const intervalId = setInterval(cycleDemoCommands, 15000);

      return () => clearInterval(intervalId);
    };

    // Tab functionality for learning conversations
    const initializeTabs = () => {
      const tabBtns = document.querySelectorAll('.tab-btn');
      const tabContents = document.querySelectorAll('.tab-content');
      
      tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          
          if (!targetTab) return;
          
          // Remove active class from all tabs and content
          tabBtns.forEach(b => b.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));
          
          // Add active class to clicked tab
          btn.classList.add('active');
          
          // Show corresponding content
          const targetContent = document.getElementById(targetTab);
          if (targetContent) {
            targetContent.classList.add('active');
          }
        });
      });
    };

    const cleanup = initializeAnimations();
    initializeTabs();
    
    return cleanup;
  }, []);

  const simulateDemo = () => {
    const voiceInput = document.querySelector('.voice-input') as HTMLElement;
    const processing = document.querySelector('.processing') as HTMLElement;
    const result = document.querySelector('.result') as HTMLElement;
    
    if (!voiceInput || !processing || !result) return;
    
    // Hide all steps initially
    voiceInput.style.display = 'none';
    processing.style.display = 'none';
    result.style.display = 'none';
    
    // Show steps sequentially
    setTimeout(() => {
      voiceInput.style.display = 'flex';
      voiceInput.style.animation = 'fadeIn 0.5s ease';
    }, 1000);
    
    setTimeout(() => {
      voiceInput.style.display = 'none';
      processing.style.display = 'flex';
      processing.style.animation = 'fadeIn 0.5s ease';
    }, 4000);
    
    setTimeout(() => {
      processing.style.display = 'none';
      result.style.display = 'flex';
      result.style.animation = 'fadeIn 0.5s ease';
    }, 7000);
    
    // Loop the demo
    setTimeout(simulateDemo, 12000);
  };

  const typeWriter = (element: HTMLElement, text: string, speed = 50) => {
    let i = 0;
    element.textContent = '';
    const type = () => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    };
    type();
  };

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const showComingSoonModal = (feature: string) => {
    alert(`${feature} feature is coming soon! This is a demo modal.`);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailInput = document.querySelector('.email-input') as HTMLInputElement;
    const email = emailInput?.value;
    
    if (email && email.includes('@')) {
      alert("Thank you for your interest! We'll notify you when early access is available.");
      if (emailInput) emailInput.value = '';
    } else {
      alert('Please enter a valid email address.');
    }
  };

  return (
    <div className="landing-page">
      <Navigation />
      
      {/* Hero Section */}
      <section id="hero" className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Build Smart Contracts with Text inputs/
              <span className="gradient-text">Your Voice</span>
            </h1>
            <p className="hero-subtitle">
              The first multimodal AI development environment for 0G. 
              Deploy contracts, manage transactions, and build dApps using natural voice commands or text input.
              <div style={{background: 'linear-gradient(135deg, #ff6b35, #f7931e)', color: 'white', padding: '15px', borderRadius: '8px', margin: '20px 0', textAlign: 'center', fontWeight: 'bold'}}>
                <i className="fas fa-exclamation-triangle" style={{marginRight: '10px'}}></i>
                🚧 WORK IN PROGRESS - This project is actively being developed and will be updated soon!
              </div>
            </p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => scrollToSection('demo')}>
                <i className="fas fa-play"></i>
                Watch Demo
              </button>
              <button className="btn-secondary" onClick={() => scrollToSection('learning')}>
                <i className="fas fa-graduation-cap"></i>
                Learning Vision
              </button>
              <button className="btn-secondary" onClick={() => scrollToSection('docs')}>
                <i className="fas fa-book"></i>
                Documentation
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-cards">
              <div className="card card-1">
                <i className="fas fa-microphone"></i>
                <span>"Deploy ERC20 with 1000 supply"</span>
              </div>
              <div className="card card-2">
                <i className="fas fa-code"></i>
                <span>Contract deployed in 15s</span>
              </div>
              <div className="card card-3">
                <i className="fas fa-check-circle"></i>
                <span>Transaction confirmed</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-bg-animation">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Revolutionary Features</h2>
          <div className="features-grid">
            <div className="feature-card" data-aos="fade-up">
              <div className="feature-icon">
                <i className="fas fa-microphone-alt"></i>
              </div>
              <h3>Voice Commands</h3>
              <p>Deploy contracts, call functions, and manage transactions using natural language voice/text commands.</p>
            </div>
            <div className="feature-card" data-aos="fade-up" data-aos-delay="100">
              <div className="feature-icon">
                <i className="fas fa-keyboard"></i>
              </div>
              <h3>Text Input</h3>
              <p>Prefer typing? Use natural language text commands with the same intelligent processing pipeline.</p>
            </div>
            <div className="feature-card" data-aos="fade-up" data-aos-delay="200">
              <div className="feature-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Security First</h3>
              <p>Multi-layer security with transaction previews, voice authentication, and explicit confirmations for all blockchain actions.</p>
            </div>
            <div className="feature-card" data-aos="fade-up" data-aos-delay="300">
              <div className="feature-icon">
                <i className="fas fa-universal-access"></i>
              </div>
              <h3>Accessibility</h3>
              <p>Making blockchain development accessible to developers with motor disabilities through voice-first design.</p>
            </div>
            <div className="feature-card" data-aos="fade-up" data-aos-delay="400">
              <div className="feature-icon">
                <i className="fas fa-brain"></i>
              </div>
              <h3>AI Code Generation</h3>
              <p>Generate optimized Solidity contracts from natural language descriptions, specifically tuned for 0G's processing.</p>
            </div>
            <div className="feature-card" data-aos="fade-up" data-aos-delay="500">
              <div className="feature-icon">
                <i className="fas fa-chart-network"></i>
              </div>
              <h3>Real-time Transaction Flow</h3>
              <p>Watch your transactions flow through 0G's parallel architecture with live visualization and instant confirmations.</p>
            </div>
            <div className="feature-card" data-aos="fade-up" data-aos-delay="600">
              <div className="feature-icon">
                <i className="fas fa-cube"></i>
              </div>
              <h3>Smart Contract Studio</h3>
              <p>Create tokens with natural language: "Make a token with 1M supply and 5% burn rate" → instant deployment.</p>
            </div>
            <div className="feature-card" data-aos="fade-up" data-aos-delay="700">
              <div className="feature-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h3>AI Learning Assistant</h3>
              <p>Interactive blockchain education via voice: "Teach me to deploy a smart contract" with step-by-step guidance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="demo">
        <div className="container">
          <h2 className="section-title">See It In Action</h2>
          <div className="demo-container">
            <div className="demo-screen">
              <div className="demo-header">
                <div className="demo-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="demo-title">0G Voice/Text Assistant</div>
              </div>
              <div className="demo-content">
                <div className="demo-interaction">
                  <div className="voice-input">
                    <i className="fas fa-microphone recording"></i>
                    <span className="voice-text">"Deploy an ERC20 token called MyToken with 1000 total supply"</span>
                  </div>
                  <div className="processing">
                    <div className="loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span>Processing command...</span>
                  </div>
                  <div className="result">
                    <i className="fas fa-check-circle success"></i>
                    <span>Contract deployed successfully!</span>
                    <div className="tx-hash">0x742d...35cc</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="demo-features">
              <h3>Try These Commands</h3>
              <ul>
                <li><i className="fas fa-chevron-right"></i> "Deploy an ERC20 token"</li>
                <li><i className="fas fa-chevron-right"></i> "Create a token with 1M supply"</li>
                <li><i className="fas fa-chevron-right"></i> "Monitor transaction status"</li>
                <li><i className="fas fa-chevron-right"></i> "Teach me to deploy a smart contract"</li>
                <li><i className="fas fa-chevron-right"></i> "Explain why this transaction failed"</li>
                <li><i className="fas fa-chevron-right"></i> "Batch deploy 5 contracts"</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Conversations Section */}
      <section id="learning" className="learning-conversations">
        <div className="container">
          <h2 className="section-title">Future Vision: Conversational 0G Learning</h2>
          <p className="section-subtitle">
            Experience how the assistant will help developers learn 0G through natural conversations
          </p>
          
          <div className="conversation-tabs">
            <button className="tab-btn active" data-tab="beginner">👶 Beginner</button>
            <button className="tab-btn" data-tab="research">🔬 Research</button>
            <button className="tab-btn" data-tab="development">⚡ Development</button>
          </div>

          <div className="conversation-content">
            {/* Beginner Learning Tab */}
            <div className="tab-content active" id="beginner">
              <div className="conversation-demo">
                <h3>🎯 New Developer Learning Journey</h3>
                <div className="chat-container">
                  <div className="message user-message">
                    <i className="fas fa-microphone"></i>
                    <span>"I'm new to 0G, where do I start?"</span>
                  </div>
                  <div className="message ai-message">
                    <i className="fas fa-robot"></i>
                    <div className="message-content">
                      <p>"I'll create a personalized learning path for you! Based on your background, let's start with:</p>
                      <ol>
                        <li><strong>0G Basics</strong> - What makes 0G special (AI-native blockchain)</li>
                        <li><strong>Storage Network</strong> - Decentralized file storage</li>
                        <li><strong>AI Compute</strong> - Running AI models on-chain</li>
                      </ol>
                      <p>First, let me explain what makes 0G revolutionary..."</p>
                    </div>
                  </div>
                  <div className="message user-message">
                    <i className="fas fa-microphone"></i>
                    <span>"Show me a simple example"</span>
                  </div>
                  <div className="message ai-message">
                    <i className="fas fa-robot"></i>
                    <div className="message-content">
                      <p>"Let's deploy your first smart contract! I'll walk you through each step:</p>
                      <div className="code-example">
                        <span className="step">Step 1:</span> Connect to 0G Galileo testnet<br/>
                        <span className="step">Step 2:</span> Get test tokens from faucet<br/>
                        <span className="step">Step 3:</span> Deploy a simple "Hello World" contract
                      </div>
                      <p>Ready to begin? Just say 'deploy my first contract'"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Research Tab */}
            <div className="tab-content" id="research">
              <div className="conversation-demo">
                <h3>📚 Real-time 0G Research Assistant</h3>
                <div className="chat-container">
                  <div className="message user-message">
                    <i className="fas fa-microphone"></i>
                    <span>"What's new in 0G development this week?"</span>
                  </div>
                  <div className="message ai-message">
                    <i className="fas fa-robot"></i>
                    <div className="message-content">
                      <p>"Great question! This week's 0G updates include:</p>
                      <ul>
                        <li><strong>SDK v2.1 Released</strong> - Improved storage APIs with 40% faster upload</li>
                        <li><strong>Newton v2 Testnet</strong> - Enhanced modularity for dApp development</li>
                        <li><strong>New Documentation</strong> - AI Compute tutorials added to docs.0g.ai</li>
                        <li><strong>Community Update</strong> - 500+ developers joined the ecosystem</li>
                      </ul>
                      <p>Would you like me to dive deeper into any of these updates?"</p>
                    </div>
                  </div>
                  <div className="message user-message">
                    <i className="fas fa-microphone"></i>
                    <span>"Tell me about the storage API improvements"</span>
                  </div>
                  <div className="message ai-message">
                    <i className="fas fa-robot"></i>
                    <div className="message-content">
                      <p>"The new storage APIs include:</p>
                      <div className="api-changes">
                        <span className="new-feature">NEW:</span> Batch upload for multiple files<br/>
                        <span className="improved">IMPROVED:</span> Merkle tree verification (2x faster)<br/>
                        <span className="new-feature">NEW:</span> Resumable uploads for large files
                      </div>
                      <p>Want me to show you examples or update your project to use the new APIs?"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Development Tab */}
            <div className="tab-content" id="development">
              <div className="conversation-demo">
                <h3>⚡ AI-Powered Development Assistant</h3>
                <div className="chat-container">
                  <div className="message user-message">
                    <i className="fas fa-microphone"></i>
                    <span>"Help me build a decentralized AI app on 0G"</span>
                  </div>
                  <div className="message ai-message">
                    <i className="fas fa-robot"></i>
                    <div className="message-content">
                      <p>"Exciting! I'll guide you through building a complete AI dApp. Here's the plan:</p>
                      <div className="development-plan">
                        <div className="plan-step">
                          <span className="step-number">1</span>
                          <div>
                            <strong>Environment Setup</strong><br/>
                            <small>0G SDK, wallet configuration, testnet connection</small>
                          </div>
                        </div>
                        <div className="plan-step">
                          <span className="step-number">2</span>
                          <div>
                            <strong>AI Model Integration</strong><br/>
                            <small>Deploy your model to 0G Compute Network</small>
                          </div>
                        </div>
                        <div className="plan-step">
                          <span className="step-number">3</span>
                          <div>
                            <strong>Smart Contract</strong><br/>
                            <small>Contract to interact with your AI model</small>
                          </div>
                        </div>
                        <div className="plan-step">
                          <span className="step-number">4</span>
                          <div>
                            <strong>Frontend dApp</strong><br/>
                            <small>User interface for AI interactions</small>
                          </div>
                        </div>
                      </div>
                      <p>Let's start with step 1. I'm checking the latest SDK version..."</p>
                    </div>
                  </div>
                  <div className="message user-message">
                    <i className="fas fa-microphone"></i>
                    <span>"Deploy my smart contract to 0G testnet"</span>
                  </div>
                  <div className="message ai-message">
                    <i className="fas fa-robot"></i>
                    <div className="message-content">
                      <p>"Deploying your contract now...</p>
                      <div className="deployment-status">
                        <div className="status-step completed">✅ Connecting to 0G Galileo testnet</div>
                        <div className="status-step completed">✅ Compiling smart contract</div>
                        <div className="status-step completed">✅ Estimating gas: 0.0021 A0GI</div>
                        <div className="status-step in-progress">⏳ Broadcasting transaction...</div>
                      </div>
                      <p><strong>Success!</strong> Contract deployed at: <code>0x742d35cc...8f9a</code></p>
                      <p>Transaction hash: <code>0x8f9a2b1c...d4e7</code></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="vision-note">
            <div className="note-content">
              <i className="fas fa-info-circle"></i>
              <div>
                <strong>Coming Soon:</strong> These conversational experiences will be available through both text and voice input. 
                The assistant will learn from all 0G documentation, community discussions, and real-time updates to provide 
                the most current and helpful guidance for 0G developers.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Network Info Section */}
      <section id="network" className="network">
        <div className="container">
          <h2 className="section-title">0G Network Integration</h2>
          <div className="network-grid">
            <div className="network-card">
              <h3>Network Details</h3>
              <div className="network-info">
                <div className="info-item">
                  <span className="label">Network:</span>
                  <span className="value">0G-Galileo-Testnet</span>
                </div>
                <div className="info-item">
                  <span className="label">Chain ID:</span>
                  <span className="value">16602</span>
                </div>
                <div className="info-item">
                  <span className="label">RPC URL:</span>
                  <span className="value">https://evmrpc-testnet.0g.ai</span>
                </div>
                <div className="info-item">
                  <span className="label">Explorer:</span>
                  <span className="value">https://chainscan-galileo.0g.ai</span>
                </div>
                <div className="info-item">
                  <span className="label">Faucet:</span>
                  <span className="value">https://faucet.0g.ai</span>
                </div>
              </div>
            </div>
            <div className="network-card">
              <h3>Advanced Features</h3>
              <ul className="compatibility-list">
                <li><i className="fas fa-check"></i> Natural language smart contracts</li>
                <li><i className="fas fa-check"></i> Real-time transaction monitoring</li>
                <li><i className="fas fa-check"></i> Voice debugging & error explanation</li>
                <li><i className="fas fa-check"></i> AI-powered learning assistant</li>
                <li><i className="fas fa-check"></i> Parallel transaction processing</li>
                <li><i className="fas fa-check"></i> Real-time transaction monitoring</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Documentation Section */}
      <section id="docs" className="docs">
        <div className="container">
          <h2 className="section-title">Get Started</h2>
          
          {/* Quick Start Section */}
          <div className="docs-category">
            <h3 className="category-title"><i className="fas fa-rocket"></i> Quick Start</h3>
            <div className="docs-grid">
              <div className="doc-card">
                <i className="fas fa-download"></i>
                <h3>Installation Guide</h3>
                <p>Get up and running with 0G Voice Assistant in under 5 minutes. Complete setup instructions for all platforms.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('installation')}>Installation Steps →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('prerequisites')}>Prerequisites →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-play-circle"></i>
                <h3>First Commands</h3>
                <p>Try your first voice commands: "Deploy an ERC20 token" or "Check my balance". Interactive examples included.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('try-commands')}>Try Commands →</a>
                  <a href="#demo" className="doc-link secondary">Watch Demo →</a>
                </div>
              </div>
            </div>
          </div>

          {/* Core Features Section */}
          <div className="docs-category">
            <h3 className="category-title"><i className="fas fa-star"></i> Core Features</h3>
            <div className="docs-grid">
              <div className="doc-card">
                <i className="fas fa-microphone-alt"></i>
                <h3>Voice Commands</h3>
                <p>Master 50+ natural language commands for smart contract development, deployment, and management.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('voice-commands')}>Command Reference →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('advanced-operations')}>Advanced →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-keyboard"></i>
                <h3>Text Input</h3>
                <p>Prefer typing? Use natural language text commands with the same intelligent processing pipeline.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('text-commands')}>Text Guide →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('multimodal-usage')}>Multimodal →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-cube"></i>
                <h3>Smart Contract Studio</h3>
                <p>Create contracts with natural language: "Make a token with 1M supply and 5% burn rate" → instant deployment.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('smart-contract-creation')}>Contract Creation →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('token-examples')}>Token Examples →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-graduation-cap"></i>
                <h3>AI Learning Assistant</h3>
                <p>Interactive tutorials: "Teach me to deploy a smart contract" with step-by-step voice guidance.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('learning-mode')}>Learning Mode →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('interactive-tutorials')}>Tutorials →</a>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Resources Section */}
          <div className="docs-category">
            <h3 className="category-title"><i className="fas fa-cogs"></i> Technical Resources</h3>
            <div className="docs-grid">
              <div className="doc-card">
                <i className="fas fa-network-wired"></i>
                <h3>0G Network Setup</h3>
                <p>Connect to 0G Galileo Testnet, configure RPC endpoints, and troubleshoot network issues.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('network-config')}>Network Config →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('diagnostics')}>Diagnostics →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-shield-alt"></i>
                <h3>Security & Best Practices</h3>
                <p>Private key management, transaction confirmations, and security guidelines for voice-controlled development.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('security-framework')}>Security Guide →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('best-practices')}>Best Practices →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-tools"></i>
                <h3>MCP Server Integration</h3>
                <p>Model Context Protocol server setup, tool configuration, and custom command development.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('mcp-server')}>MCP Server →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('mcp-configuration')}>Configuration →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-bug"></i>
                <h3>Testing & Debugging</h3>
                <p>Comprehensive testing guide, debugging voice commands, and troubleshooting common issues.</p>
                <div className="doc-links">
                  <a href="#" className="doc-link" onClick={() => showComingSoonModal('testing-guide')}>Testing Guide →</a>
                  <a href="#" className="doc-link secondary" onClick={() => showComingSoonModal('troubleshooting')}>Troubleshooting →</a>
                </div>
              </div>
            </div>
          </div>

          {/* External Resources */}
          <div className="docs-category">
            <h3 className="category-title"><i className="fas fa-external-link-alt"></i> External Resources</h3>
            <div className="docs-grid">
              <div className="doc-card">
                <i className="fas fa-globe"></i>
                <h3>0G Network</h3>
                <p>Official 0G network documentation, explorer, faucet, and developer resources.</p>
                <div className="doc-links">
                  <a href="https://docs.0g.ai" className="doc-link" target="_blank" rel="noopener noreferrer">0G Docs →</a>
                  <a href="https://chainscan-galileo.0g.ai" className="doc-link secondary" target="_blank" rel="noopener noreferrer">Explorer →</a>
                  <a href="https://faucet.0g.ai" className="doc-link secondary" target="_blank" rel="noopener noreferrer">Faucet →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-graduation-cap"></i>
                <h3>Learning Materials</h3>
                <p>Solidity tutorials, blockchain development courses, and 0G-specific learning resources.</p>
                <div className="doc-links">
                  <a href="https://cryptozombies.io" className="doc-link" target="_blank" rel="noopener noreferrer">CryptoZombies →</a>
                  <a href="https://docs.soliditylang.org" className="doc-link secondary" target="_blank" rel="noopener noreferrer">Solidity Docs →</a>
                  <a href="https://ethereum.org/en/developers/" className="doc-link secondary" target="_blank" rel="noopener noreferrer">Ethereum Dev →</a>
                </div>
              </div>
              <div className="doc-card">
                <i className="fas fa-tools"></i>
                <h3>Development Tools</h3>
                <p>Recommended development environments, testing frameworks, and blockchain development tools.</p>
                <div className="doc-links">
                  <a href="https://remix.ethereum.org" className="doc-link" target="_blank" rel="noopener noreferrer">Remix IDE →</a>
                  <a href="https://hardhat.org" className="doc-link secondary" target="_blank" rel="noopener noreferrer">Hardhat →</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="container">
          <h2 className="section-title">Get In Touch</h2>
          <p className="contact-subtitle">
            Have questions about 0G Voice Assistant? We're here to help!
          </p>
          <form className="contact-form" onSubmit={handleEmailSubmit}>
            <input type="email" className="email-input" placeholder="Enter your email address" />
            <button type="submit" className="btn-primary">Get Updates</button>
          </form>
          <div className="social-links">
            <a href="#" className="social-link">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#" className="social-link">
              <i className="fab fa-linkedin"></i>
            </a>
            <a href="#" className="social-link">
              <i className="fab fa-github"></i>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 0G Voice Assistant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;