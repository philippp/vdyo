// Config variables: change them to point to your own servers
const SIGNALING_SERVER_URL = 'http://135.180.73.3:9999';
const TURN_SERVER_URL = '135.180.73.3:3478';
const TURN_SERVER_USERNAME = '1607587488';
const TURN_SERVER_CREDENTIAL = 'A6bI04EaHIu7PyZ5Zy0lXzQhbjo=';

// WebRTC config: you don't have to change this for the example to work
// If you are testing on localhost, you can just use PC_CONFIG = {}
const PC_CONFIG = {
  iceServers: [
    {
      urls: 'turn:' + TURN_SERVER_URL + '?transport=tcp',
      username: TURN_SERVER_USERNAME,
      credential: TURN_SERVER_CREDENTIAL
    },
    {
      urls: 'turn:' + TURN_SERVER_URL + '?transport=udp',
      username: TURN_SERVER_USERNAME,
      credential: TURN_SERVER_CREDENTIAL
    }
  ]
};

// Signaling methods
let socket = io(SIGNALING_SERVER_URL, { autoConnect: false });

socket.on('data', (data) => {
  console.log('Data received: ',data);
  handleSignalingData(data);
});

socket.on('ready', () => {
  console.log('Ready');
  // Connection with signaling server is ready, and so is local stream
  createPeerConnection();
  sendOffer();
});

let sendData = (data) => {
  socket.emit('data', data);
};

// WebRTC methods
let pc;
let localStream;
let remoteStreamElement = document.querySelector('#remoteStream');
let localStreamElement = document.querySelector('#localStream');

let getLocalStream = () => {
  navigator.mediaDevices.getUserMedia({ video: true })
		.then((stream) => {
				console.log('Stream found');
				localStream = stream;
				localStreamElement.srcObject = stream;
      // Connect after making sure that local stream is availble
      socket.connect();
    })
    .catch(error => {
      console.error('Stream not found: ', error);
    });
}

let createPeerConnection = () => {
  try {
    pc = new RTCPeerConnection(PC_CONFIG);
    pc.onicecandidate = onIceCandidate;
    pc.onaddstream = onAddStream;
    pc.addStream(localStream);
    console.log('PeerConnection created');
  } catch (error) {
    console.error('PeerConnection failed: ', error);
  }
};

let sendOffer = () => {
  console.log('Send offer');
  pc.createOffer().then(
    setAndSendLocalDescription,
    (error) => { console.error('Send offer failed: ', error); }
  );
};

let sendAnswer = () => {
  console.log('Send answer');
  pc.createAnswer().then(
    setAndSendLocalDescription,
    (error) => { console.error('Send answer failed: ', error); }
  );
};

let setAndSendLocalDescription = (sessionDescription) => {
  pc.setLocalDescription(sessionDescription);
  console.log('Local description set');
  sendData(sessionDescription);
};

let onIceCandidate = (event) => {
  if (event.candidate) {
    console.log('ICE candidate');
    sendData({
      type: 'candidate',
      candidate: event.candidate
    });
  }
};

let onAddStream = (event) => {
  console.log('Add stream');
  remoteStreamElement.srcObject = event.stream;
};

let onAnimationData = (data) => {
    if(!data.animation) {
	console.log("Received data.type = 'animation' without animation submessage");
    }
    switch (data.animation.type) {
    case 'balloons':
	console.log("Balloons!!");
	if (!data.animation.isCancellation) {
	    animationBalloonsPlay();
	} else {
	    animationCancel('balloons');
	}
	break;
    }

    if (data.animation.remoteThumbnailData) {
	var img = new Image;
	img.onload = function(){
	    localContext.clearRect(0, 0, localCanvas.width, localCanvas.height);
	    localContext.drawImage(img,0,0);
	};
	img.src = data.animation.remoteThumbnailData;
    }
};

let handleSignalingData = (data) => {
  switch (data.type) {
    case 'offer':
      createPeerConnection();
      pc.setRemoteDescription(new RTCSessionDescription(data));
      sendAnswer();
      break;
    case 'answer':
      pc.setRemoteDescription(new RTCSessionDescription(data));
      break;
    case 'candidate':
      pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      break;
  case 'animation':
      onAnimationData(data);
      break;
  }
};

let resizeCanvas = () => {
    rs = document.getElementById("remoteStream")
    let width = rs.offsetWidth;
    let height = rs.offsetHeight;
    let left = rs.offsetLeft;
    let right = rs.offsetRight;
    let cv = document.getElementById("remoteCanvas");
    cv.height = height;
    cv.width = width;
    cv.style.left = left;
    cv.style.right = right;
}

let sendAnimation = (type, isCancellation) => {
    let anim_data = {'type':'animation',
		     'animation' : {
			 type : type,
			 isCancellation : isCancellation}};
    
    sendData(anim_data);
};

let sendRemoteThumbnail = (dataurl) => {
    let anim_data = {'type':'animation',
		     'animation' : {
			 remoteThumbnailData : dataurl}};
    sendData(anim_data);
}

// Animation
let remoteCanvas = document.getElementById('remoteCanvas');
let remoteContext = remoteCanvas.getContext('2d');

let remoteThumbnailCanvas = document.getElementById('remoteThumbnailCanvas');
let remoteThumbnailContext = remoteThumbnailCanvas.getContext('2d');

let localCanvas = document.getElementById("localCanvas");
let localContext = localCanvas.getContext('2d');

var animationPlaybackStates = {
    'balloons' : {
	isPlaying : false,
	instances : [],
	_timeStamp : 0,
	_balloonIndex : 0
    },
    lastThumbUpdateTimeStamp : 0
};

let animationCancel = (type) => {
    animationPlaybackStates['balloons'].instances = [];
    animationPlaybackStates[type].isPlaying = false;
};

let animationBalloonsPlay = () => {
    let newInstance = {}
    let color = 'hsl(240, ' + Math.floor(Math.random() * 100) + '%, ' + Math.floor(Math.random() * 100) + '%)';    
    animationPlaybackStates['balloons']._balloonIndex += 1;
    newInstance.xAxis = Math.random() * remoteCanvas.width;
    newInstance.opacity = Math.random();
    newInstance.radius = 50 + 40 * Math.random();
    newInstance.offsetSine = Math.random() * 0.5 * Math.PI;
    newInstance.x = newInstance.xAxis
    newInstance.y = remoteCanvas.height;
    newInstance.color = color;
    newInstance.idx = animationPlaybackStates['balloons']._balloonIndex;
    animationPlaybackStates['balloons'].instances.push(newInstance);
    if (!animationPlaybackStates['balloons'].isPlaying) {
	animationPlaybackStates['balloons'].isPlaying = true;
	window.requestAnimationFrame(animationBalloonsPlayFrame);
    }
};

let animationBalloonsPlayFrame = (timeStamp) => {
    let randomColor = '#0099b0';
    let remainingBalloons = [];
    let oldTs = animationPlaybackStates['balloons']._timeStamp;
    if (timeStamp - oldTs > 50) {
	remoteContext.clearRect(0, 0, remoteCanvas.width, remoteCanvas.height);
	localContext.clearRect(0, 0, localCanvas.width, localCanvas.height);
	remoteThumbnailContext.clearRect(0, 0, remoteThumbnailCanvas.width, remoteThumbnailCanvas.height);
	animationPlaybackStates['balloons']._timeStamp = timeStamp;
	animationPlaybackStates['balloons'].instances.forEach(
	    function (balloon, index) {
		var newY = balloon.y - 2;
		var newX = balloon.xAxis + Math.sin(
		    newY/100 + balloon.offsetSine) * remoteCanvas.width/2/8;
		remoteContext.save();
		remoteContext.globalAlpha = balloon.opacity;
		remoteContext.beginPath();
		remoteContext.arc(newX,
			    newY,
			    balloon.radius, 0, 2 * Math.PI, false);
		remoteContext.fillStyle = balloon.color;
		remoteContext.fill();
		remoteContext.linewidth = 1;
		remoteContext.strokeStyle = balloon.color;
		remoteContext.closePath();
		remoteContext.stroke();
		remoteContext.restore();
		balloon.x = newX;
		balloon.y = newY;
		if (balloon.y + balloon.radius > 0) {
		    remainingBalloons.push(balloon);
		}

	    });
	animationPlaybackStates['balloons'].instances = remainingBalloons;
	remoteThumbnailContext.drawImage(remoteCanvas, 0, 0, remoteCanvas.width, remoteCanvas.height, 0, 0, remoteThumbnailCanvas.width, remoteThumbnailCanvas.height);
	if (timeStamp - animationPlaybackStates['lastThumbUpdateTimeStamp'] > 500) {
	    let thumbData = remoteThumbnailCanvas.toDataURL('png');
	    sendRemoteThumbnail(thumbData);
	    animationPlaybackStates['lastThumbUpdateTimeStamp'] = timeStamp;
	}
    }
    if (animationPlaybackStates['balloons'].instances.length == 0 ) {
	animationCancel('balloons');
    }
    if (animationPlaybackStates['balloons'].isPlaying) {
	window.requestAnimationFrame(animationBalloonsPlayFrame);
    } else {
	remoteContext.clearRect(0, 0, remoteCanvas.width, remoteCanvas.height);
	remoteThumbnailContext.clearRect(0, 0, remoteThumbnailCanvas.width, remoteThumbnailCanvas.height);
	// do cleanup.
    }
};

// Start connection
getLocalStream();
document.getElementById("remoteStream").onplay = resizeCanvas;
document.getElementById("balloonButtonStart").onclick = function(){sendAnimation("balloons", false);};
document.getElementById("balloonButtonStop").onclick = function(){sendAnimation("balloons", true);};
