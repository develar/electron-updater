var download = require('./download.js')
	semver = require('semver')

function satisfy(registry, name, tag, version, callback) {
	var url = registry + '/' + name + '/' + tag
	download.getJson(url, function (err, data) {
		if(err) return callback(err)
		var available = semver.clean(data.version)
		if(!semver.satisfies(available, version)) {
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

function checkDependency(name, callback) {
	var registry = this.registry
	var tag = this.tag
	var version = this.dependencies[name]
	satisfy(registry, name, tag, version, callback)
}

function checkPlugin(name, callback) {
	var registry = this.registry
	var tag = this.tag
	var version = this.plugins[name]
	satisfy(registry, name, tag, version, callback)
}

function checkDependencies(item, callback) {
	switch(item.kind) {
		case 'dependencies':
			async.map(Object.getOwnPropertyNames(item.context.dependencies), checkDependency.bind(item.context), callback)
			break;
		case 'plugins':
			async.map(Object.getOwnPropertyNames(item.context.plugins), checkPlugin.bind(item.context), callback)
			break;
		default:
			return callback(new Error('invalid dependency kind detected'))
	}
}

module.exports = checkDependencies