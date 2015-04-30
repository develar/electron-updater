var download = require('./download.js')
	semver = require('semver')


function checkDependency(name, callback) {
	var version = this.dependencies[name]
	var url = this.registry + '/' + name + '/' + this.tag
	var tag = this.tag
	download.getJson(url, function (err, data) {
		if(err) return callback(err)
		//console.log(name + ' latest: ' + data.version)
		//callback(null, data.version)

		var available = semver.clean(data.version)
		if(!semver.satisfies(available, version)) {
			console.log('!satisfied')
			callback(null, {
				name: name,
				tag: tag,
				current: version,
				available: data.version
			})
		} else {
			callback()
		}
	})
}

function checkPlugin(name, callback) {
	console.log('plugin: ' + util.inspect(name))
	callback(null)
}

function checkDependencies(item, callback) {
	switch(item.kind) {
		case 'dependencies':
			async.map(Object.getOwnPropertyNames(item.context.dependencies), checkDependency.bind(item.context), callback)
			break;
		case 'plugins':
			async.map(item.context.plugins, checkPlugin.bind(item.context), callback)
			break;
		default:
			return callback(new Error('invalid dependency kind detected'))
	}
}

module.exports = checkDependencies