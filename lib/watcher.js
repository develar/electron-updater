var fs = process.versions.electron ? require('original-fs') : require('fs');

function watch(watchFile, callback) {
	fs.watchFile(watchFile, {persistent: true, interval:500}, function () {
		// Whenever the file contents change, read the contents and react.
		fs.readFile(watchFile, {encoding:'utf8'}, function (err, contents) {
			if (err) {
				// An unexpected error occurred reading the .update file.
				fs.unwatchFile(watchFile);
				return callback(err);
			}

			// File contents indicate updater status. When emptied updater is complete.
			// If it switches to error state, close up here silently.
			switch(contents) {
				case '':
					// When update is done the file will be changed to have empty content
					fs.unwatchFile(watchFile);
					return callback();
				case 'ERROR':
					fs.unwatchFile(watchFile)
					return callback({code:'EELEVATION'});
				default:
					break;
			}
		});
	});
}

module.exports.watch = watch;