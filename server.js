const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });
let clients = [];

wss.on('connection', ws => {
  ws.id = Date.now() + Math.random();
  clients.push(ws);
  console.log('Client connected:', ws.id);

  ws.on('message', message => {
    // 全員に broadcast
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ id: ws.id, data: message.toString() }));
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('Client disconnected:', ws.id);
  });
});

console.log('WebSocket server running...');
