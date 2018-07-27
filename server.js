const express=require('express');
const http =require('http');
const app=express();
const socketServer = http.Server(app);


const bodyParser=require('body-parser');
const socket = require('socket.io');
const PORT = process.env.PORT || 5000;
const io = socket(socketServer);


require('events').EventEmitter.defaultMaxListeners = 100;
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());


app.use('/',express.static('./public'));


socketServer.listen(PORT,function(req,res){
    console.log('Listening at port'+PORT);
});

io.sockets.on('connection',function(sk){
       setTimeout(sendHeartbeat, 25000);

        function sendHeartbeat(){
            setTimeout(sendHeartbeat, 25000);
            io.sockets.emit('ping', { beat : 1 });
        }
      sk.on('pong',function(){
        console.log("Client sent a pong");
    });


    sk.on('create or join',function(room){
        let room_client =io.sockets.adapter.rooms[room];
        let client_number;
        if(room_client){
            client_number = Object.keys(room_client.sockets).length;
        }
        else{
            client_number=0;
        }
        if(client_number===0){
            sk.join(room);
            sk.emit('created',room,sk.id);
            console.log("Room is created");
        }
        else if(client_number===1){
            sk.join(room);
            io.in(room).emit('joined',room,sk.id);
            console.log("room is joined");
        }
        else{
            sk.emit('full',room);
            console.log("Room is full try another room");
        }

    });
    sk.on('message',function(message,roomno){
        console.log('Following message is sent to room '+roomno+': ' +message);
        sk.to(roomno).emit('message sent',message);
    });


});
