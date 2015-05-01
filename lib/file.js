var fs = require('fs')

function readJson(name, callback) {
	fs.readFile(name, {encoding: 'utf8'}, function (err, data) {
		if(err) return callback(err)
		var j = JSON.parse(data)
		callback(null, j)
	})
}

module.exports = {
	readJson: readJson
}