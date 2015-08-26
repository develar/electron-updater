var got = require('got'),
	fs = process.versions.electron ? require('original-fs') : require('fs'),
	util = require('util'),
	path = require('path'),
	crypto = require('crypto'),
	unpack = require('./unpack'),
	directory = require('./directory');

// We want to process as many packages simultaneously as possible.
// But because its possible for the same package to be requested for multiple locations we have
// to be sure that we don't attempt to download and cache the same file simultaneously, which
// can lead to corruption.

// So instead we will queue unique requests. Each request for the same url will only
// be processed sequentially. 

// Each unique request for a url will go through the entire workflow alone before the next request is processed.

// The workflow psuedo-code looks like this:
// processNext:
//   if cachedFile.exists:
//     -> checkHash
//   else:
//     -> download
//
// checkHash:
//   if cachedFile.hash == expectedHash:
//     -> extract
//   else if: cachedFile.hash == response.headers.hash:
//     -> extract
//   else:
//     -> download
//
// download:
//   got(url).pipe(cachedFile)
//   -> checkCache
//
// extract:
//   unpack(dir, cachedFile)
//   -> processNext

var queue = {};

function md5(input) {
	var alg = crypto.createHash('md5')
	alg.update(input)
	return alg.digest('hex');
}

function shasum(input) {
	var alg = crypto.createHash('sha1');
	alg.update(input)
	return alg.digest('hex');
}

function processNext(url) {
	if(queue[url].length > 0) {
		var next = queue[url][0];
		checkCache(next);
	}
}

function checkCache(next) {
	var appData = directory.appDir(next.context.publisher, next.context.name);
	var cacheDir = path.join(appData, 'cache');
	directory.create(cacheDir, function (err) {
		if(err) return next.callback(err);		
		next.cachePath = path.join(cacheDir, md5(next.url));
		fs.readFile(next.cachePath, function (err, data) {
			next.cacheContents = data;
			if(err) {
				// Cached file doesn't exist
				download(next);
			} else {
				// Cached file exists, check has to make sure its not corrupt
				checkHash(next);
			}
		});
	});
}

function checkHash(next) {
	if(next.expectedHash) {
		// npm provides the expected hash as a shasum
		var hash = shasum(next.cacheContents);
		if (hash == next.expectedHash) {
			// The cached file is valid, use it
			extract(next);
		} else {
			// The cached file is corrupt, redownload it.
			next.logger.log('redownloading cached file: ' + next.url);
			next.logger.log(util.inspect(queue));
			download(next);
		}
	} else {
		// amazon binaries provide an md5 hash in the headers.
		var hash = md5(next.cacheContents);
		var stream = got.stream(next.url);
		stream.on('error', function (err) {
			next.callback(err);
		});
		stream.on('response', function(response) {
			stream.end();
			if(response.headers.etag === `"${hash}"`) {
				// The cached file is valid, use it
				extract(next);
			} else {
				// The cached file is corrupt or the hash is not provided, redownload it.
				next.logger.log('redownloading cached file: ' + next.url);
				next.logger.log(util.inspect(response.headers));
				next.logger.log(util.inspect(queue));
				download(next);
			}
		})
	}
}

function download(next) {
	var fileStream = fs.createWriteStream(next.cachePath);
	var error = null;
	fileStream.on('error', function (err) {
		error = err;
		next.logger.error('error downloading:');
		next.logger.error(err);
	});
	fileStream.on('finish', function () {
		if(error) return next.callback(error);
		checkCache(next);
	});

	got.stream(next.url).pipe(fileStream);
}

function extract(next) {
	unpack.extract(next.dir, fs.createReadStream(next.cachePath), path.extname(next.url), next.strip, function (err) {
		next.callback(err);
		queue[next.url].shift();
		processNext(next.url);
	});
}

function get(url, dir, strip, expectedHash, context, logger, callback) {
	if(!queue[url]) queue[url] = [];

	queue[url].push({
		url: url, 
		dir:dir, 
		strip: strip,
		expectedHash: expectedHash, 
		context: context, 
		logger: logger, 
		callback: callback
	});

	if (queue[url].length == 1) processNext(url);
}

module.exports = {
	get: get
}