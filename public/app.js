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
/////////////////////////////////////////////////////////////////////////////////////////
    let room = prompt("Enter the room name:");
    const socket = io();
    socket.emit('create or join', room);
    socket.on('joined', function (roomno, id) {
        alert(id + " has joined the " + roomno + " room");
        channelready = true;
    });
    socket.on('created', function (roomno, id) {
        alert(id + " has created the room " + roomno);
    });
    socket.on('full', function (roomno) {
        alert('room ' + roomno + " is full try another room");
        room = prompt("Enter another room name:");
        socket.emit('create or join', room);
    });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    console.log("Requesting localmediastream..");
    callbutton.disabled = false;
    navigator.mediaDevices.getUserMedia(LocalMediastream).then(gotLocalMediaStream).catch(LocalMediaStreamError);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function gotLocalMediaStream(mediaStream) {
        localstream = mediaStream;
        localvideo.srcObject = localstream;
        console.log("got the local stream");
        Message('got local media');
        if (isInitiator) {
            starting();
        }
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
            if (isInitiator) {
                callbutton.disabled = false;
            }

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
        console.log('Peer sending message');
        socket.emit('message',JSON.stringify(message));
    }

    socket.on('message sent', function (message){
        msg=JSON.parse(message);
        if (msg === "got local media") {
            starting();
        }
        if (msg.type === 'candidate' && isstarted) {
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
        }
        else if (msg.type === 'answer' && isstarted) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
        }
        else if (msg === 'Call ended from other side' && isstarted) {
            alert('Call has ended from other side');
            isInitiator = false;
            end();
        }
    });

    function handleStreamAdded(event) {
        console.log('Adding the remote stream');
        remotestream = event.stream;
        remotevideo.srcObject = remotestream;
    }

    function call() {
        isInitiator=true;
        callbutton.disabled = true;
        endbutton.disabled = false;
        console.log('creating offer');
        peerConnection.createOffer(offerOptions).then(handleCreateOffer).catch(handleCreateOfferError);

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

        Message('Call ended from other side');
        end();

    }

    function end() {
        isstarted = false;
        peerConnection.close();
        peerConnection = null;
    }


});



