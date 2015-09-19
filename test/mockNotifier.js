var util = require('util');
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;

function MockNotifier(appDir, logger) {
  this.appDir = appDir
  this.logger = logger
}

util.inherits(MockNotifier, EventEmitter);
MockNotifier.prototype.end = sinon.stub();
module.exports = MockNotifier;