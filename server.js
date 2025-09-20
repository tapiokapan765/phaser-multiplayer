const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();

// public フォルダを静的配信
app.use(express.static(path.join(__dirname, 'public')));

// HTTPサーバーを作る
const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Server running on port', server.address().port);
});

// WebSocketサーバー
const wss = new WebSocketServer({ server });
let clients = [];

wss.on('connection', ws => {
  ws.id = Date.now() + Math.random();
  clients.push(ws);
  console.log('Client connected:', ws.id);

  ws.on('message', message => {
    clients.forEach(client => {
      if(client.readyState === WebSocket.OPEN){
        client.send(JSON.stringify({ id: ws.id, data: message.toString() }));
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('Client disconnected:', ws.id);
  });
});
