import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

const useKafkaEvents = (hubUrl, eventType, onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const connectionRef = useRef(null);

  useEffect(() => {
    if (!hubUrl) return;

    const connect = async () => {
      try {
        console.log(`Connecting to SignalR hub: ${hubUrl}`);
        
        // Create SignalR connection
        // HTTP/2 compatible configuration - let SignalR negotiate best transport
        const connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, {
            skipNegotiation: false,
            transport: signalR.HttpTransportType.WebSockets | 
                      signalR.HttpTransportType.ServerSentEvents | 
                      signalR.HttpTransportType.LongPolling
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Information)
          .build();

        connectionRef.current = connection;

        // Handle connection events (backend sends ConnectionEstablished)
        connection.on("ConnectionEstablished", (data) => {
          console.log('✅ Connected to SignalR hub:', data);
          setIsConnected(true);
          setError(null);
        });

        // Handle subscription confirmations (backend sends SubscriptionConfirmed)
        // This is ONLY for confirmation, does NOT trigger payment navigation
        connection.on("SubscriptionConfirmed", (data) => {
          console.log('🔔 Subscription confirmed:', data);
          // DO NOT call onMessage here - this is just a subscription confirmation
        });

        // Handle PaymentIntentCreated event
        // THIS is the ONLY event that should trigger payment navigation
        connection.on("PaymentIntentCreated", (data) => {
          console.log('💳 PaymentIntentCreated event received:', data);
          console.log('Raw data structure:', JSON.stringify(data, null, 2));
          
          // Extract GatewayData from backend response
          const gatewayData = data.gatewayData || data.GatewayData || {};
          console.log('Extracted gatewayData:', gatewayData);
          
          // Validate that this is a real payment intent, not a test or subscription response
          if (!gatewayData.merchant_id && !gatewayData.MerchantId) {
            console.warn('⚠️ Received PaymentIntentCreated but no merchant_id found - ignoring');
            return;
          }
          
          if (!gatewayData.order_id && !gatewayData.OrderId) {
            console.warn('⚠️ Received PaymentIntentCreated but no order_id found - ignoring');
            return;
          }
          
          // Transform SignalR data to match expected format
          const eventData = {
            eventType: 'mydrive.v1.payment-intent-created',
            timestamp: data.createdAt || data.CreatedAt,
            payload: {
              PaymentId: data.paymentId || data.PaymentId,
              Status: data.status || data.Status,
              GatewayData: {
                merchant_id: gatewayData.merchant_id || gatewayData.MerchantId || '',
                order_id: gatewayData.order_id || gatewayData.OrderId || '',
                amount: gatewayData.amount || gatewayData.Amount || '0',
                currency: gatewayData.currency || gatewayData.Currency || 'LKR',
                return_url: gatewayData.return_url || gatewayData.ReturnUrl || '',
                cancel_url: gatewayData.cancel_url || gatewayData.CancelUrl || '',
                notify_url: gatewayData.notify_url || gatewayData.NotifyUrl || '',
                hash: gatewayData.hash || gatewayData.Hash || ''
                // Customer details (first_name, last_name, email, etc.) set by frontend
              }
            }
          };
          
          console.log('✅ Valid payment intent - Transformed eventData:', JSON.stringify(eventData, null, 2));
          onMessage(eventData);
        });

        // Handle global PaymentIntentCreated event
        connection.on("PaymentIntentCreatedGlobal", (data) => {
          console.log('🌍 PaymentIntentCreatedGlobal event received:', data);
          
          // Extract GatewayData from backend response
          const gatewayData = data.gatewayData || data.GatewayData || {};
          
          // Validate that this is a real payment intent
          if (!gatewayData.merchant_id && !gatewayData.MerchantId) {
            console.warn('⚠️ Received PaymentIntentCreatedGlobal but no merchant_id found - ignoring');
            return;
          }
          
          if (!gatewayData.order_id && !gatewayData.OrderId) {
            console.warn('⚠️ Received PaymentIntentCreatedGlobal but no order_id found - ignoring');
            return;
          }
          
          const eventData = {
            eventType: 'mydrive.v1.payment-intent-created',
            timestamp: data.createdAt || data.CreatedAt,
            payload: {
              PaymentId: data.paymentId || data.PaymentId,
              Status: data.status || data.Status,
              GatewayData: {
                merchant_id: gatewayData.merchant_id || gatewayData.MerchantId || '',
                order_id: gatewayData.order_id || gatewayData.OrderId || '',
                amount: gatewayData.amount || gatewayData.Amount || '0',
                currency: gatewayData.currency || gatewayData.Currency || 'LKR',
                return_url: gatewayData.return_url || gatewayData.ReturnUrl || '',
                cancel_url: gatewayData.cancel_url || gatewayData.CancelUrl || '',
                notify_url: gatewayData.notify_url || gatewayData.NotifyUrl || '',
                hash: gatewayData.hash || gatewayData.Hash || ''
                // Customer details (first_name, last_name, email, etc.) set by frontend
              }
            }
          };
          
          console.log('✅ Valid global payment intent - triggering navigation');
          onMessage(eventData);
        });

        // Handle reconnection events
        connection.onreconnecting((error) => {
          console.log('⚠️ Connection lost. Reconnecting...', error);
          setIsConnected(false);
          setError('Reconnecting...');
        });

        connection.onreconnected((connectionId) => {
          console.log('✅ Reconnected! Connection ID:', connectionId);
          setIsConnected(true);
          setError(null);
        });

        connection.onclose((error) => {
          console.log('❌ Connection closed:', error);
          setIsConnected(false);
          if (error) {
            setError(error.message || 'Connection closed');
          }
        });

        // Start the connection
        await connection.start();
        console.log('✅ Connected to SignalR hub');
        setIsConnected(true);
        setError(null);

        // Automatically subscribe to all payments
        await connection.invoke("SubscribeToAllPayments");
        console.log('📬 Subscribed to all payment updates');

      } catch (err) {
        console.error('❌ SignalR connection failed:', err);
        setError(err.message || 'Connection failed');
        setIsConnected(false);
      }
    };

    connect();

    // Cleanup
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [hubUrl, eventType, onMessage]);

  const disconnect = async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      setIsConnected(false);
    }
  };

  const subscribeToCustomer = async (customerId) => {
    if (connectionRef.current && isConnected) {
      try {
        await connectionRef.current.invoke("SubscribeToCustomerPayments", customerId);
        console.log(`📬 Subscribed to customer: ${customerId}`);
      } catch (err) {
        console.error('❌ Subscription failed:', err);
        setError(err.message);
      }
    }
  };

  const subscribeToInvoice = async (invoiceId) => {
    if (connectionRef.current && isConnected) {
      try {
        await connectionRef.current.invoke("SubscribeToInvoicePayment", invoiceId);
        console.log(`📬 Subscribed to invoice: ${invoiceId}`);
      } catch (err) {
        console.error('❌ Subscription failed:', err);
        setError(err.message);
      }
    }
  };

  const sendTestPaymentIntent = async () => {
    if (connectionRef.current && isConnected) {
      try {
        await connectionRef.current.invoke("SendTestPaymentIntent");
        console.log('🧪 Test event requested');
      } catch (err) {
        console.error('❌ Test event failed:', err);
        setError(err.message);
      }
    }
  };

  const subscribeToAllPayments = async () => {
    if (connectionRef.current && isConnected) {
      try {
        await connectionRef.current.invoke("SubscribeToAllPayments");
        console.log('📬 Subscribed to all payments');
      } catch (err) {
        console.error('❌ Subscription to all payments failed:', err);
        setError(err.message);
      }
    }
  };

  return { 
    isConnected, 
    error, 
    disconnect, 
    subscribeToCustomer, 
    subscribeToInvoice,
    subscribeToAllPayments,
    sendTestPaymentIntent
  };
};

export default useKafkaEvents;
