// dependencies
const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const fetch = require("node-fetch");
app.set("port", process.env.PORT || 5000);
app.use("/static", express.static(__dirname + "/static"));
// routing
app.get("/", (request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});
// start the server. use heroku app's process.env.PORT or 5000 if running locally
server.listen(process.env.PORT || 5000, () => {});

// initialize
let sockets = {};
let pause = true;
let gameState = {
  player1: {
    keys: {},
    assigned: 0,
    x: 15,
    y: 280,
    height: 80,
    width: 15,
    velocityY: 10,
    color: "#ffffff",
    score: 0
  },
  player2: {
    keys: {},
    assigned: 0,
    x: 720,
    y: 280,
    height: 80,
    width: 15,
    velocityY: 10,
    color: "#ffffff",
    score: 0
  },
  ball: {
    x: 375,
    y: 250,
    height: 15,
    width: 15,
    velocityX: 2,
    velocityY: 2,
    color: "#ffffff"
  }
};
// execute this code for every connection made
io.on("connection", socket => {
  // when the player sends a new player message
  socket.on("new player", function() {
    // assign player1 if it's unclaimed
    if (!gameState.player1.assigned) {
      sockets[socket.id] = { player: 1 };
      gameState.player1.assigned = socket.id;
      // only unpause if there's a player2 waiting
      if (gameState.player2.assigned) {
        pause = false;
      }
      // assign player1 if it's unclaimed
    } else if (!gameState.player2.assigned) {
      sockets[socket.id] = { player: 2 };
      gameState.player2.assigned = socket.id;
      // player 2 can only be assigned when there is already a player1 waiting
      pause = false;
      // game is full, you're an observer
    } else {
      sockets[socket.id] = { player: "observer" };
    }
    // when a disconnect occurs unassign the player and delete them from open sockets
    socket.on("disconnect", function() {
      if (sockets[socket.id].player === 1) {
        gameState.player1.assigned = 0;
        gameState.player1.y = 280;
        gameState.ball.x = 375;
        pause = true;
      }
      if (sockets[socket.id].player === 2) {
        gameState.player2.assigned = 0;
        gameState.player2.y = 280;
        gameState.ball.x = 375;
        pause = true;
      }
      delete sockets[socket.id];
    });
  });
  socket.on("movement", data => {
    // validate incoming control data
    if (
      typeof data !== "undefined" &&
      typeof sockets[socket.id].player !== "undefined"
    ) {
      if (sockets[socket.id].player === 1) {
        gameState.player1.keys = data;
      } else if (sockets[socket.id].player === 2) {
        gameState.player2.keys = data;
      }
      // down arrow
      if (40 in data) {
        // if this is player 1 and there's room to move the paddle, move it down
        if (
          sockets[socket.id].player === 1 &&
          gameState.player1.y +
            gameState.player1.velocityY +
            gameState.player1.height <=
            500
        ) {
          gameState.player1.y += gameState.player1.velocityY;
        }
        // player 2 ...
        if (
          sockets[socket.id].player === 2 &&
          gameState.player2.y +
            gameState.player2.velocityY +
            gameState.player2.height <=
            500
        ) {
          gameState.player2.y += gameState.player2.velocityY;
        }
      }
      // up arrow
      if (38 in data) {
        if (
          sockets[socket.id].player === 1 &&
          gameState.player1.y - gameState.player1.velocityY >= 0
        ) {
          gameState.player1.y -= gameState.player1.velocityY;
        }
        if (
          sockets[socket.id].player === 2 &&
          gameState.player2.y - gameState.player2.velocityY >= 0
        ) {
          gameState.player2.y -= gameState.player2.velocityY;
        }
      }
    }
  });
});

setInterval(async () => {
  if (!pause) {
    response = await fetch(
      "https://wwwforms.suralink.com/pong.php?accessToken=pingPONG"
    );
    response = await response.json();
    // i could validate more but I trust the server so a simple !array test tells me if important data is coming in or not
    if (!Array.isArray(response.gameData.paddle1)) {
      // shallow merge player1 and paddle1. Set the result to state.
      gameState.player1 = {
        ...gameState.player1,
        ...response.gameData.paddle1
      };
      // fix color so that it can be displayed without any further logic unless it's a string meaning we already did so
      if (typeof gameState.player1.color !== "string") {
        gameState.player1.color = "#" + gameState.player1.color.hex;
      }
    }
    if (!Array.isArray(response.gameData.paddle2)) {
      gameState.player2 = {
        ...gameState.player2,
        ...response.gameData.paddle2
      };
      if (typeof gameState.player2.color !== "string") {
        gameState.player2.color = "#" + gameState.player2.color.hex;
      }
    }
    if (!Array.isArray(response.gameData.ball)) {
      // Ball velocity from server is always positive. We don't want to punish player 2
      let velX = gameState.ball.velocityX;
      gameState.ball = { ...gameState.ball, ...response.gameData.ball };
      if (typeof gameState.ball.color !== "string") {
        gameState.ball.color = "#" + gameState.ball.color.hex;
      }
      if (velX < 0 && gameState.ball.velocityX > 0) {
        gameState.ball.velocityX = gameState.ball.velocityX * -1;
      }
    }
  }
}, 5000);

// calculate new state and attempt to send at 30 fps
setInterval(() => {
  if (!pause) {
    // collision y
    if (
      gameState.ball.y + gameState.ball.velocityY <= 0 ||
      gameState.ball.y + gameState.ball.velocityY + gameState.ball.height >= 500
    ) {
      gameState.ball.velocityY = gameState.ball.velocityY * -1;
      gameState.ball.x += gameState.ball.velocityX;
      gameState.ball.y += gameState.ball.velocityY;
    } else {
      gameState.ball.x += gameState.ball.velocityX;
      gameState.ball.y += gameState.ball.velocityY;
    }
    // collision x
    if (
      gameState.ball.x + gameState.ball.velocityX <=
        gameState.player1.x + gameState.player1.width &&
      gameState.ball.y + gameState.ball.velocityY > gameState.player1.y &&
      gameState.ball.y + gameState.ball.velocityY <=
        gameState.player1.y + gameState.player1.height
    ) {
      // bounce
      gameState.ball.velocityX = Math.abs(gameState.ball.velocityX) + 1;
      // add velocity from paddle movement
      if (40 in gameState.player1.keys) {
        gameState.ball.velocityY += 2;
      } else if (38 in gameState.player1.keys) {
        gameState.ball.velocityY -= 2;
      }
    } else if (
      gameState.ball.x + gameState.ball.width + gameState.ball.velocityX >=
        gameState.player2.x &&
      gameState.ball.y + gameState.ball.velocityY > gameState.player2.y &&
      gameState.ball.y + gameState.ball.velocityY <=
        gameState.player2.y + gameState.player2.height
    ) {
      // bounce
      gameState.ball.velocityX = Math.abs(gameState.ball.velocityX) * -1 - 1;
      if (40 in gameState.player2.keys) {
        gameState.ball.velocityY += 2;
      } else if (38 in gameState.player2.keys) {
        gameState.ball.velocityY -= 2;
      }
    } else if (
      // score test
      gameState.ball.x + gameState.ball.velocityX <
      gameState.player1.x - gameState.player1.width
    ) {
      gameState.player2.score += 1;
      gameState.ball = {
        ...gameState.ball,
        x: 375,
        y: 250,
        velocityX: -2,
        velocityY: 2
      };
    } else if (
      // score test
      gameState.ball.x + gameState.ball.velocityX >
      gameState.player2.x + gameState.player2.width
    ) {
      gameState.player1.score += 1;
      gameState.ball = {
        ...gameState.ball,
        x: 375,
        y: 250,
        velocityX: 2,
        velocityY: 2
      };
    } else {
      gameState.ball.x += gameState.ball.velocityX;
      gameState.ball.y += gameState.ball.velocityY;
    }
  }
  // send updated gameState
  io.sockets.emit("state", gameState);
}, 1000 / 30);
