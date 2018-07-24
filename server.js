const express=require('express');
const http = require('http');
const app=express();
const socketServer = http.Server(app);
const socket = require('socket.io');
const PORT = process.env.PORT || 5000;
const io = socket(socketServer);
let mapping = new Object();
app.use('/',express.static('./public'));
socketServer.listen(PORT,function(req,res){
    console.log('Listening at port'+PORT);
});
io.sockets.on('connection',function(sk){
    sk.on('create or join',function(room){
        if(mapping[room]){
            if(mapping[room].length===1){
                io.emit('joined',room,sk.id);
                mapping[room].push(sk.id);
                console.log(mapping);
            }
            else{
                sk.emit('full',room);
                console.log(mapping);
            }
        }

        else{
            sk.emit('created',room,sk.id);
            mapping[room]=[];
            mapping[room].push(sk.id);
            console.log(mapping);
        }
        sk.on('disconnect',function(){
            if(mapping[room]) {
                if(mapping[room].length>0){
                    let room_name = mapping[room];
                    let index = room_name.indexOf(sk.id);
                    room_name.splice(index, 1);
                    console.log(mapping);
                    if(mapping[room].length===0){
                        delete mapping[room];
                        console.log(mapping);
                    }
                }


            }

        });

    });





});
