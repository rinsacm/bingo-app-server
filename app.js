const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const rooms = [];

currPlayerInd = 0;
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
const cors = require("cors");
let indexRouter = require("./routes/index");
require("dotenv").config();
const PORT = process.env.PORT;
let corsOptins = {
  origin: "*",
  crossOrigin: true,
  credentials: true,
};
app.use(cors(corsOptins));

//Add this before the app.get() block
const chekIdInUsers = (id, index) => {
  return rooms[index]["users"].find((item) => item.socketid == id);
};
const checkRoomExists = (room) => {
  let index = rooms.findIndex((item) => item["roomName"].toString() == room);
  return index != -1 ? index : -1;
};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  socket.on("join", (username, room) => {
    socket.join(room);
    let res = checkRoomExists(room);
    if (res == -1) {
      let temp = {};
      temp["roomName"] = room;
      temp["users"] = [];
      temp["currPlayerInd"] = 0;
      let tempUser = {};
      tempUser["name"] = username;
      tempUser["socketid"] = socket.id;
      temp["users"].push(tempUser);
      rooms.push(temp);
    } else {
      let temp = rooms[res];

      if (!chekIdInUsers(socket.id, res)) {
        let tempUser = {};
        tempUser["name"] = username;
        tempUser["socketid"] = socket.id;
        temp["users"].push(tempUser);
      }
      rooms[res] = temp;

      // io.to(room).emit(
      //   "join",
      //   rooms[res]["users"][rooms[res]["users"].length - 1]["name"]
      // );
      socket.broadcast.to(socket.id).emit("getsocketDetail", socket.id);
      io.to(room).to(socket.id).emit("new_player");
    }
    // io.to(room).emit("new_user", username);
  });

  // socket.on("red", () => {
  //   socket.broadcast.emit("play");
  // });
  socket.on("start_game", (room) => {
    io.to(room).emit("started");
    let roomInd = checkRoomExists(room);
    rooms[roomInd]["currPlayerInd"] = 0;

    let currPlayerInd = rooms[roomInd]["currPlayerInd"];
    let currPlayer = rooms[roomInd]["users"][currPlayerInd]["socketid"];
    if (currPlayer == socket.id) socket.emit("play");
    else
      socket.broadcast
        .to(rooms[roomInd]["users"][currPlayerInd]["socketid"])
        .emit("play");
  });
  socket.on("restart", (room) => {
    socket.to(room).emit("restart");
    socket.emit("restart");
  });
  socket.on("played", (num, room, socketid) => {
    let roomInd = checkRoomExists(room);
    let currPlayerInd = rooms[roomInd]["currPlayerInd"];
    socket.emit("playednum", { num: num, socketid: socketid });
    socket.to(room).emit("playednum", { num: num, socketid: socketid });

    console.log("ind ", currPlayerInd, "socket ", socket.id);

    if (currPlayerInd == rooms[roomInd]["users"].length - 1) {
      currPlayerInd = 0;
      rooms[roomInd]["currPlayerInd"] = 0;
    } else {
      rooms[roomInd]["currPlayerInd"] = rooms[roomInd]["currPlayerInd"] + 1;
      currPlayerInd = rooms[roomInd]["currPlayerInd"];
    }
    console.log(currPlayerInd);
    console.log(rooms[roomInd]["users"]);
    socket.broadcast
      .to(rooms[roomInd]["users"][currPlayerInd]["socketid"])
      .emit("play");
  });
  socket.on("won", (winner, room) => {
    io.to(room).emit("lost", winner);
  });
  socket.on("disconnect", function () {
    socket.disconnect();
    for (let k = 0; k < rooms.length; k++) {
      for (let j = 0; j < rooms[k]["users"].length; j++) {
        if (rooms[k]["users"][j]["socketid"] == socket.id) {
          let tmp = rooms[k]["users"];
          console.log(rooms);
          let newUserArr = [
            ...tmp.slice(0, j).concat(tmp.slice(j + 1, tmp.length)),
          ];
          rooms[k]["users"] = [...newUserArr];
        }
      }
    }
    console.log("disconnect: ", socket.id);
  });
});

app.use("/", indexRouter);

server.listen(PORT, () => {
  console.log("listening at " + PORT + " ...");
});
app.get("/allplayers", (req, res, next) => {
  let ind = checkRoomExists(req.query.roomName);
  if (ind != -1) return res.status(200).send(rooms[ind]["users"]);
  else return res.status(200).send([]);
});
