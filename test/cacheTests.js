var proxyquire = require('proxyquire').noCallThru()
    sinon = require('sinon'),
    expect = require('chai').expect,
    stream = require('./mockStream');

describe('caching,', function () {
  var url = 'http://example.com/test';
  var cache,
    _got,
    _fs,
    _unpack,
    _directory,
    _logger,
    _mocks,
    _context;

  beforeEach(function () {
    _context = {
      name: 'test-app',
      publisher: 'Testers'
    };
    _got = {
      stream: sinon.stub().returns(new stream.MockResponseStream('test', 'test'))
    };
    _fs = {
      readFile: sinon.stub().callsArgWith(1, 'test error.'),
      createReadStream: sinon.stub().returns(new stream.MockReadable('test')),
      createWriteStream: sinon.stub().returns(new stream.MockWritable())
    };
    _unpack = {
      extract: sinon.stub().callsArgWith(3, null)
    };
    _directory = {
      create: sinon.stub().callsArgWith(1, null),
      appDir: sinon.stub().returns('/temp')
    };
    _logger = {
      log: sinon.stub(),
      error: sinon.stub()
    };
    _mocks = {
      'fs': _fs,
      'got': _got,
      './unpack': _unpack,
      './directory': _directory
    };
    cache = proxyquire('../lib/cache.js', _mocks);
  })

  describe('queuing requests', function () {

    it('should get different urls simultaneously', function () {

      cache.get('http://example.com/test', '/test', null, _context, _logger, function () { });
      cache.get('http://example.com/test2', '/test', null, _context, _logger, function () { });

      expect(_fs.readFile.calledTwice).to.be.true;
    })

    it('should not get the same url simultaneously', function () {

      cache.get(url, '/test', null, _context, _logger, function () { });
      cache.get(url, '/test', null, _context, _logger, function () { });

      expect(_fs.readFile.calledOnce).to.be.true;
    })
    
    it('should process all queued requests in order', function (done) {

      _fs.readFile.callsArgWith(1, null, 'test');
      _got.stream.returns(new stream.MockResponseStream('test', ''));  

      cache.get(url, '/test', null, _context, _logger, function (err) { 
        if(err) done(err);
        // should always finish first.
      });

      cache.get(url, '/test', null, _context, _logger, function (err) {
        expect(_unpack.extract.calledTwice).to.be.true;
        done(err);
      });
    })
  })

  describe('when chached file doesnt exist,', function () {
    it('should download desired file', function (done) {
      _fs.readFile.onSecondCall().callsArgWith(1, null, 'test');
      _got.stream.onSecondCall().returns(new stream.MockResponseStream('test', ''));
      cache.get(url, '/test', null, _context, _logger, function (err) {        
        expect(_got.stream.called).to.be.true
        done(err)
      })
    })
  })

  describe('when cached file already exists,', function () {

    describe('and an expected hash is provided,', function () {

      var expectedHash = 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'; // sha1('test')

      it('should download if the hash doesnt match', function () {
        // File contains bad content
        _fs.readFile.callsArgWith(1, null, 'test123');
        _got.stream.returns(new stream.MockResponseStream(null, 'test')); // file content should be test

        // After download, content is correct.
        _fs.readFile.onSecondCall().callsArgWith(1, null, 'test');

        cache.get(url, '/test', expectedHash, _context, _logger, function (err) {
          expect(_got.stream().readData).to.be.true;
          done(err)
        })
      })

      it('should extract if the hash matches', function (done) {
        // File contains correct data
        _fs.readFile.callsArgWith(1, null, 'test');
        cache.get(url, '/test', expectedHash, _context, _logger, function (err) {
          expect(_unpack.extract.called).to.be.true;
          done(err)
        })
      })
    })

    describe('and an expected hash is null,', function () {

      describe('and hash in headers matches', function () {

        beforeEach(function () {
            // local is good
            _fs.readFile.callsArgWith(1, null, 'test');
            _got.stream.returns(new stream.MockResponseStream('test', ''));          
        })

        it('should download headers only', function (done) {
            cache.get(url, '/test', null, _context, _logger, function (err) {
              expect(_got.stream().readData).to.be.false;
              done(err)
            })
        })

        it('should extract', function (done) {
          cache.get(url, '/test', null, _context, _logger, function (err) {
            expect(_unpack.extract.called).to.be.true;
            done(err)
          })
        })
      })

      describe('and hash in headers doesnt match', function () {
        it('should download', function (done) {
          // local file is bad 
          _fs.readFile.callsArgWith(1, null, 'test');
          _got.stream.returns(new stream.MockResponseStream('test123', '')); // file content should be test123

          // after download file should contain test123
          _fs.readFile.onSecondCall().callsArgWith(1, null, 'test123');
          _got.stream.onSecondCall().returns(new stream.MockResponseStream('test123', '')); // now they match

          cache.get(url, '/test', null, _context, _logger, function (err) {
            expect(_got.stream.called).to.be.true;
            done(err)
          })
        })
      })
    })
  })
})