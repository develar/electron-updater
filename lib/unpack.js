var path = require('path'),
    fs = process.versions.electron ? require('original-fs') : require('fs'), // required to properly extract .asar files.
    util = require('util'),
    zlib = require('zlib'),
    unzip = require('unzip'),
    tar = require('tar-stream'),
    directory = require('./directory.js')

function extract(dir, res, type, callback) {
    directory.create(dir, function (err) {
        if(err) return callback(err)
        if(type == '.zip') {
            res.pipe(unzip.Extract({ path: dir }))
                .on('error', function (error) {
                    callback(error)
                })
                .on('close', function () {
                    callback()
                })
        } else if(type == '.tgz') {
            var z = zlib.createGunzip();
            var e = tar.extract();
            e.on('entry', function (header, stream, cb) {
                stream.on('end', function () {
                    cb()
                })
                var name = header.name.split('/')
                if (name[0] === 'package')
                    name.shift()
                var joinedName = path.join.apply(path, name)
                var outPath = path.join(dir, joinedName)
                if(header.type === 'file') {
                    var outdir = path.dirname(outPath)
                    directory.create(outdir, function (err) {
                        if(err) return callback(err)
                        var outFile = fs.createWriteStream(outPath, {mode: header.mode})
                        stream.pipe(outFile)
                    });
                } else if(header.type === 'directory') {
                    directory.create(outPath, function (err) {
                        if(err) return callback(err)
                        stream.resume()
                    })
                } else {
                    // else unsupported type
                    stream.resume()
                }
            })
            e.on('error', function(err) {
                callback(err)
            })
            e.on('finish', function () {
                callback()
            });
            res.pipe(z).pipe(e)
        } else {
            callback(new Error('Unsupported package type: ' + type))
        }
    })
}

module.exports = {
    extract: extract
}