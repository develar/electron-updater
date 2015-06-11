var util = require('util'),
    got = require('got')

function get(url, callback) {
    return got(url, {encoding: null}, callback)
}

function getJson(url, callback) {
    return got(url, {json:true}, callback)
}

module.exports = {
    get: get,
    getJson: getJson
}