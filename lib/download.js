var util = require('util')
    http = require('http')
    https = require('https')

function get(url, callback) {
    var maxRedirect = 10;
    var redirects = 0;
    function _get(location) {
        (location.indexOf('https') === 0 ? https : http)
            .get(location, function (res) {
                if(res.statusCode > 300 && res.statusCode <= 308) {
                    // redirection
                    if (redirects > maxRedirect) {
                        callback(new Error('Too many redirects: ' + url ))
                    } else {
                        redirects++;
                        _get(res.headers.location);
                    }
                } else if(res.statusCode === 200) {
                    callback(null, res)
                } else {
                    function errorHandler(err, data) {
                        callback(new Error(util.inspect({ 
                            code: res.statusCode,
                            data: data,
                            url: url,
                            headers: res.headers 
                        })))
                    }
                    var message = ''
                    res.setEncoding('utf8')
                    res.on('data', function (data) {
                        message += data
                    })
                    res.on('end', function () {
                        return errorHandler(null, message)
                    })
                    res.on('error', errorHandler)
                }
            })
            .on('error', callback)
    }

    _get(url);
}

function getJson(url, callback) {
    get(url, function (err, res) {
        if(err) return callback(err)
        var json = ''
        res.setEncoding('utf8')
        res.on('data', function (data) {
            json += data
        })
        res.on('end', function () {
            var obj = JSON.parse(json)
            return callback(null, obj)
        })
        res.on('error', callback)
    })
}

module.exports = {
    get: get,
    getJson: getJson
}