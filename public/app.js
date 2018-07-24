"use strict";
//////////////////////////////////////////////////////////////////////////////////////////////
$(document).ready(function(){
    let isInitiator=false;
    let channelready=false;
    const LocalMediastream={
        video:true,
        audio:true

    };
    const offerOptions ={
        offerToReceiveVideo:1,
        offerToReceiveAudio:1
    };
    let localvideo=document.getElementById('localvideo');
    let remotevideo = document.getElementById('remotevideo');
    let startbutton=document.getElementById('start');
    let callbutton=document.getElementById('call');
    let endbutton=document.getElementById('hangup');

    let localstream;
    let remotestream;
    let localPeerConnection;
    let remotePeerConnection;


/////////////////////////////////////////////////////////////////////////////////////////
    let room = prompt("Enter the room name:");
    const socket = io();
    socket.emit('create or join',room);
    socket.on('joined',function(roomno,id){
        alert(id+" has joined the "+roomno+" room");
        channelready=true;
    });
    socket.on('created',function(roomno,id){
        isInitiator=true;
        alert(id+" has created the room "+roomno);
    });
    socket.on('full',function(roomno){
        alert('room '+roomno+" is full try another room");
        room=prompt("Enter another room name:");
        socket.emit('create or join',room);
    });
    const server= {
        "iceServers":
            [{
                "urls": "stun:stun.l.google.com:19302"
            },
                {
                    "urls":
                        "turn:192.168.1.156:3478",
                    "username": "sonali",
                    "credential": "@ttitude"
                },
                {
                    "urls": "turn:w3.xirsys.com:80?transport=udp",
                    "username": "65b1ebe2-8f32-11e8-9680-0dbe0cda4869",
                    "credential" : "65b1ec5a-8f32-11e8-85ae-f83960d357c9"
                }
            ]

    };
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    function gotLocalMediaStream(mediaStream){
        localstream =mediaStream;
        localvideo.srcObject=localstream;
        console.trace("got the local stream");
    }
    function gotRemoteMediaStream(event){
        let mediaStream=event.stream;
        remotevideo.srcObject = mediaStream;
        remotestream  = mediaStream;
        console.trace('Remote media stream added');
    }
    function LocalMediaStreamError(error){
        console.trace(`Getting following error in getting localstream: ${error.toString()}`);
    }
    function gatherOtherPeer(target){
        return (target===localPeerConnection)?remotePeerConnection:localPeerConnection;
    }
    function handleConnectionSuccess(){
        console.trace('Connection established');
    }
    function handleConnectionFailure(){
        console.trace('Connection Failed');
    }
    function handleConnection(event){
        const iceCandidate=event.candidate;
        const target = event.target;
        if(iceCandidate){
            const newIceCandidate = new RTCIceCandidate(iceCandidate);
            const otherPeer = gatherOtherPeer(target);
            otherPeer.addIceCandidate(newIceCandidate).then(handleConnectionSuccess).catch(handleConnectionFailure);
        }
        console.trace(`ICE Candidate: ${iceCandidate.candidate}`);
    }
    function handleConnectionError(event){
        let peerConnection = event.target;
        console.trace(`Following State change obtained:${peerConnection.iceConnectionState}`);
    }
    function createdAnswer(description){
        console.trace(`Answer from remote peer connection ${description.sdp}`);
        remotePeerConnection.setLocalDescription(description).then(SessionDescriptionSuccess).catch(SessionDescriptionError);
        localPeerConnection.setRemoteDescription(description).then(SessionDescriptionSuccess).catch(SessionDescriptionError);
    }
    function SessionDescriptionSuccess(){
        console.trace('Session Description is set.');

    }
    function SessionDescriptionError(error){
        console.trace( `${error.toString()} error obtained in setting session Description`);

    }
    function createdOffer(description){
        console.trace(`Offer from local peer connection ${description.sdp}`);
        localPeerConnection.setLocalDescription(description).then(SessionDescriptionSuccess).catch(SessionDescriptionError);
        remotePeerConnection.setRemoteDescription(description).then(SessionDescriptionSuccess).catch(SessionDescriptionError);
        remotePeerConnection.createAnswer().then(createdAnswer).catch(SessionDescriptionError);
    }
        startbutton.onclick=start;
        callbutton.onclick=call;
        endbutton.onclick=hangup;


    function start(){
        if(isInitiator){
            console.trace("Requesting localmediastream..");
            startbutton.disabled=true;
            callbutton.disabled = false;
            navigator.mediaDevices.getUserMedia(LocalMediastream).then(gotLocalMediaStream).catch(LocalMediaStreamError);
        }

    }
    function call(){ if(channelready) {
        console.trace('Call has started..');
        callbutton.disabled = true;
        endbutton.disabled = false;
        // const server=null;
        console.trace('Creating local peer connection');
        localPeerConnection = new RTCPeerConnection(server);
        console.trace('Creating the ice candidate');
        localPeerConnection.onicecandidate = handleConnection;
        console.trace('Checking for error in connection state change');
        localPeerConnection.oniceconnectionstatechange = handleConnectionError;
        console.trace('Creating remote peer connection');
        remotePeerConnection = new RTCPeerConnection(server);
        console.trace('Sending ice candidate ');
        remotePeerConnection.onicecandidate = handleConnection;
        console.log('Checking for state change..');
        remotePeerConnection.oniceconnectionstatechange = handleConnectionError;
        console.trace('Adding local stream to send to other peer');

        console.trace('Adding remote stream');
        remotePeerConnection.onaddstream = gotRemoteMediaStream;

        localPeerConnection.addStream(localstream);
        console.trace('Added local stream to local peer connection.');

        console.trace('Local peer connection create offer starts.');
        localPeerConnection.createOffer(offerOptions).then(createdOffer).catch(SessionDescriptionError);
    }
    }
    function hangup(){
        endbutton.disabled=true;
        callbutton.disabled=false;
        localPeerConnection.close();
        remotePeerConnection.close();
        localPeerConnection=null;
        remotePeerConnection=null;
        console.trace('Ending call...');
    }



});
