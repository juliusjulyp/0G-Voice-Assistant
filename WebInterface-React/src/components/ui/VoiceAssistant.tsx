import React, { useState } from 'react';

interface VoiceAssistantProps {
  onVoiceCommand?: (command: string) => void;
  className?: string;
}

type VoiceState = 'idle' | 'listening' | 'processing';

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
  onVoiceCommand, 
  className = '' 
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');

  const handleVoiceToggle = () => {
    if (voiceState === 'idle') {
      // Start listening simulation
      setVoiceState('listening');
      
      // Simulate processing after 3 seconds
      setTimeout(() => {
        setVoiceState('processing');
        
        // Simulate command completion after 2 seconds
        setTimeout(() => {
          setVoiceState('idle');
          if (onVoiceCommand) {
            onVoiceCommand('Sample voice command');
          }
        }, 2000);
      }, 3000);
    } else {
      // Stop listening
      setVoiceState('idle');
    }
  };

  const getStateText = () => {
    switch (voiceState) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      default:
        return 'Click to speak';
    }
  };

  const getStateIcon = () => {
    switch (voiceState) {
      case 'listening':
        return 'fas fa-microphone';
      case 'processing':
        return 'fas fa-brain';
      default:
        return 'fas fa-microphone-slash';
    }
  };

  return (
    <div className={`voice-assistant ${voiceState} ${className}`}>
      <div className="voice-container">
        <button 
          className={`voice-button ${voiceState}`}
          onClick={handleVoiceToggle}
          disabled={voiceState === 'processing'}
        >
          <i className={getStateIcon()}></i>
          {voiceState === 'listening' && (
            <div className="pulse-ring"></div>
          )}
          {voiceState === 'processing' && (
            <div className="processing-spinner"></div>
          )}
        </button>
        
        <div className="voice-status">
          <span className="status-text">{getStateText()}</span>
        </div>
      </div>
      
      {/* Visualizer bars for listening state */}
      {voiceState === 'listening' && (
        <div className="voice-visualizer">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}
    </div>
  );
};


export default VoiceAssistant;