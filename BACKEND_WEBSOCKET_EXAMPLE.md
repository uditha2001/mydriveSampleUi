# Backend WebSocket Server Example

This is a reference implementation for bridging Kafka events to WebSocket clients.

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Kafka     │         │     Backend      │         │   React     │
│  (port 9092)│ ──────► │  WebSocket Server│ ──────► │  Frontend   │
│   Broker    │         │  (port 5000)     │         │  (Browser)  │
└─────────────┘         └──────────────────┘         └─────────────┘
```

## Node.js Example with Socket.io and KafkaJS

```javascript
// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { Kafka } = require('kafkajs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000", // Your React app URL
    methods: ["GET", "POST"]
  }
});

const PORT = 8085; // Your backend port

// Initialize Kafka
const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: ['localhost:9092'] // Kafka runs on port 9092
});

const consumer = kafka.consumer({ groupId: 'websocket-forwarder' });

// Connect to Kafka and subscribe to topics
const connectKafka = async () => {
  await consumer.connect();
  await consumer.subscribe({ 
    topic: 'payment-events', 
    fromBeginning: false 
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const eventData = JSON.parse(message.value.toString());
      
      // Forward Kafka event to all connected WebSocket clients
      if (eventData.eventType === 'mydrive.v1.payment-intent-created') {
        console.log('Broadcasting payment event to clients:', eventData);
        io.emit('kafka-event', eventData);
      }
    },
  });
};

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (data) => {
    console.log('Client subscribed to:', data.eventType);
    socket.join(data.eventType); // Join a room for specific event type
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

connectKafka().catch(console.error);

server.listen(PORT, () => {
  console.log(`WebSocket server running on http://localhost:${PORT}`);
});
```

## C# ASP.NET Core Example with SignalR and Confluent.Kafka

```csharp
// KafkaHostedService.cs
using Confluent.Kafka;
using Microsoft.AspNetCore.SignalR;

public class KafkaHostedService : BackgroundService
{
    private readonly IHubContext<KafkaHub> _hubContext;
    private readonly IConfiguration _configuration;

    public KafkaHostedService(IHubContext<KafkaHub> hubContext, IConfiguration configuration)
    {
        _hubContext = hubContext;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var config = new ConsumerConfig
        {
            GroupId = "websocket-forwarder",
            BootstrapServers = "localhost:9092", // Kafka port
            AutoOffsetReset = AutoOffsetReset.Latest
        };

        using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
        consumer.Subscribe("payment-events");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var result = consumer.Consume(stoppingToken);
                var eventData = JsonSerializer.Deserialize<KafkaEvent>(result.Message.Value);

                if (eventData?.EventType == "mydrive.v1.payment-intent-created")
                {
                    // Broadcast to all connected clients
                    await _hubContext.Clients.All.SendAsync(
                        "ReceiveKafkaEvent", 
                        eventData, 
                        stoppingToken
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error consuming Kafka message: {ex.Message}");
            }
        }
    }
}

// KafkaHub.cs
using Microsoft.AspNetCore.SignalR;

public class KafkaHub : Hub
{
    public async Task Subscribe(string eventType)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, eventType);
        Console.WriteLine($"Client {Context.ConnectionId} subscribed to {eventType}");
    }

    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"Client connected: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"Client disconnected: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }
}

// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddHostedService<KafkaHostedService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("ReactApp");
app.MapHub<KafkaHub>("/kafka/events");

app.Run("http://localhost:8085");
```

## Update React Frontend for SignalR (if using .NET backend)

If your backend uses SignalR instead of Socket.io, update the frontend:

```bash
npm install @microsoft/signalr
```

```javascript
// src/hooks/useKafkaEvents.js (SignalR version)
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const useKafkaEvents = (wsUrl, eventType, onMessage) => {
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(wsUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    connection.on("ReceiveKafkaEvent", (data) => {
      if (data.eventType === eventType) {
        onMessage(data);
      }
    });

    connection.start()
      .then(() => {
        console.log("SignalR Connected");
        connection.invoke("Subscribe", eventType);
      })
      .catch(err => console.error("SignalR Error:", err));

    return () => connection.stop();
  }, [wsUrl, eventType, onMessage]);
};
```

## Environment Variables

Create a `.env` file in your backend:

```env
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=payment-events
KAFKA_GROUP_ID=websocket-forwarder
WEBSOCKET_PORT=8085
FRONTEND_URL=http://localhost:3000
```

## Testing

1. Start Kafka on port 9092
2. Start your backend WebSocket server
3. Start React frontend (`npm start`)
4. Produce a test event to Kafka:

```bash
# Using kafka-console-producer
kafka-console-producer --broker-list localhost:9092 --topic payment-events

# Then paste this JSON:
{"eventType":"mydrive.v1.payment-intent-created","payload":{"GatewayData":{"merchant_id":"1221149","order_id":"TEST_001","amount":"1000.00","currency":"LKR","hash":"test_hash"}}}
```

The React frontend should receive and display the payment data automatically!
