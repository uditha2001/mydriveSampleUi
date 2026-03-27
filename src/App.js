import React, { useState } from 'react';
import './App.css';
import PayHereCheckout from './components/PayHereCheckout';
import axios from 'axios';
import {
  clearTokens,
  extractTokens,
  getAccessToken,
  setTokens
} from './utils/authTokens';

function App() {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));

  const LOGIN_URL = process.env.REACT_APP_LOGIN_URL || '/identity/v1/auth/login';

  const createGuid = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    // Fallback GUID format for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const [requestForm, setRequestForm] = useState({
    OrderId: `ORDER_${Date.now()}`,
    CustomerId: createGuid(),
    MerchantId: createGuid(),
    Amount: '1000.00',
    PaymentGatewayName: 'PAYHERE',
    Currency: 'LKR',
  });

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setRequestForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fillDummyData = () => {
    setRequestForm({
      OrderId: `ORDER_${Date.now()}`,
      CustomerId: createGuid(),
      MerchantId: createGuid(),
      Amount: '1000.00',
      PaymentGatewayName: 'PAYHERE',
      Currency: 'LKR',
    });
  };

  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        OrderId: requestForm.OrderId.trim(),
        CustomerId: requestForm.CustomerId.trim(),
        MerchantId: requestForm.MerchantId.trim(),
        Amount: Number(requestForm.Amount),
        PaymentGatewayName: requestForm.PaymentGatewayName.trim() || 'PAYHERE',
        Currency: requestForm.Currency.trim() || 'LKR',
      };

      if (!requestBody.OrderId || !requestBody.CustomerId || !requestBody.MerchantId) {
        throw new Error('OrderId, CustomerId, and MerchantId are required');
      }

      if (Number.isNaN(requestBody.Amount) || requestBody.Amount <= 0) {
        throw new Error('Amount must be a valid number greater than zero');
      }

      // Direct API call to POST /v1/payments/paymentIntentCreate
      const response = await axios.post(
        'http://localhost:8085/v1/payments/paymentIntentCreate',
        requestBody
      );

      const gatewayData =
        response.data?.GatewayData ||
        response.data?.gatewayData ||
        response.data;

      if (!gatewayData || typeof gatewayData !== 'object') {
        throw new Error('Invalid payment response format');
      }

      setPaymentData(gatewayData);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create payment intent');
      console.error('Payment creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await axios.post(LOGIN_URL, {
        username,
        password
      });

      const tokens = extractTokens(response.data);

      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new Error('Login response did not contain access and refresh tokens.');
      }

      setTokens(tokens);
      setIsAuthenticated(true);
      setPassword('');
    } catch (err) {
      const apiError = err.response?.data?.message;
      setAuthError(apiError || err.message || 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    setIsAuthenticated(false);
    setPaymentData(null);
  };

  console.log('Current paymentData state:', paymentData);
  console.log('Should show PayHere?', paymentData !== null);

  return (
    <div className="App">
      <div className="container">
        <h1>PayHere Sandbox Demo</h1>
        <p className="subtitle">Test your PayHere payment integration</p>

        {!isAuthenticated && (
          <form className="login-card" onSubmit={handleLogin}>
            <h2>Login</h2>
            <p className="login-help">Authenticate first to call backend APIs and receive protected events.</p>

            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={authLoading}
            >
              {authLoading ? 'Logging in...' : 'Login'}
            </button>

            {authError && <div className="error-message"><strong>Login Error:</strong> {authError}</div>}
          </form>
        )}

        {isAuthenticated && (
          <div className="auth-status">
            <span>Authenticated</span>
            <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        )}

        {isAuthenticated && !paymentData ? (
          <>
            <div className="request-form">
              <h3>Payment Intent Request</h3>

              <label>OrderId</label>
              <input
                name="OrderId"
                value={requestForm.OrderId}
                onChange={handleFormChange}
                placeholder="ORDER_123"
              />

              <label>CustomerId (GUID)</label>
              <input
                name="CustomerId"
                value={requestForm.CustomerId}
                onChange={handleFormChange}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />

              <label>MerchantId (GUID)</label>
              <input
                name="MerchantId"
                value={requestForm.MerchantId}
                onChange={handleFormChange}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />

              <label>Amount</label>
              <input
                name="Amount"
                type="number"
                step="0.01"
                min="0"
                value={requestForm.Amount}
                onChange={handleFormChange}
                placeholder="1000.00"
              />

              <label>PaymentGatewayName</label>
              <input
                name="PaymentGatewayName"
                value={requestForm.PaymentGatewayName}
                onChange={handleFormChange}
                placeholder="PAYHERE"
              />

              <label>Currency</label>
              <input
                name="Currency"
                value={requestForm.Currency}
                onChange={handleFormChange}
                placeholder="LKR"
              />
            </div>

            <div className="button-group">
              <button 
                onClick={handleCreatePayment} 
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Loading...' : 'Create Payment Intent'}
              </button>
              
              <button 
                onClick={fillDummyData}
                className="btn btn-secondary"
              >
                Fill Dummy Data
              </button>
          </div>
          </>
        ) : null}
        {isAuthenticated && paymentData ? (
          <PayHereCheckout 
            paymentData={paymentData}
            onBack={() => setPaymentData(null)}
          />
        ) : null}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="info-box">
          <h3>Setup Instructions:</h3>
          <ol>
            <li>API URL is hardcoded to http://localhost:8085/v1/payments/paymentIntentCreate</li>
            <li>Enter request values in the form or click Fill Dummy Data</li>
            <li>Backend endpoint used: POST /v1/payments/paymentIntentCreate</li>
            <li>CustomerId and MerchantId must be valid GUID values</li>
            <li>Amount should be greater than zero</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;
