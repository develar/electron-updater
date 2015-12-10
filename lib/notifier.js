var util = require('util');
var EventEmitter = require('events').EventEmitter;
var timers = require('timers');

var notifyInterval = 1000 * 60 * 5; // 5 minutes

function Notifier(appDir, logger, check) {
	var that = this;
	this.appDir = appDir;
	this.logger = logger;
	this.checkFunction = function() {
		check(appDir, logger, function (err, result) {
			if (err) that.emit('error', err);
			else if (result) {
				that.emit('updateAvailable', result);
				that.end();
			}
		});
	}
	// Configure timer to check for app update...
	this.token = timers.setInterval(this.checkFunction, notifyInterval);
	// ..but check it immediately once
	this.checkFunction();
}

function end() {
	timers.clearInterval(this.token);
}

util.inherits(Notifier, EventEmitter);
Notifier.prototype.end = end;
module.exports = Notifier;