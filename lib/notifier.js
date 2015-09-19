var util = require('util');
var EventEmitter = require('events').EventEmitter;
var timers = require('timers');

var notifyInterval = 1000 * 60 * 5; // 5 minutes

function Notifier(appDir, logger, check) {
	var that = this;
	this.appDir = appDir;
	this.logger = logger;
	this.token = timers.setInterval(function () {
		check(appDir, logger, function (err, result) {
			if (err) that.emit('error', err);
			else if (result) {
				that.emit('updateAvailable', result);
				that.end();
			}
		});
	},
	notifyInterval);
}

function end() {
	timers.clearInterval(this.token);
}

util.inherits(Notifier, EventEmitter);
Notifier.prototype.end = end;
module.exports = Notifier;