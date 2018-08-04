"use strict";
//////////////////////////////////////////////////////////////////////////////////////////////
$(document).ready(function() {
    let isInitiator = false;
    let channelready = false;
    let isstarted = false;
    const LocalMediastream = {
        video: true,
        audio: true

    };
    let msg;
    const offerOptions = {
        offerToReceiveVideo: 1,
        offerToReceiveAudio: 1
    };
    let localvideo = document.getElementById('localvideo');
    let remotevideo = document.getElementById('remotevideo');
    let callbutton = document.getElementById('call');
    let endbutton = document.getElementById('hangup');

    let localstream;
    let remotestream;
    let peerConnection;
    callbutton.onclick = call;
    endbutton.onclick = endcall;
    const server={
        "iceServers":[
       
        ]
    };
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    let room=prompt("Enter room name:");
    console.log(room);
    while(room===""||room===null){
       room=prompt("Enter room name:");
    }
    const socket = io();
    socket.on('ping',function(data){
       console.log('Ping received.');
       socket.emit('pong',"pong");
    });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    socket.emit('create or join', room);
    socket.on('joined', function (roomno,id) {
        alert(id + " has joined the " + "room" + roomno);
        room=roomno;
        channelready = true;
    });
    socket.on('created', function (roomno,id) {
        alert(id+ " has created the room " + roomno);
    });
    socket.on('full', function (roomno) {
        alert('room ' + roomno + " is full try another room");
        room=prompt("Enter room name:");
       while(room===""||room===null){
           prompt("Enter room name:");
       }
        socket.emit('create or join', room);
    });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    console.log("Requesting local media stream..");
    callbutton.disabled = false;
    navigator.mediaDevices.getUserMedia(LocalMediastream).then(gotLocalMediaStream).catch(LocalMediaStreamError);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function gotLocalMediaStream(mediaStream) {
        localstream = mediaStream;
        localvideo.srcObject = localstream;
        remotevideo.style.display="none";
        console.log("got the local stream");

    }

    function LocalMediaStreamError(error) {
        console.log(`Getting following error in getting localstream: ${error.toString()}`);
    }


    function starting() {
        if (!isstarted && channelready && localstream !== 'undefined') {
            console.log('connection is starting...');
            createConnection();
            peerConnection.addStream(localstream);
            isstarted = true;
        }
    }

    function createConnection() {
        peerConnection = new RTCPeerConnection(server);
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleStreamAdded;

    }

    function handleIceCandidate(event) {
        console.log('Ice candidate created');
        let iceCandidate = event.candidate;
        if (iceCandidate) {
            Message({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            });
        }
        else {
            console.log('Ice Candidates ended..');
        }
    }

    function Message(message) {
        console.log('Peer sending message to ' + room);
        socket.emit('message',JSON.stringify(message),room);
    }

    socket.on('message sent', function (message){
        msg=JSON.parse(message);
          if(msg === "calling"){
              console.log("calling message received");
             callbutton.disabled=true;
             endbutton.disabled = false;
         }
        else if (msg.type === 'candidate' && isstarted) {
            console.log(' new ice candidate added ');
            let cd = new RTCIceCandidate({
                sdpMLineIndex: msg.label,
                candidate: msg.candidate
            });
            peerConnection.addIceCandidate(cd);
        }
        else if (msg.type === 'offer') {
            if (!isstarted && !isInitiator) {
                starting();
            }
            peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
            answer();
            localvideo.style.display="none";
            remotevideo.style.display="block";
        }
        else if (msg.type === 'answer' && isstarted) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
        }
        else if (msg === 'Call ended from other side' && isstarted) {
            alert('Call has ended from other side');
            isInitiator = false;
            end();
            callbutton.disabled=false;
            endbutton.disabled=true;
        }
    });

    function handleStreamAdded(event) {
        console.log('Adding the remote stream');
        remotestream = event.stream;
        remotevideo.srcObject = remotestream;
    }

    function call() {
        if(channelready){
            isInitiator=true;
            starting();
            Message('calling');
            callbutton.disabled = true;
            endbutton.disabled = false;
            localvideo.style.display="none";
            remotevideo.style.display="block";
            console.log('creating offer');
            peerConnection.createOffer(offerOptions).then(handleCreateOffer).catch(handleCreateOfferError);
        }
        else{
            alert('No other user online');
        }


    }

    function handleCreateOffer(description) {
        peerConnection.setLocalDescription(description);
        console.log('Sending local session description');
        Message(description);
    }

    function answer() {
        console.log('answering to the offer');
        peerConnection.createAnswer().then(handleCreateOffer).catch(SessionDescriptionError);
    }

    function SessionDescriptionError(error) {
        console.log(`Session Description error: ${error.toString()}`);
    }

    function handleCreateOfferError(error) {
        console.log(`Following error obtained in creating error:${error.toString()}`);
    }

    function endcall() {
        callbutton.disabled=false;
        endbutton.disabled=true;
        Message('Call ended from other side');
        end();

    }

    function end() {
        isstarted = false;
        peerConnection.close();
        peerConnection = null;
    }


});



