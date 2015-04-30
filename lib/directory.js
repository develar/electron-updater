
var fs = require('fs')
    path = require('path')
    async = require('async')
    os = require('os')

function remove(directory, callback) {
	fs.lstat(directory, function (err, stat) {
		if(err) return callback(err)
		if(stat.isDirectory()) {
			fs.readdir(directory, function (err, files) {
				if(err) return callback(err)
				async.map(
					files, 
					function (f, c) {
						remove(path.join(directory, f), c)
					}, 
					function (err) {
						if(err) return callback(err)
						fs.rmdir(directory, callback)
					})
			})
		} else {
			fs.unlink(directory, callback)
		}
	})
}

function create(directory, callback) {
    var parent = path.dirname(directory)
    if (!parent || parent === directory) return callback()  // root, skip
    create(parent, function (error) {                       // create parent dir
        if (error) return callback(error)                   // couldn't create parent, exit
        fs.access(directory, function (error) {             // see if folder exists
            if (!error) return callback()                   // already exists, skip
            fs.mkdir(directory, callback)                   // create the directory
        })
    })
}

function appData() {
	switch(os.platform()) {
	    case 'win32':
	        return process.env.LOCALAPPDATA
	    case 'linux':
	        return path.join(process.env.HOME, '.config')
	    case 'darwin':
	        return path.join(process.env.HOME, 'Library', 'Application Support')
	    default:
	        return path.join('~', '.config')
	}
}

module.exports = {
	remove: remove,
	create: create,
	appData: appData
}