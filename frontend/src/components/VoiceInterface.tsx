import React, { useState, useRef } from 'react';
import { Mic, MicOff, Play, Square } from 'lucide-react';
import '../styles/voice-interface.css';

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceInterfaceProps {
  onVoiceCommand: (command: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onVoiceCommand,
  onError,
  disabled = false
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        onVoiceCommand(finalTranscript);
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      onError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div className="voice-interface">
      <div className="voice-controls">
        <button
          className={`voice-btn ${isListening ? 'listening' : ''}`}
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          title={isListening ? 'Stop listening' : 'Start voice command'}
        >
          {isListening ? (
            <>
              <Square size={20} />
              <span className="voice-btn-text">Stop</span>
            </>
          ) : (
            <>
              <Mic size={20} />
              <span className="voice-btn-text">Voice</span>
            </>
          )}
        </button>
        
        {isListening && (
          <div className="voice-status">
            <div className="voice-indicator">
              <div className="voice-wave"></div>
              <div className="voice-wave"></div>
              <div className="voice-wave"></div>
            </div>
            <span className="voice-text">Listening...</span>
          </div>
        )}
      </div>

      {transcript && (
        <div className="voice-transcript">
          <span className="transcript-label">Transcript:</span>
          <span className="transcript-text">{transcript}</span>
        </div>
      )}
    </div>
  );
};