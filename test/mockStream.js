var Readable = require('stream').Readable,
    Writable = require('stream').Writable,
    util = require('util'),
    sinon = require('sinon'),
    crypto = require('crypto');

function md5(input) {
  var alg = crypto.createHash('md5')
  alg.update(input)
  return alg.digest('hex');
}

function MockReadable(data) {
  Readable.call(this, {});
  this._data = data;
}

function MockWritable() {
  Writable.call(this, {});
  this._data = null;
}

function MockResponseStream(etag, data) {
  Readable.call(this, {});
  this._etag = etag ? md5(etag) : null;
  this._data = data;
  this.readData = false;

  this._on = this.on;
  this.on = _on;
}

function _read() {
  var buf = new Buffer(this._data, 'utf8');
  this.push(buf);
  this.push(null);
  this.readData = true;
}

function _write(chunk, encoding, callback) {
  this._data = chunk;
  callback();
}

function _on(type, callback) {
  if(type == 'response') {
    callback({
      headers: { etag: `"${this._etag}"` }
    })
  } else {
    this._on(type, callback);
  }
}


util.inherits(MockReadable, Readable);
MockReadable.prototype._read = _read;

util.inherits(MockWritable, Writable);
MockWritable.prototype._write = _write;

util.inherits(MockResponseStream, Readable);
MockResponseStream.prototype._read = _read;
MockResponseStream.prototype.end = sinon.stub();

module.exports = {
  MockReadable: MockReadable,
  MockWritable: MockWritable,
  MockResponseStream: MockResponseStream
};