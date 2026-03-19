# PayHere Sandbox Demo - React

A sample React application to test PayHere payment gateway integration with your backend.

## Features

- ✅ PayHere Sandbox integration
- ✅ Kafka event listener for `mydrive.v1.payment-intent-created`
- ✅ Real-time WebSocket connection for payment events
- ✅ Receives payment data from your backend API
- ✅ Mock data option for testing without backend
- ✅ Clean and responsive UI
- ✅ Payment status tracking
- ✅ Callback handlers for payment completion, dismissal, and errors
- ✅ Toggle Kafka listener on/off

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Your PayHere Merchant Account (Sandbox)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Update the backend API and WebSocket URLs in `src/App.js`:
```javascript
const BACKEND_API_URL = 'http://localhost:8085/api/payment/create-intent';
const KAFKA_WS_URL = 'ws://localhost:8085/kafka/events';
```

3. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Configuration

### Kafka Event Listener

The application listens for `mydrive.v1.payment-intent-created` events via WebSocket.

**Architecture Overview:**
```
Kafka Broker (port 9092)
    ↓
Backend Kafka Consumer
    ↓
WebSocket Server (e.g., port 5000)
    ↓
React Frontend (Browser)
```

**Important:** Browsers cannot connect directly to Kafka on port 9092. Your backend needs to:
1. Consume events from Kafka (port 9092)
2. Expose a WebSocket endpoint (e.g., `ws://localhost:5000/kafka/events`)
3. Forward Kafka events to connected WebSocket clients

**Expected Kafka Event Structure:**
```json
{
  "eventType": "mydrive.v1.payment-intent-created",
  "timestamp": "2026-02-04T10:00:00Z",
  "payload": {
    "PaymentId": "payment_123",
    "Status": "INTENT_CREATED",
    "GatewayData": {
      "merchant_id": "1221149",
      "order_id": "ORDER_123",
      "amount": "1000.00",
      "currency": "LKR",
      "return_url": "http://localhost:3000/payment/success",
      "cancel_url": "http://localhost:3000/payment/cancel",
      "notify_url": "http://your-backend/api/payment/notify",
      "hash": "GENERATED_HASH"
    }
  }
}
```

**Backend WebSocket Requirements (Port 8085):**
Your backend should provide a WebSocket endpoint that:
1. Accepts WebSocket connections at `ws://localhost:8085/kafka/events`
2. Allows clients to subscribe to specific event types
3. Pushes Kafka events to connected clients in real-time

Example subscription message sent by frontend:
```json
{
  "action": "subscribe",
  "eventType": "mydrive.v1.payment-intent-created"
}
```

### Backend Integration

Your backend should return a response in this format:
Kafka Events (Real-time)

1. Ensure your backend WebSocket endpoint is running
2. The Kafka listener is enabled by default (toggle in UI)
3. Create a payment intent in your backend
4. The backend should publish `mydrive.v1.payment-intent-created` event to Kafka
5. Your WebSocket server forwards the event to connected clients
6. The UI automatically receives and displays the payment data

### With 
```json
{
  "PaymentId": "payment_123",
  "Status": "INTENT_CREATED",
  "CreatedAt": "2026-02-04T10:00:00Z",
  "GatewayData": {
    "merchant_id": "1221149",
    "order_id": "ORDER_123",
    "amount": "1000.00",
    "currency": "LKR",
    "return_url": "http://localhost:3000/payment/success",
    "cancel_url": "http://localhost:3000/payment/cancel",
    "notify_url": "http://your-backend/api/payment/notify",
    "hash": "GENERATED_HASH"
  }
}
```

### Hash Generation (Backend)

The hash must be generated on your backend using:

```
MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))
```

**Important:** Never expose your merchant secret to the frontend!

### PayHere Sandbox Credentials

- Merchant ID: Get from PayHere Dashboard
- Merchant Secret: Get from PayHere Dashboard (use in backend only)
- Test Cards:
  - Card Number: 4916217501611292
  - Expiry: 12/25
  - CVV: 123

## Testing

### With Mock Data

1. Click "Use Mock Data (Testing)" button
2. Update the `merchant_id` in the mock data with your actual merchant ID
3. Click "Pay with PayHere"

### With Backend

1. Ensure your backend is running
2. Update the `BACKEND_API_URL` in App.js
3. Click "Create Payment from Backend"
4. Complete the payment in the PayHere modal
   # Payment component
│   │   ├── PayHereCheckout.css
│   │   ├── KafkaEventListener.js   # Kafka listener UI
│   │   └── KafkaEventListener.css
│   ├── hooks/
│   │   └── useKafkaEvents.js       # WebSocket hook for Kafka

```
sampleProject/
├── public/
│   └── index.html          # PayHere script loaded here
├── src/
│   ├── components/
│   │   ├── PayHereCheckout.js   # Payment component
│   │   └── PayHereCheckout.css
│   ├── App.js              # Main app component
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Important Notes

1. **Sandbox Mode**: The application is configured for sandbox mode. To use production:
   - Change `sandbox: true` to `sandbox: false` in PayHereCheckout.js
   - Update PayHere script URL to production endpoint
   - Use production merchant credentials

2. **Hash Security**: Always generate the hash on your backend. Never include your merchant secret in frontend code.

3. **CORS**: If you encounter CORS issues with your backend, ensure your backend API allows requests from your frontend origin.

4. **Return URLs**: Make sure return_url and cancel_url point to valid routes in your application.

5. **Notify URL**: The notify_url should be a publicly accessible endpoint on your backend for payment verification.

## Callback URLs

The application expects these routes (you can implement them):

- `/payment/success` - Payment completed successfully
- `/payment/cancel` - Payment cancelled by user
- `/api/payment/notify` - Backend webhook for payment verification

## Troubleshooting

### Kafka WebSocket not connecting
- Check that your backend WebSocket server is running
- Verify the WebSocket URL is correct (should start with `ws://` or `wss://`)
- Check browser console for connection errors
- Ensure CORS is properly configured on your backend
- Try toggling the Kafka listener off and on

### Events not being received
- Verify Kafka is publishing events correctly
- Check that event type matches exactly: `mydrive.v1.payment-intent-created`
- Ensure WebSocket server is forwarding Kafka events to clients
- Check browser console for event data structure

### PayHere modal not opening
- Check browser console for errors
- Ensure PayHere script is loaded (check Network tab)
- Verify merchant_id is correct

### Hash verification failed
- Ensure hash is generated correctly on backend
- Check that amount format is correct (e.g., "1000.00")
- Verify merchant_secret is correct

### Payment not completing
- Check PayHere sandbox status
- Verify all required fields are present
- Check browser console for errors

## Backend WebSocket Implementation

See [BACKEND_WEBSOCKET_EXAMPLE.md](BACKEND_WEBSOCKET_EXAMPLE.md) for complete backend implementation examples:
- Node.js with Socket.io and KafkaJS
- C# ASP.NET Core with SignalR and Confluent.Kafka

**Quick Summary:**
- Kafka runs on **port 9092** (backend consumes from here)
- WebSocket server runs on **port 8085** (your backend)
- Browser connects to WebSocket server, NOT directly to Kafka

## Resources

- [PayHere Documentation](https://www.payhere.lk/downloads/docs/payhere_gateway_integration_manual.pdf)
- [PayHere Sandbox](https://sandbox.payhere.lk/)
- [PayHere Dashboard](https://www.payhere.lk/merchant/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Confluent.Kafka .NET](https://docs.confluent.io/kafka-clients/dotnet/current/overview.html)

## License

MIT
