import React, { useEffect, useState } from 'react';
import './PayHereCheckout.css';

const PayHereCheckout = ({ paymentData, onBack }) => {
  const [status, setStatus] = useState('ready');
  const [sdkReady, setSdkReady] = useState(false);

  const gatewayData =
    paymentData?.GatewayData ||
    paymentData?.gatewayData ||
    paymentData?.paymentIntentResponse?.GatewayData ||
    paymentData?.paymentIntentResponse?.gatewayData ||
    paymentData || {};

  useEffect(() => {
    const initializeCallbacks = () => {
      if (!window.payhere) {
        return;
      }

      window.payhere.onCompleted = function onCompleted(orderId) {
        console.log("Payment completed. OrderID:" + orderId);
        setStatus('completed');
        alert("Payment completed successfully! Order ID: " + orderId);
      };

      window.payhere.onDismissed = function onDismissed() {
        console.log("Payment dismissed");
        setStatus('dismissed');
        alert("Payment was dismissed");
      };

      window.payhere.onError = function onError(error) {
        console.log("Payment error:" + error);
        setStatus('error');
        alert("Payment error: " + error);
      };

      setSdkReady(true);
      console.log('✅ PayHere SDK ready');
    };

    console.log('Checking PayHere SDK availability...');
    if (window.payhere) {
      initializeCallbacks();
      return;
    }

    let script = document.querySelector('script[src="https://www.payhere.lk/lib/payhere.js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.payhere.lk/lib/payhere.js';
      script.type = 'text/javascript';
      document.head.appendChild(script);
    }

    const handleLoad = () => initializeCallbacks();
    const handleError = () => {
      console.error('❌ Failed to load PayHere SDK script');
      setStatus('error');
      setSdkReady(false);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, []);

  const handlePayment = () => {
    console.log('====== handlePayment called ======');
    console.log('window.payhere available?', !!window.payhere);
    console.log('paymentData:', paymentData);
    
    if (!sdkReady || !window.payhere) {
      console.error('❌ PayHere SDK not available!');
      alert('PayHere script not loaded. Please check your internet connection.');
      return;
    }

    const orderId = String(gatewayData.order_id || gatewayData.orderId || `TEST_ORDER_${Date.now()}`);
    console.log('🧪 Using order_id:', orderId);

    // Ensure amount is a string with 2 decimal places
    let amount = gatewayData.amount;
    if (typeof amount === 'number') {
      amount = amount.toFixed(2);
    } else if (typeof amount === 'string') {
      const parsed = parseFloat(amount);
      amount = Number.isNaN(parsed) ? '0.00' : parsed.toFixed(2);
    } else {
      amount = '0.00';
    }

    // Prepare payment object for PayHere with all required fields
    const payment = {
      sandbox: true,  // Sandbox mode enabled
      merchant_id: String(gatewayData.merchant_id || gatewayData.merchantId || ''),
      return_url: String(gatewayData.return_url || gatewayData.returnUrl || window.location.origin + '/payment/success'),
      cancel_url: String(gatewayData.cancel_url || gatewayData.cancelUrl || window.location.origin + '/payment/cancel'),
      notify_url: String(gatewayData.notify_url || gatewayData.notifyUrl || ''),
      order_id: String(orderId),
      items: String(gatewayData.items || 'Order Items'),
      amount: String(amount),
      currency: String(gatewayData.currency || 'LKR'),
      hash: String(gatewayData.hash || ''),
      // Required customer details
      first_name: String(gatewayData.first_name || gatewayData.firstName || 'John'),
      last_name: String(gatewayData.last_name || gatewayData.lastName || 'Doe'),
      email: String(gatewayData.email || 'customer@example.com'),
      phone: String(gatewayData.phone || '0771234567'),
      address: String(gatewayData.address || 'No. 123, Main Street'),
      city: String(gatewayData.city || 'Colombo'),
      country: String(gatewayData.country || 'Sri Lanka')
    };

    // Remove any extra fields that might have been added
    delete payment.iframe;
    delete payment.modal;

    console.log('🚀 Starting PayHere payment with validated data:', payment);

    // Validate required fields
    if (!payment.merchant_id) {
      console.error('❌ merchant_id is required');
      alert('Payment configuration error: Missing merchant ID');
      return;
    }
    
    if (!payment.hash) {
      console.error('❌ hash is required');
      alert('Payment configuration error: Missing payment hash');
      return;
    }

    try {
      // Start PayHere payment with validated data
      window.payhere.startPayment(payment);
      console.log('✅ PayHere startPayment() called successfully');
    } catch (error) {
      console.error('❌ Error calling payhere.startPayment():', error);
      alert('Error starting payment: ' + error.message);
      setStatus('error');
    }
  };

  return (
    <div className="checkout-container">
      <div className="payment-info">
        <h2>Payment Details</h2>
        <p><strong>Amount:</strong> {gatewayData?.currency || 'LKR'} {gatewayData?.amount}</p>
        <p><strong>Items:</strong> {gatewayData?.items || 'Order Items'}</p>
        <p><strong>Status:</strong> {status}</p>
      </div>
      <div className="button-group">
        <button 
          className="pay-button" 
          onClick={handlePayment}
          disabled={status === 'completed' || !sdkReady}
        >
          Proceed to Payment
        </button>
        {onBack && (
          <button className="back-button" onClick={onBack}>
            Back
          </button>
        )}
      </div>
    </div>
  );
};

export default PayHereCheckout;
