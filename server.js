const { Kafka } = require('kafkajs');
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');

const app = express();
app.use(cors());

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const kafka = new Kafka({
  clientId: 'satellite-visualizer',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'satellite-visualizer-group' });

// Initialize Schema Registry client
const registry = new SchemaRegistry({ host: 'http://localhost:8081' });

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

const broadcastToClients = (data) => {
  const message = JSON.stringify(data);
  console.log(`Broadcasting to ${clients.size} clients:`, data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      console.log('Message sent to client');
    }
  });
};

const startKafkaConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'satellite-position-events' });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const positionData = await registry.decode(message.value);
        console.log('Received satellite position:', positionData);
        
        broadcastToClients({
          type: 'satellite-position',
          data: positionData
        });
      } catch (error) {
        console.error('Error processing message:', error);
      }
    },
  });
};

app.get('/health', (req, res) => {
  res.json({ status: 'OK', clients: clients.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startKafkaConsumer().catch(console.error);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await consumer.disconnect();
  process.exit(0);
});