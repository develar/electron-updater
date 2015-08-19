
var fs = process.versions.electron ? require('original-fs') : require('fs'),
    path = require('path'),
    async = require('async'),
    os = require('os'),
    AppDirectory = require('appdirectory')



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
  if (!parent || parent === directory) return callback()          // root, skip
  create(parent, function (error) {                               // create parent dir
    if (error && error.code !== 'EEXIST') return callback(error)  // failed unexpectedly, exit
    fs.mkdir(directory, function (error) {                        // create the directory
      if(error && error.code !== 'EEXIST') return callback(error)
      callback()
    })
  })
}

function appDir(publisher, appName) {
  var dirs = new AppDirectory({
    appName: appName,
    appAuthor: publisher
  })
  return dirs.userData()
}

module.exports = {
	create: create,
  remove: remove,
  appDir: appDir
}