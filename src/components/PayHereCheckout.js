import React, { useEffect, useState } from 'react';
import './PayHereCheckout.css';

const PayHereCheckout = ({ paymentData, onBack }) => {
  const [status, setStatus] = useState('ready');

  useEffect(() => {
    // Initialize PayHere callbacks
    console.log('Checking PayHere SDK availability...');
    console.log('window.payhere exists?', !!window.payhere);
    
    if (window.payhere) {
      console.log('✅ PayHere SDK loaded successfully');
      
      window.payhere.onCompleted = function onCompleted(orderId) {
        console.log("Payment completed. OrderID:" + orderId);
        setStatus('completed');
        alert("Payment completed successfully! Order ID: " + orderId);
        // Here you can make an API call to verify payment on your backend
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
    } else {
      console.error('❌ PayHere SDK not loaded! Check if script is in index.html');
    }
  }, []);

  const handlePayment = () => {
    console.log('====== handlePayment called ======');
    console.log('window.payhere available?', !!window.payhere);
    console.log('paymentData:', paymentData);
    
    if (!window.payhere) {
      console.error('❌ PayHere SDK not available!');
      alert('PayHere script not loaded. Please check your internet connection.');
      return;
    }

    // Use fixed test order_id for testing
    let orderId = "TEST_ORDER_12345";
    console.log('🧪 Using fixed test order_id:', orderId);

    // Ensure amount is a string with 2 decimal places
    let amount = paymentData.amount;
    if (typeof amount === 'number') {
      amount = amount.toFixed(2);
    } else if (typeof amount === 'string') {
      amount = parseFloat(amount).toFixed(2);
    }

    // Prepare payment object for PayHere with all required fields
    const payment = {
      sandbox: true,  // Sandbox mode enabled
      merchant_id: String(paymentData.merchant_id || ''),
      return_url: String(paymentData.return_url || window.location.origin + '/payment/success'),
      cancel_url: String(paymentData.cancel_url || window.location.origin + '/payment/cancel'),
      notify_url: String(paymentData.notify_url || ''),
      order_id: String(orderId),
      items: String(paymentData.items || 'Order Items'),
      amount: String(amount),
      currency: String(paymentData.currency || 'LKR'),
      hash: String(paymentData.hash || ''),
      // Required customer details
      first_name: String(paymentData.first_name || 'John'),
      last_name: String(paymentData.last_name || 'Doe'),
      email: String(paymentData.email || 'customer@example.com'),
      phone: String(paymentData.phone || '0771234567'),
      address: String(paymentData.address || 'No. 123, Main Street'),
      city: String(paymentData.city || 'Colombo'),
      country: String(paymentData.country || 'Sri Lanka')
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
        <p><strong>Amount:</strong> {paymentData?.currency || 'LKR'} {paymentData?.amount}</p>
        <p><strong>Items:</strong> {paymentData?.items || 'Order Items'}</p>
        <p><strong>Status:</strong> {status}</p>
      </div>
      <div className="button-group">
        <button 
          className="pay-button" 
          onClick={handlePayment}
          disabled={status === 'completed' || !window.payhere}
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
