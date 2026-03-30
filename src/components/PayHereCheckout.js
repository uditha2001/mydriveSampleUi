
import React, { useRef } from 'react';
import './PayHereCheckout.css';

const PayHereCheckout = ({ paymentData, onBack }) => {
  const formRef = useRef(null);
  const gatewayData =
    paymentData?.GatewayData ||
    paymentData?.gatewayData ||
    paymentData?.paymentIntentResponse?.GatewayData ||
    paymentData?.paymentIntentResponse?.gatewayData ||
    paymentData || {};

  // Prepare values for the form fields
  const orderId = String(gatewayData.order_id || gatewayData.orderId || `PREAPPROVAL_${Date.now()}`);
  let amount = gatewayData.amount;
  if (typeof amount === 'number') {
    amount = amount.toFixed(2);
  } else if (typeof amount === 'string') {
    const parsed = parseFloat(amount);
    amount = Number.isNaN(parsed) ? '0.00' : parsed.toFixed(2);
  } else {
    amount = '0.00';
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <div className="checkout-container">
      <div className="payment-info">
        <h2>Payment Details</h2>
        <p><strong>Amount:</strong> {gatewayData?.currency || 'LKR'} {gatewayData?.amount}</p>
        <p><strong>Items:</strong> {gatewayData?.items || 'Order Items'}</p>
      </div>
      <form
        ref={formRef}
        method="post"
        action="https://sandbox.payhere.lk/pay/preapprove"
        className="payhere-preapproval-form"
        target="_self"
      >
        <input type="hidden" name="merchant_id" value={gatewayData.merchant_id || gatewayData.merchantId || ''} />
        <input type="hidden" name="return_url" value={gatewayData.return_url || gatewayData.returnUrl || window.location.origin + '/payment/success'} />
        <input type="hidden" name="cancel_url" value={gatewayData.cancel_url || gatewayData.cancelUrl || window.location.origin + '/payment/cancel'} />
        <input type="hidden" name="notify_url" value={gatewayData.notify_url || gatewayData.notifyUrl || ''} />
        <input type="hidden" name="order_id" value={orderId} />
        <input type="hidden" name="items" value={gatewayData.items || 'Order Items'} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="currency" value={gatewayData.currency || 'LKR'} />
        <input type="hidden" name="first_name" value={gatewayData.first_name || gatewayData.firstName || 'John'} />
        <input type="hidden" name="last_name" value={gatewayData.last_name || gatewayData.lastName || 'Doe'} />
        <input type="hidden" name="email" value={gatewayData.email || 'customer@example.com'} />
        <input type="hidden" name="phone" value={gatewayData.phone || '0771234567'} />
        <input type="hidden" name="address" value={gatewayData.address || 'No. 123, Main Street'} />
        <input type="hidden" name="city" value={gatewayData.city || 'Colombo'} />
        <input type="hidden" name="country" value={gatewayData.country || 'Sri Lanka'} />
        <input type="hidden" name="hash" value={gatewayData.hash || ''} />
        <div className="button-group">
          <button
            className="pay-button"
            type="submit"
            onClick={handleSubmit}
            disabled={!gatewayData.merchant_id && !gatewayData.merchantId}
          >
            Preapprove Payment
          </button>
          {onBack && (
            <button className="back-button" type="button" onClick={onBack}>
              Back
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PayHereCheckout;
