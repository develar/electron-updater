var file = require('./file');
var util = require('util');

var win = null;
var logger = null;
var pendingUpdatePath = null;

function listen(_logger, _pendingUpdatePath) {
	logger = _logger;
	pendingUpdatePath = _pendingUpdatePath;
	process.on('uncaughtException', handle);
}

function handle(err) {
	if(err.code === 'EELEVATION') return;
	if(logger) {
		logger.error('The update failed for an unexected reason.');
		logger.error(util.inspect(err));
		if (err.stack) logger.error(err.stack);
	}
	if(!win) {
		try {
			var BrowserWindow = require('browser-window');
			win = new BrowserWindow({
				width: 800,
				height: 600,
				'auto-hide-menu-bar': true
			});
			win.on('closed', function () {
				process.exit(1);
			});
			win.loadUrl('file://' + __dirname + '/../error.html');
			win.webContents.on('did-finish-load', function() {
				win.webContents.send('error-info', util.inspect(err).replace('\n', '<br>'));
			});
			file.touch(pendingUpdatePath, 'ERROR', function (err) {
				if(err && logger) logger.error(err);
				else console.error(err);
			});
		} catch (err) {
			if (logger) logger.error(err);
			else console.error(err);
		}
	}
}

module.exports = {
	handle: handle,
	listen: listen
};
