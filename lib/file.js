var fs = process.versions.electron ? require('original-fs') : require('fs'),
	path = require('path'),
	directory = require('./directory.js')

function readJson(name, callback) {
	fs.readFile(name, {encoding: 'utf8'}, function (err, data) {
		if(err) return callback(err)
		var parsed = null
		try {
			parsed = JSON.parse(data)
		} catch (e) {
			err = e
		}
		
		callback(err, parsed)
	})
}

function writeJson(name, obj, callback) {
	var data = JSON.stringify(obj)
	var dir = path.dirname(name)
	directory.create(dir, function (err) {
		if(err) return callback(err)
		fs.writeFile(name, data, {encoding: 'utf8'}, callback)	
	})
}

function touch(name, contents, callback) {
	if(typeof contents === 'function') {
		callback = contents
		contents = undefined
	}

	var dir = path.dirname(name)
	directory.create(dir, function (err) {
		if(err) return callback(err)
		fs.writeFile(name, contents || '', {encoding:'utf8'}, callback)
	})
}

function copy(source, dest, callback) {
	fs.stat(source, function (err, stat) {
		if(err) return callback(err);
		var sourceStream = fs.createReadStream(source)
		var destStream = fs.createWriteStream(dest, {mode:stat.mode})
		sourceStream
			.pipe(destStream)
			.on('finish', callback)
	})
}

module.exports = {
	readJson: readJson,
	writeJson: writeJson,
	touch: touch,
	copy: copy
}