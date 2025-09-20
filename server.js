const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });
let clients = [];

wss.on('connection', ws => {
  clients.push(ws);
  console.log('Client connected');

  ws.on('message', message => {
    // 受信したメッセージを全員に送信
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('Client disconnected');
  });
});

console.log('WebSocket server running...');
