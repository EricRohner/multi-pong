var socket = io();
socket.on('message', function(data) {
  console.log(data);
});

  var keys = {}
    // add keyboard input listeners to handle user interactions
    window.addEventListener('keydown', e => {
      // keycode is technically deprecated. In a production environment we'd want to test key and keyIdentifier !== undefined.
      // however, since keyCode is currently the most supported one and I don't need this code to last forever I'll stick with it.
      keys[e.keyCode] = 1
      if (e.target.nodeName !== 'INPUT') e.preventDefault()
    })
    window.addEventListener('keyup', e => delete keys[e.keyCode])

  socket.emit('new player');
setInterval(function() {
  socket.emit('movement', keys);
}, 1000 / 60);

var canvas = document.getElementById('canvas');
canvas.width = 750;
canvas.height = 500;
var context = canvas.getContext('2d');
socket.on('state', function(players) {
  context.clearRect(0, 0, 750, 500);
  context.fillStyle = 'green';
  for (var id in players) {
    var player = players[id];
    context.beginPath();
    context.arc(player.x, player.y, 10, 0, 2 * Math.PI);
    context.fill();
  }
});