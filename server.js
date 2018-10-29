// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);
app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));
// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});
// Starts the server.
server.listen(5000, function() {
  console.log('Starting server on port 5000');
});
// Add the WebSocket handlers
io.on('connection', function(socket) {
});
let sockets = {};
let gameState = {
  player1:{
  assigned: 0,
  x: 15,
  y: 250
  },
  player2:{
    assigned: 0,
    x: 735,
    y: 250
  },
  ball:{
    x: 375,
    y: 250
  }
}

io.on('connection', function(socket) {
  socket.on('new player', function() {
    if (!gameState.player1.assigned){
    sockets[socket.id] = {
      player: 1
    };
    gameState.player1.assigned = socket.id
  } else if (!gameState.player2.assigned) {
      sockets[socket.id] = {
        player: 2
      };
      gameState.player2.assigned = socket.id
    } else {
      sockets[socket.id] = {
        player: "observer"
    }
  }

    socket.on('disconnect', function() {
      console.log('player ' + socket.id + ' disconnect');
      if(sockets[socket.id].player === 1){
        gameState.player1.assigned = 0;
        gameState.player1.y = 300;
      }
      if(sockets[socket.id].player === 2){
        gameState.player2.assigned = 0;
        gameState.player2.y = 300;
      }
      delete sockets[socket.id]
   });
  });
  socket.on('movement', function(data) {
    if (typeof(data) !== "undefined"){
    if (40 in data) {
      if(sockets[socket.id].player === 1){
        gameState.player1.y += 5;
      }
      if(sockets[socket.id].player === 2){
        gameState.player2.y += 5;
      }
    }
    if (38 in data) {
      if(sockets[socket.id].player === 1){
        gameState.player1.y -= 5;
      }
      if(sockets[socket.id].player === 2){
        gameState.player2.y -= 5;
      }
    }
}
  });
});
setInterval(function() {
  io.sockets.emit('state', gameState);
}, 1000 / 60);