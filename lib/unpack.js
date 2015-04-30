var path = require('path'),
    fs = require('fs'),
    util = require('util'),
    zlib = require('zlib'),
    tar = require('tar-stream'),
    directory = require('./directory.js')

function extract(dir, res, callback) {
    console.log('creating dir: ' + dir)
    directory.create(dir, function (err) {
        if(err) return callback(err)
        var z = zlib.createGunzip();
        var e = tar.extract();
        e.on('entry', function (header, stream, cb) {
            stream.on('end', function () {
                cb()
            })
            var name = header.name.split('/');
            if (name[0] === 'package')
                name.shift();
            var joinedName = path.join.apply(path, name);
            var outPath = path.join(dir, joinedName);
            if(header.type === 'file') {
                console.log('Extracting: ' + joinedName);
                var outdir = path.dirname(outPath);
                directory.create(outdir, function (err) {
                    if(err) return callback(err)
                    var outFile = fs.createWriteStream(outPath);
                    stream.pipe(outFile);
                });
            } else if(header.type === 'directory') {
                directory.create(outPath, function (err) {
                    if(err) return callback(err)
                    stream.resume();
                });
            } else {
                console.log('  unexpected kind of file: ' + header.type);
            }
        });
        e.on('finish', function () {
            console.log('Extraction complete.')
            callback();
        });
        res.pipe(z).pipe(e);
    })
}

module.exports = {
    extract: extract
}