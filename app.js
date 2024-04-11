const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
let users = [];
currPlayerInd = 0;
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
const cors = require("cors");
let indexRouter = require("./routes/index");
const PORT = env.PORT;
let corsOptins = {
  origin: "*",
  crossOrigin: true,
  credentials: true,
};
app.use(cors(corsOptins));

//Add this before the app.get() block
const chekIdInUsers = (id) => {
  return users.find((item) => item.id === id) != undefined;
};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  socket.on("join", (data) => {
    if (!chekIdInUsers(socket.id))
      users.push({ name: data + (users.length + 1).toString(), id: socket.id });
    console.log(users);
    socket.broadcast.emit("join", users[users.length - 1]);
  });
  // socket.on("red", () => {
  //   socket.broadcast.emit("play");
  // });
  socket.on("start_game", () => {
    socket.broadcast.emit("started");
    let currPlayer = users[currPlayerInd]["id"];
    if (currPlayer == socket.id) socket.emit("play");
    else socket.broadcast.to(users[currPlayerInd]["id"]).emit("play");
  });
  socket.on("restart", () => {
    socket.broadcast.emit("restart");
    socket.emit("restart");
  });
  socket.on("played", (num) => {
    socket.broadcast.emit("playednum", { num: num, me: false });
    socket.emit("playednum", { num: num, me: true });
    console.log("ind ", currPlayerInd, "socket ", socket.id);
    if (currPlayerInd == users.length - 1) currPlayerInd = 0;
    else currPlayerInd += 1;
    socket.broadcast.to(users[currPlayerInd]["id"]).emit("play");
  });
  socket.on("won", (winner) => {
    socket.broadcast.emit("lost", winner);
  });
  socket.on("disconnect", function () {
    socket.disconnect();
    for (let k = 0; k < users.length; k++) {
      if (users[k].id == socket.id) {
        users = [...users.slice(0, k).concat(users.slice(k + 1, users.length))];
      }
    }
    console.log("disconnect: ", socket.id);
  });
});
app.get("/allplayers", (req, res, next) => {
  console.log(users);
  res.status(200).send(users);
});
app.use("/", indexRouter);

server.listen(PORT, () => {
  console.log("listening at " + PORT + " ...");
});
