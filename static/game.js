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
}, 1000 / 30);

var canvas = document.getElementById('canvas');
canvas.width = 750;
canvas.height = 500;
var context = canvas.getContext('2d');

socket.on('state', function(items) {
  context.clearRect(0, 0, 750, 500);
  context.fillStyle = 'green';
  context.fillRect(0, 0, 750, 500)
  context.fillStyle = "white"
  context.fillRect(373, 0, 5, 500)
  for (var id in items) {
    var item = items[id];
    context.fillStyle = item.color
    context.fillRect(item.x, item.y, item.width, item.height)
  }
  context.font = '20px Arial'
  context.fillStyle = '#ffffff'
  context.fillText(items.player1.score, 375 - (items.player1.score > 9 ? 55 : 45), 30)
  context.fillText(items.player2.score, 375 + 33, 30)
});