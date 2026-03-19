import React from 'react';
import './KafkaEventListener.css';

const KafkaEventListener = ({ isConnected, error, isEnabled, onToggle }) => {
  return (
    <div className="kafka-listener">
      <div className="kafka-listener-header">
        <div className="kafka-info">
          <span className="kafka-icon">📡</span>
          <div className="kafka-text">
            <strong>SignalR Event Listener</strong>
            <small>mydrive.v1.payment-intent-created</small>
          </div>
        </div>
        <label className="switch">
          <input 
            type="checkbox" 
            checked={isEnabled} 
            onChange={onToggle}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="kafka-status">
        {isEnabled ? (
          <>
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            {error && (
              <div className="kafka-error">
                ⚠️ {error}
              </div>
            )}
          </>
        ) : (
          <div className="status-indicator disabled">
            <span className="status-text">Disabled</span>
          </div>
        )}
      </div>

      {isEnabled && isConnected && (
        <div className="kafka-help">
          <span className="pulse-dot"></span>
          Listening for payment events...
        </div>
      )}
    </div>
  );
};

export default KafkaEventListener;
