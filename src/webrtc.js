JSMpeg.Source.WebRTC = (function() { "use strict";

var WebRTCSource = function (url, options) {
    this.url = url;
    this.options = options;
    this.rtcPeerConnection = null;
    this.rtcDataChannel = null;
    this.streaming = true;

    this.callbacks = {connect: [], data: []};
    this.destination = null;

    this.reconnectInterval = options.reconnectInterval !== undefined
        ? options.reconnectInterval
        : 5;
    this.shouldAttemptReconnect = !!this.reconnectInterval;

    this.completed = false;
    this.established = false;
    this.progress = 0;

    this.reconnectTimeoutId = 0;

    this.onEstablishedCallback = options.onSourceEstablished;
    this.onCompletedCallback = options.onSourceCompleted; // Never used
};

WebRTCSource.prototype.connect = function(destination) {
    this.destination = destination;
};

WebRTCSource.prototype.destroy = function () {
    clearTimeout(this.reconnectTimeoutId);
    this.shouldAttemptReconnect = false;
    this.rtcDataChannel.close();
    this.rtcPeerConnection.close();
};

WebRTCSource.prototype.start = function() {
    this.shouldAttemptReconnect = !!this.reconnectInterval;
    this.progress = 0;
    this.established = false;

    // TODO INVESTIGATE WHY CHROME DOESN'T WORK WITHOUT ICE SERVER (WHICH WE DON'T USE)
    this.rtcPeerConnection = new RTCPeerConnection({
        iceServers: [{'urls': 'stun:stun.l.google.com:19302'},]
    });
    this.rtcDataChannel = this.rtcPeerConnection.createDataChannel("dataChannel");
    // CHROME SAYS IT DOESN'T SUPPORT BLOB SO WE CAN'T HAVE THIS COMMAND BUT PROGRAM STILL WORKS
    // this.rtcDataChannel.binaryType = 'blob';
    this.rtcDataChannel.onopen = this.onOpen.bind(this);
    this.rtcDataChannel.onmessage = this.onMessage.bind(this);
    this.rtcDataChannel.onclose = this.onClose.bind(this);
    this.rtcDataChannel.onerror = this.onClose.bind(this);

    this.negotiate();
};

WebRTCSource.prototype.negotiate = function() {
    var that = this;

    return this.rtcPeerConnection.createOffer()
        .then(function(offer) {
            return that.rtcPeerConnection.setLocalDescription(offer)
        })
        .then(function() {
            // wait for ICE gathering to complete
            return new Promise(function(resolve) {
                if (that.rtcPeerConnection.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    that.rtcPeerConnection.addEventListener("icegatheringstatechange", function onIcegatheringstatechange() {
                        if (that.rtcPeerConnection.iceGatheringState === 'complete') {
                            that.rtcPeerConnection.removeEventListener("icegatheringstatechange", onIcegatheringstatechange);
                            resolve();
                        }
                    })
                }
            });
        })
        .then(function() {
            return fetch(that.url, {
                body: JSON.stringify({
                    sdp: that.rtcPeerConnection.localDescription.sdp,
                    type: that.rtcPeerConnection.localDescription.type,
                    stream_type: "high",
                    stream_source: 'local'
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST',
            });
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(answer) {
            return that.rtcPeerConnection.setRemoteDescription(answer);
        })
        .catch(function(e) {
            console.error(e);
        });
};

WebRTCSource.prototype.write = function(buffer) {
};

WebRTCSource.prototype.resume = function(headroom) {
    // Nothing to do here
};

WebRTCSource.prototype.onOpen = function() {
    this.progress = 1;
};

WebRTCSource.prototype.onClose = function() {
  if (this.shouldAttemptReconnect) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = setTimeout(function(){
          this.start();
      }.bind(this), this.reconnectInterval*1000);
  }
};

WebRTCSource.prototype.established = function() {
    // Nothing to do here
};

WebRTCSource.prototype.completed = function() {
    // Nothing to do here
};

WebRTCSource.prototype.progress = function() {
    // Nothing to do here
};

WebRTCSource.prototype.onMessage = async function (evt) {
    var isFirstChunk = !this.established;
    this.established = true;

    if (isFirstChunk && this.onEstablishedCallback) {
        this.onEstablishedCallback(this);
    }

    if (this.destination) {
        this.destination.write(await new Response(evt.data).arrayBuffer());
    }
};

return WebRTCSource;

})();
