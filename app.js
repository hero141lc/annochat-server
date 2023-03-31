const express = require('express');
const expressWs = require('express-ws');
const bodyParser = require('body-parser');
const crypto = require('crypto');

var app = express();
var server = require('http').Server(app);
//app.use(express.static(path.join(__dirname, 'public')));
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'hbs');
//const app = express();
expressWs(app);

// 存储所有房间信息的对象
const rooms = {};

// 生成一个随机的房间ID
function generateRoomId() {
  return crypto.randomBytes(4).toString('hex');
}

// 创建一个新房间
function createRoom(roomId, endTime) {
  const room = {
    users: {},
    messages: [],
    endTime: Date.now() + endTime * 60 * 60 * 1000 // 计算聊天结束时间
  };
  rooms[roomId] = room;
  return room;
}

// 获取一个房间
function getRoom(roomId) {
  return rooms[roomId];
}

// 验证用户身份
function verifyUser(ws, roomId, username, password) {
  const room = getRoom(roomId);
  if (room && room.password === password) {
    room.users[ws] = username;
    return true;
  } else {
    return false;
  }
}

// 发送消息给房间内的所有用户
function broadcast(roomId, message) {
  const room = getRoom(roomId);
  if (room) {
    //if i>20 pop
    i = room.messages.push(message);
    if(i>20){room.messages.shift()}
    room.keys(room.users).forEach(ws => {
      ws.send(JSON.stringify(message));
    });
  }
}

// 解析json格式的请求体
app.use(bodyParser.json());
app.get('/', function (req, res) {
  res.send('Hello World');
})

// 处理创建房间请求
app.post('/create', (req, res) => {
  const roomId = generateRoomId();
  const endTime = req.body.endTime;
  const password = req.body.password;
  const room = createRoom(roomId, endTime);
  room.password = password;
  //setTimeout()
  res.send(roomId);
});

// 处理加入房间请求
app.ws('/chat/:roomId', (ws, req) => {
  const roomId = req.params.roomId;
  const username = req.query.username;
  const password = req.query.password;
  const room = getRoom(roomId);
  if (!room) {
    // 如果房间不存在，跳转到baidu.com
    res.redirect('https://www.baidu.com');
    return;
  }
  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      if (data.auth === 'auth') {
        // 验证用户身份
        if (verifyUser(ws, roomId, username, password)) {
          // 发送聊天记录
          room.messages.forEach(message => {
            ws.send(JSON.stringify(message));
          });
        } else {
          // 验证失败，断开连接
          ws.close();
        }
      } else if (data.auth === 'done') {
        // 发送聊天消息
        const message = {
          type: 'message',
          username: room.users[ws],
          content: data.content,
          timestamp: Date.now()
        };
        broadcast(roomId, message);
      }
    } catch (error) {
      console.error(error);
    }
  });
  ws.close()
})
server.listen(3002, function () {
  var host = server.address().address
  var port = server.address().port
 
  console.log("应用实例，访问地址为 http://%s:%s", host, port)
});