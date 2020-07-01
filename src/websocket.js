const { LoaderOptionsPlugin } = require("webpack");

JSMpeg.Source.WebSocket = (function () {
	"use strict";

	var WSSource = function (url, options) {
		this.url = url;
		this.options = options;
		this.socket = null;
		this.streaming = true;

		this.callbacks = { connect: [], data: [] };
		this.destination = null;

		this.reconnectInterval = options.reconnectInterval !== undefined
			? options.reconnectInterval
			: 5;
		this.shouldAttemptReconnect = !!this.reconnectInterval;

		this.completed = false;
		this.established = false;
		this.progress = 0;

		this.reconnectTimeoutId = 0;
		this.connectionTimeoutId = 0;

		this.connectionTimeoutInterval = options.connectionTimeoutInterval !== undefined
			? options.connectionTimeoutInterval
			: 5;

		this.onEstablishedCallback = options.onSourceEstablished;
		this.onCompletedCallback = options.onSourceCompleted; // Never used
		this.onClosedCallback = options.onClosedCallback;
		this.onErrorCallback = options.onErrorCallback;
	};

	WSSource.prototype.connect = function (destination) {
		this.destination = destination;
	};

	WSSource.prototype.destroy = function () {
		clearTimeout(this.reconnectTimeoutId);
		clearTimeout(this.connectionTimeoutId);
		this.shouldAttemptReconnect = false;
		this.socket.close();
	};

	WSSource.prototype.start = function () {
		this.progress = 0;
		this.established = false;

		this.socket = new WebSocket(this.url, this.options.protocols || null);
		this.socket.binaryType = 'arraybuffer';
		this.socket.onmessage = this.onMessage.bind(this);
		this.socket.onopen = this.onOpen.bind(this);
		this.socket.onerror = this.onError.bind(this);
		this.socket.onclose = this.onClose.bind(this);
	};

	WSSource.prototype.resume = function (secondsHeadroom) {
		// Nothing to do here
	};

	WSSource.prototype.onOpen = function () {
		this.progress = 1;
		this.connectionTimeout();
	};

	WSSource.prototype.onClose = function () {
		if (this.shouldAttemptReconnect) {
			// this.shouldAttemptReconnect = false;
			clearTimeout(this.reconnectTimeoutId);
			this.reconnectTimeoutId = setTimeout(function () {
				this.start();
			}.bind(this), this.reconnectInterval * 1000);
		} else if (this.onClosedCallback) {
			this.onClosedCallback(this);
		}
	};

	WSSource.prototype.onError = function () {
		if (this.shouldAttemptReconnect) {
			// this.shouldAttemptReconnect = false;
			clearTimeout(this.reconnectTimeoutId);
			this.reconnectTimeoutId = setTimeout(function () {
				this.start();
			}.bind(this), this.reconnectInterval * 1000);
		} else if (this.onErrorCallback) {
			this.onErrorCallback(this);
		}
	}

	WSSource.prototype.onMessage = function (ev) {
		var isFirstChunk = !this.established;
		this.established = true;
		this.shouldAttemptReconnect = true;
	
		this.connectionTimeout();

		if (isFirstChunk && this.onEstablishedCallback) {
			this.onEstablishedCallback(this);
		}

		if (this.destination) {
			this.destination.write(ev.data);
		}
	};

	WSSource.prototype.connectionTimeout = function () {
		clearTimeout(this.connectionTimeoutId);
		this.connectionTimeoutId = setTimeout(() => {
			if (this.onErrorCallback) {
			this.onErrorCallback();		
			}	
		}, this.connectionTimeoutInterval * 1000);
	}

	return WSSource;

})();

