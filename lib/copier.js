var directory = require('./directory.js'),
  file = require('./file.js'),
  fs = process.versions.electron ? require('original-fs') : require('fs'),
  path = require('path'),
  util = require('util'),
  AppDirectory = require('appdirectory')

var whitelist = [
  'resources',
  'default_app',
  'locales'
]

function copyFile(sourceDir, destDir, name, callback) {
  var sourceFile = path.join(sourceDir, name)
  var destFile = path.join(destDir, name)
  fs.stat(sourceFile, function (err, sourceStat) {
    if(err) return callback(err);
    fs.stat(destFile, function (err, destStat) {
      if(sourceStat.isFile() && (err || !destStat || (sourceStat.mtime > destStat.mtime))) {
        file.copy(sourceFile, destFile, callback)
      } else if(sourceStat.isDirectory() && whitelist.indexOf(path.basename(sourceFile)) >= 0) {
        copyDir(sourceFile, destFile, callback)
      } else {
        callback()
      }
    })
  })
}

function copyDir(sourceDir, destDir, callback) {
  directory.create(destDir, function () {
    fs.readdir(sourceDir, function (err, files) {
      if(err) return callback(err);
      async.forEach(
        files,
        function (f, callback) {
          copyFile(sourceDir, destDir, f, callback)
        },
        callback)
    })
  })
}

function copy(execPath, appName, callback) {
  var execDir = path.join(path.dirname(execPath))
  var dirs = new AppDirectory(appName)
  var appData = path.dirname(dirs.userData())
  var electronVersion = process.versions.electron
  var updateDir = path.join(appData, 'updater', electronVersion)
  copyDir(execDir, updateDir, function (err) {
    if(err) return callback(err);
    callback(null, path.join(updateDir, path.basename(execPath)))
  })
}

module.exports = {
  copy: copy
}