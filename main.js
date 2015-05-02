
var updater = require('./index.js')
	app = require('app')

// When run in electron, update app at specified directory
var i = process.argv.indexOf('--electron-update')
var appDir = process.argv[i + 1]

//process.versions.electron [0.25.1]
//process.arch     			[ia32]
//process.platform 			[win32]
//process.argv				[path/to/electron.exe,arg1,arg2,...]
//process.execPath			[path/to/electron.exe]
//process.cwd()				[current working dir]
process.cwd(appDir)

app.on('ready', function () {
	
})
updater.update(function (err) {
	//todo: log errors
})