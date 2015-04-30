
var npm = require('npm')
	util = require('util')
	fs = require('fs')
	async = require('async')
	semver = require('semver')

// read package.json
// on a timer...


function ElectronUpdater() {

}

function update(callback) {

}

function watch(callback) {

}

function checkDependency(name, callback) {
	var version = this.dependencies[name]
	console.log(`checking: ${name}@${version}`)
	npm.load(function () {
		npm.commands.outdated([name], true, function (err, results) {
			if(err) return callback(err)
			if(!results.length) return callback()
			var result = {
				location: results[0][0],
				package: results[0][1],
				current: results[0][2],
				wanted: results[0][3],
				latest: results[0][4],
				actual: results[0][5]
			}
			if(semver.lt(result.current, result.latest)) {
				console.log('outdated: ' + name)
				return callback(null, result)
			} else {
				return callback()
			}
		})
	})
}

function checkPlugin(name, callback) {
	console.log('plugin: ' + util.inspect(name))
	callback(null, this)
}

function checkDependencies(deps, callback) {
	switch(deps.kind) {
		case 'dependencies':
		case 'devDependencies':
			async.map(Object.getOwnPropertyNames(deps.dependencies), checkDependency.bind(deps), callback)
			break;
		case 'plugins':
			async.map(Object.getOwnPropertyNames(deps.dependencies), checkPlugin.bind(deps), callback)
			break;
		default:
			return callback(new Error('invalid dependency kind detected'))
	}
}

function defined(item) {
	return !!item
}

function check(callback) {
	this.list(function (err, deps) {
		if(err) return callback(err)
		async.map([
			{ kind: 'dependencies', dependencies: deps.dependencies },
			{ kind: 'devDependencies', dependencies: deps.devDependencies },
			{ kind: 'plugins', dependencies: deps.plugins }
		],
		checkDependencies,
		function (err, results) {
			if(err) return callback(err)
			var dependencies = results[0].filter(defined)
			var devDependencies = results[1].filter(defined)
			var plugins = results[2].filter(defined)
			callback(null, {
				dependencies: dependencies,
				devDependencies: devDependencies,
				plugins: plugins
			})
		})
	})
}

function list(callback) {
	fs.readFile('package.json', {encoding: 'utf8'}, function (err, data) {
		if (err) return callback(err)
		var package_json = JSON.parse(data)
		callback(null, {
			dependencies: package_json.dependencies || {},
			devDependencies: package_json.devDependencies || {},
			plugins: package_json.plugins || {}
		})
	})
}

ElectronUpdater.prototype.update = update
ElectronUpdater.prototype.watch = watch
ElectronUpdater.prototype.check = check
ElectronUpdater.prototype.list = list
module.exports = ElectronUpdater