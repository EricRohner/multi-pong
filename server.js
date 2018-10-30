// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);
app.set('port', process.env.PORT || 5000);
app.use('/static', express.static(__dirname + '/static'));
// Routing
app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, 'index.html'));
});
// Starts the server.
server.listen(process.env.PORT || 5000, () => {
});
// Add the WebSocket handlers
io.on('connection', (socket) => {
});

//init game variables
let sockets = {};
let gameState = {
  player1:{
  assigned: 0,
  x: 15,
  y: 250,
  height: 80,
  width: 15,
  velocityY: 5,
  color: "#ffffff"
  },
  player2:{
    assigned: 0,
    x: 720,
    y: 250,
    height: 80,
    width: 15,
    velocityY: 5,
    color: "#ffffff"
  },
  ball:{
    x: 375,
    y: 250,
    height: 15,
    width: 15,
    velocityX: 1,
    velocityY: 1,
    color: "#ffffff"
  }
}
//execute this code for every connection made
io.on('connection', (socket) => {
  //when the player sends a new player message
  socket.on('new player', () => {
    //assign player1 if it's unclaimed
    if (!gameState.player1.assigned){
      sockets[socket.id] = {player: 1};
      gameState.player1.assigned = socket.id
    //assign player1 if it's unclaimed
    } else if (!gameState.player2.assigned) {
      sockets[socket.id] = {player: 2};
      gameState.player2.assigned = socket.id
      //game is full, you're an observer
    } else {
      sockets[socket.id] = {player: "observer"}
  }
  //when a disconnect occurs unassign their player and delete them from open sockets
  socket.on('disconnect', () => {
    if(sockets[socket.id].player === 1){
      gameState.player1.assigned = 0;
      gameState.player1.y = 280;
    }
    if(sockets[socket.id].player === 2){
      gameState.player2.assigned = 0;
      gameState.player2.y = 280;
    }
      delete sockets[socket.id]
    });
  });
  socket.on('movement', (data) => {
    //validate incoming control data
    if (typeof(data) !== "undefined"){
      //down arrow
      if (40 in data) {
        //if this is player 1 and there's room to move the paddle, move it down
        if(sockets[socket.id].player === 1 && gameState.player1.y + gameState.player1.velocityY + gameState.player1.height <= 500){
          gameState.player1.y += gameState.player1.velocityY;
        }
        //... player 2 ...
        if(sockets[socket.id].player === 2 && gameState.player2.y + gameState.player2.velocityY + gameState.player1.height <= 500){
          gameState.player2.y += gameState.player2.velocityY;
        }
      }
      //up arrow
      if (38 in data) {
        if(sockets[socket.id].player === 1 && gameState.player1.y - gameState.player1.velocityY >= 0){
          gameState.player1.y -= gameState.player1.velocityY;
        }
        if(sockets[socket.id].player === 2 && gameState.player2.y - gameState.player2.velocityY >= 0){
          gameState.player2.y -= gameState.player2.velocityY;
        }
      }
    }
  });
});
//attempt to send state at 60 fps
setInterval(() => {
  io.sockets.emit('state', gameState);
}, 1000 / 60);