var directory = require('./directory.js'),
  file = require('./file.js'),
  fs = process.versions.electron ? require('original-fs') : require('fs'),
  path = require('path'),
  util = require('util'),
  async = require('async'),
  os = require('os')

var blacklist = [
  'app'
]

function copyFile(sourceDir, destDir, name, callback) {
  var sourceFile = path.join(sourceDir, name)
  var destFile = path.join(destDir, name)
  fs.stat(sourceFile, function (err, sourceStat) {
    if(err) return callback(err);
    fs.stat(destFile, function (err, destStat) {
      if(sourceStat.isFile() && (err || !destStat || (sourceStat.mtime > destStat.mtime))) {
        file.copy(sourceFile, destFile, callback)
      } else if(sourceStat.isDirectory() && blacklist.indexOf(path.basename(sourceFile)) == -1) {
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

function copy(execPath, publisher, appName, logger, callback) {
  var execDir = path.join(path.dirname(execPath))
  var execName = path.basename(execPath)
  var appDir = execDir
  var appData = directory.appDir(publisher, appName)
  var electronVersion = process.versions.electron
  var updateDir = path.join(appData, 'updater', electronVersion)
  var updateExecPath = path.join(updateDir, execName)

  if(os.platform()==='darwin') {
    // On darwin, electron is in an app structure.
    // Copy the entire app structure under:
    // Electron.app/
    appDir = path.resolve(execDir, '..', '..')
    updateExecPath = path.join(updateDir, 'Contents', 'MacOS', execName)
  }

  logger.log('copy appDir: ' + appDir)
  logger.log('  updateDir: ' + updateDir)

  copyDir(appDir, updateDir, function (err) {
    if(err) return callback(err);
    callback(null, updateExecPath)
  })
}

module.exports = {
  copy: copy
}