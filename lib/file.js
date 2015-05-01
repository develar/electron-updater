var fs = require('fs')

function readJson(name, callback) {
	fs.readFile(name, {encoding: 'utf8'}, function (err, data) {
		if(err) return callback(err)
		var j = JSON.parse(data)
		callback(null, j)
	})
}

function writeJson(name, obj, callback) {
	var data = JSON.stringify(obj)
	fs.writeFile(name, data, {encoding: 'utf8'}, callback)
}

module.exports = {
	readJson: readJson,
	writeJson: writeJson
}