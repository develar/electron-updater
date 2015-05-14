
var fs = require('fs')
    path = require('path')
    async = require('async')
    os = require('os')

function create(directory, callback) {
  var parent = path.dirname(directory)
  if (!parent || parent === directory) return callback()          // root, skip
  create(parent, function (error) {                               // create parent dir
    if (error && error.code !== 'EEXIST') return callback(error)  // failed unexpectedly, exit
    fs.mkdir(directory, callback)                                 // create the directory
  })
}

module.exports = {
	create: create
}