var proxyquire = require('proxyquire').noCallThru()
    sinon = require('sinon'),
    expect = require('chai').expect;

describe('caching,', function () {

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
    _got = sinon.stub();
    _fs = {
      readFile: sinon.stub().callsArgWith(1, 'test error.'),
      createReadStream: sinon.stub(),
      createWriteStream: sinon.stub()
    };
    _unpack = {
      extract: sinon.stub().callsArgWith(3, null)
    };
    _directory = {
      create: sinon.stub().callsArgWith(1, null)
    }
    _logger = {
      log: sinon.stub()
    }
    _mocks = {
      'fs': _fs,
      'got': _got,
      './unpack': _unpack,
      './directory': _directory
    };
    cache = proxyquire('../lib/cache.js', _mocks);
  })

  describe('when chached file doesnt exist,', function () {

    it('should download desired file', function () {
      assert(false)
    })

  })

  describe('when cached file already exists,', function () {

    describe('and an expected hash is provided,', function () {

      it('should download if the hash doesnt match', function () {
        assert(false)
      })

      it('should extract if the hash does match', function () {
        assert(false)
      })

    })

    describe('and an expected hash is null,', function () {

      it('should download headers', function () {
        assert(false)
      })

      describe('and hash in headers matches', function () {
        it('should extract', function () {
          assert(false)
        })
      })
      describe('and hash in headers doesnt match', function () {
        it('should download', function () {
          assert(false)
        })
      })

    })

  })

})