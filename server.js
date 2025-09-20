const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const port = 8080;
const server = http.createServer((req,res)=>{
  let filePath = path.join(__dirname, req.url==='/'?'index.html':req.url);
  const ext = path.extname(filePath);
  const mimeTypes = {'.html':'text/html','.js':'text/javascript','.css':'text/css'};
  fs.readFile(filePath,(err,content)=>{
    if(err){ res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200,{'Content-Type':mimeTypes[ext]||'text/plain'});
    res.end(content);
  });
});

server.listen(port,()=>console.log(`サーバ起動: http://localhost:${port}`));

const wss = new WebSocket.Server({server});
const players = {};
let obstacles = [];

// 永続ランキングファイル
const rankingFile = 'ranking.json';
let totalRanking = [];
if(fs.existsSync(rankingFile)){
    totalRanking = JSON.parse(fs.readFileSync(rankingFile));
}

// 永続ランキング更新
function recordScore(player){
    totalRanking.push({name: player.name, score: Math.floor(player.score)});
    totalRanking = totalRanking.sort((a,b)=>b.score - a.score).slice(0,5); // 上位5位
    fs.writeFileSync(rankingFile, JSON.stringify(totalRanking));
}

// リアルタイムランキング
function getRanking() {
    return Object.entries(players)
        .map(([id,p]) => ({ id, score: Math.floor(p.score) }))
        .sort((a,b)=>b.score - a.score)
        .slice(0,5); // 上位5位
}

wss.on('connection', ws=>{
  const id = Date.now() + Math.random();
  players[id] = { 
      x:200, y:300, vy:0, onGround:true, score:0, gameOver:false,
      name:'', invincible:true, invincibleTimer:60
  };
  ws.send(JSON.stringify({ type:'init', id }));

  ws.on('message', msg=>{
    const data = JSON.parse(msg);
    const p = players[id];
    if(!p) return;

    if(data.type==='setName'){
        p.name = data.name.slice(0,12) || 'Player';
    }
    if(data.type==='jump' && !p.gameOver && p.onGround){
      p.vy=-10;
      p.onGround=false;
    }
    if(data.type==='restart'){
      players[id] = { 
        x:200, y:300, vy:0, onGround:true, score:0, gameOver:false,
        name: p.name, invincible:true, invincibleTimer:60
      };
    }
  });

  ws.on('close',()=>{ delete players[id]; });
});

// ゲームループ
setInterval(()=>{
  for(const id in players){
    const p = players[id];
    if(typeof p.gameOver !== 'boolean') p.gameOver=false;
    if(p.gameOver) continue;

    if(p.invincible){
        p.invincibleTimer--;
        if(p.invincibleTimer<=0) p.invincible=false;
    }

    p.vy += 0.5;
    p.y += p.vy;
    if(p.y>300){ p.y=300; p.vy=0; p.onGround=true; }

    if(typeof p.score!=='number') p.score=0;
    p.score += 1/60;

    if(!p.invincible){
        obstacles.forEach(ob=>{
          if(p.x < ob.x + ob.width && p.x + 20 > ob.x &&
             p.y < ob.y + ob.height && p.y + 20 > ob.y){
            p.x -= ob.speed;
          }
        });
    }

    if(p.x <= 0.1){
      p.x = 0;
      p.gameOver = true;
      recordScore(p); // ゲームオーバー時に永続ランキング更新
    }
  }

  if(Math.random()<0.017){ 
    const types = [
      {width:20,height:20,speed:3},
      {width:30,height:30,speed:4.5},
      {width:10,height:40,speed:2.25}
    ];
    const obType = types[Math.floor(Math.random()*types.length)];
    obstacles.push({ x:400, y:300, ...obType });
  }

  if(Math.random()<0.01){ // 出現量半分
    const types = [
      {width:10,height:30,speed:2.75}
    ];
    const obType = types[Math.floor(Math.random()*types.length)];
    obstacles.push({ x:400, y:200, ...obType });
  }

  obstacles.forEach(ob=> ob.x -= ob.speed);
  obstacles = obstacles.filter(ob => ob.x + ob.width > 0);

  const state = JSON.stringify({
    type:'state',
    players,
    obstacles,
    ranking: getRanking(),
    totalRanking // 上位5位永続ランキング
  });

  wss.clients.forEach(client=>{
    if(client.readyState===WebSocket.OPEN) client.send(state);
  });

},1000/60);
