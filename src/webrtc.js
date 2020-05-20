JSMpeg.Source.WebRTC = (function() { "use strict";

var WebRTCSource = function (options) {
    this.options = options;
    this.rtcPeerConnection = options.rtcPeerConnection;
    this.rtcDataChannel = options.rtcDataChannel;
    this.streaming = true;

    this.callbacks = {connect: [], data: []};
    this.destination = null;

    this.reconnectInterval = options.reconnectInterval !== undefined
        ? options.reconnectInterval
        : 5;
    this.shouldAttemptReconnect = !!this.reconnectInterval;

    this.completed = false;
    this.established = true;
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
    this.rtcPeerConnection = null;
};

WebRTCSource.prototype.start = function() {
    this.shouldAttemptReconnect = !!this.reconnectInterval;
    this.progress = 0;
    this.established = false;

    // CHROME SAYS IT DOESN'T SUPPORT BLOB SO WE CAN'T HAVE THIS COMMAND BUT PROGRAM STILL WORKS
    // this.rtcDataChannel.binaryType = 'blob';
    this.rtcDataChannel.onopen = this.onOpen.bind(this);
    this.rtcDataChannel.onmessage = this.onMessage.bind(this);
    this.rtcDataChannel.onclose = this.onClose.bind(this);
    this.rtcDataChannel.onerror = this.onClose.bind(this);
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
