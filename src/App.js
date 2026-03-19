import React, { useState, useCallback } from 'react';
import './App.css';
import PayHereCheckout from './components/PayHereCheckout';
import KafkaEventListener from './components/KafkaEventListener';
import useKafkaEvents from './hooks/useKafkaEvents';
import axios from 'axios';

function App() {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [kafkaEnabled, setKafkaEnabled] = useState(true);
  const [lastEvent, setLastEvent] = useState(null);

  // Replace with your actual backend API endpoint and SignalR Hub URL
  const BACKEND_API_URL = 'http://localhost:5000/api/payment/create-intent';
  // SignalR Hub URL for real-time payment events
  const SIGNALR_HUB_URL = 'http://localhost:5000/hubs/payment';

  // Kafka event handler - receives payment intent and automatically redirects to PayHere
  const handleKafkaEvent = useCallback((eventData) => {
    console.log('====== KAFKA EVENT RECEIVED ======');
    console.log('Received payment intent event:', eventData);
    console.log('Event structure:', JSON.stringify(eventData, null, 2));
    setLastEvent(new Date().toLocaleTimeString());

    // Extract payment data from event and redirect to PayHere checkout
    if (eventData.payload && eventData.payload.GatewayData) {
      console.log('✅ Payment intent received, setting paymentData...');
      console.log('GatewayData to set:', eventData.payload.GatewayData);
      setPaymentData(eventData.payload.GatewayData);
      setError(null);
      console.log('PaymentData state updated - should redirect to PayHere now');
    } else if (eventData.GatewayData) {
      console.log('✅ Payment intent received (direct GatewayData), setting paymentData...');
      console.log('GatewayData to set:', eventData.GatewayData);
      setPaymentData(eventData.GatewayData);
      setError(null);
      console.log('PaymentData state updated - should redirect to PayHere now');
    } else {
      console.warn('Unexpected event structure:', eventData);
      console.warn('Missing GatewayData in payload');
    }
  }, []);

  // Connect to SignalR to listen for payment intent created events
  // When event is received, automatically redirect to PayHere checkout
  const { 
    isConnected, 
    error: kafkaError, 
    sendTestPaymentIntent 
  } = useKafkaEvents(
    kafkaEnabled ? SIGNALR_HUB_URL : null,
    'mydrive.v1.payment-intent-created',
    handleKafkaEvent
  );

  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call your backend API to get payment data
      const response = await axios.post(BACKEND_API_URL, {
        amount: 1000.00,
        currency: 'LKR',
        // Add any other required fields
      });

      // The response should contain the GatewayData from your backend
      const { GatewayData } = response.data;
      setPaymentData(GatewayData);
    } catch (err) {
      setError(err.message || 'Failed to create payment intent');
      console.error('Payment creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // For testing without backend, you can use mock data
  const handleMockPayment = () => {
    const mockData = {
      merchant_id: '1221149',  // Replace with your merchant ID
      order_id: 'ORDER_' + Date.now(),
      amount: '1000.00',
      currency: 'LKR',
      return_url: window.location.origin + '/payment/success',
      cancel_url: window.location.origin + '/payment/cancel',
      notify_url: 'http://localhost:5000/api/payment/notify',
      hash: 'GENERATED_HASH_FROM_BACKEND',  // This should come from backend
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '0771234567',
      address: '123 Main Street',
      city: 'Colombo',
      country: 'Sri Lanka',
      items: 'Test Product'
    };
    console.log('Setting mock payment data:', mockData);
    setPaymentData(mockData);
  };

  console.log('Current paymentData state:', paymentData);
  console.log('Should show PayHere?', paymentData !== null);

  return (
    <div className="App">
      <div className="container">
        <h1>PayHere Sandbox Demo</h1>
        <p className="subtitle">Test your PayHere payment integration</p>

        <KafkaEventListener
          isConnected={isConnected}
          error={kafkaError}
          isEnabled={kafkaEnabled}
          onToggle={() => setKafkaEnabled(!kafkaEnabled)}
        />

        {lastEvent && (
          <div className="event-notification">
            ✅ Payment event received at {lastEvent}
          </div>
        )}

        {!paymentData ? (
          <div className="button-group">
            <button 
              onClick={handleCreatePayment} 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Loading...' : 'Create Payment from Backend'}
            </button>
            
            <button 
              onClick={handleMockPayment}
              className="btn btn-secondary"
            >
              Use Mock Data (Testing)
            </button>

            {isConnected && (
              <button 
                onClick={sendTestPaymentIntent}
                className="btn btn-test"
              >
                🧪 Send Test Event (SignalR)
              </button>
            )}
          </div>
        ) : (
          <PayHereCheckout 
            paymentData={paymentData}
            onBack={() => setPaymentData(null)}
          />
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="info-box">
          <h3>Setup Instructions:</h3>
          <ol>
            <li>Update the BACKEND_API_URL with your actual API endpoint</li>
            <li>For testing, use the "Mock Data" button</li>
            <li>Replace merchant_id with your PayHere merchant ID</li>
            <li>Ensure hash is generated correctly on your backend</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;
