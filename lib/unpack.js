var path = require('path'),
    fs = process.versions.electron ? require('original-fs') : require('fs'), // required to properly extract .asar files.
    util = require('util'),
    zlib = require('zlib'),
    unzip = require('unzip'),
    tar = require('tar-stream'),
    directory = require('./directory.js')

function extract(dir, res, type, strip, callback) {
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
        } else if (type == '.tgz') {
            var gunzip = zlib.createGunzip();
            var extract = tar.extract();
            extract.on('entry', function (header, stream, callback) {
                var error = null;
                function onerror(err) {
                    if (!error) {
                        callback(error = err);
                    }
                }
                stream.on('error', onerror);
                stream.on('end', function () {
                    if (!error) callback();
                });
                var name = path.posix.normalize(header.name)
                    .split('/')
                    .slice(strip)
                    .join(path.posix.sep);
                var outPath = path.join(dir, name)
                if(header.type === 'file') {
                    var outdir = path.dirname(outPath)
                    directory.create(outdir, function (err) {
                        if(err) return onerror(err);
                        var outFile = fs.createWriteStream(outPath, {mode: header.mode});
                        stream
                            .pipe(outFile)
                            .on('error', onerror);
                    });
                } else if(header.type === 'directory') {
                    directory.create(outPath, function (err) {
                        if(err) return onerror(err);
                        stream.resume()
                    })
                } else {
                    stream.resume() // unsupported type
                }
            })
            extract.on('error', function (err) {
                callback(err);
            })
            extract.on('finish', function () {
                callback()
            });

            // Go!
            res.pipe(gunzip).pipe(extract)
        } else {
            callback(new Error('Unsupported package type: ' + type))
        }
    })
}

module.exports = {
    extract: extract
}