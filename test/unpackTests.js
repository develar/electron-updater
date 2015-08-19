var expect = require('chai').expect
    should = require('chai').should()
    sinon = require('sinon')
    proxyquire = require('proxyquire').noCallThru()
    path = require('path')

describe('unpack', function () {

  var unpack,
    _mocks,
    _directory,
    _zlib,
    _gunzip,
    _tar,
    _extract,
    _entry,
    _cb,
    _fs,
    _writeStream,
    _res

  beforeEach(function () {
    _directory = {
      create: sinon.stub().callsArgWith(1)
    }
    _gunzip = {
      pipe: sinon.stub().returnsArg(0)
    }
    _extract = {
      pipe: sinon.stub(),
      on: sinon.stub()
    }
    _cb = sinon.stub()
    _writeStream = sinon.stub()
    _entry = {
      pipe: sinon.stub(),
      resume: sinon.stub(),
      on: sinon.stub()
    }
    _res = {
      pipe: sinon.stub().returnsArg(0)
    }
    _zlib = {
      createGunzip: sinon.stub().returns(_gunzip)
    }
    _tar = {
      extract: sinon.stub().returns(_extract)
    }
    _fs = {
      createWriteStream: sinon.stub().returns(_writeStream)
    }
    _mocks = {
      './directory.js': _directory,
      'zlib': _zlib,
      'tar-stream': _tar,
      'fs': _fs,
      'original-fs': _fs
    }
    unpack = proxyquire('../lib/unpack.js', _mocks)
  })

  describe('extract', function () {
    it('should create the directory extracting to', function (done) {
      unpack.extract('/test', _res, '.tgz', function (err) {
        expect(_directory.create.withArgs('/test').called).to.be.true
        done()
      })
      _extract.on.withArgs('finish').callArg(1)
    })
    it('should gunzip', function (done) {
      unpack.extract('/test', _res, '.tgz', function (err) {
        expect(_res.pipe.withArgs(_gunzip).called).to.be.true
        done()
      })
      _extract.on.withArgs('finish').callArg(1)      
    })
    it('should tar extract', function (done) {
      unpack.extract('/test', _res, '.tgz', function (err) {
        expect(_gunzip.pipe.withArgs(_extract).called).to.be.true
        done()
      })
      _extract.on.withArgs('finish').callArg(1)
    })

    describe('entries', function () {

      it('should remove preceding "package" from entry path', function (done) {
        unpack.extract('/test', _res, '.tgz', function (err) {
          expect(_fs.createWriteStream.withArgs(path.join('/test', 'test.js')).called).to.be.true
          done()
        })
        _extract.on.withArgs('entry').callArgWith(1, {name: 'package/test.js', type: 'file'}, _entry, _cb)
        _extract.on.withArgs('finish').callArg(1)
      })

      describe('directories', function () {
        it('should create directory for directory entries', function (done) {
          unpack.extract('/test', _res, '.tgz', function (err) {
            expect(_directory.create.withArgs(path.join('/test', 'nested')).called).to.be.true
            done()
          })
          _extract.on.withArgs('entry').callArgWith(1, {name: 'package/nested', type: 'directory'}, _entry, _cb)
          _extract.on.withArgs('finish').callArg(1)
        })
        it('should resume the stream after directory creation', function (done) {
          unpack.extract('/test', _res, '.tgz', function (err) {
            expect(_entry.resume.called).to.be.true
            done()
          })
          _extract.on.withArgs('entry').callArgWith(1, {name: 'package/nested', type: 'directory'}, _entry, _cb)
          _extract.on.withArgs('finish').callArg(1)
        })
      })
      describe('files', function () {
        it('should create dir for entry', function (done) {
          unpack.extract('/test', _res, '.tgz', function (err) {
            expect(_directory.create.withArgs(path.join('/test', 'nested')).called).to.be.true
            done()
          })
          _extract.on.withArgs('entry').callArgWith(1, {name: 'package/nested/test.js', type: 'file'}, _entry, _cb)
          _extract.on.withArgs('finish').callArg(1)          
        })
        it('should pipe entry into fs write stream', function (done) {
          unpack.extract('/test', _res, '.tgz', function (err) {
            expect(_entry.pipe.withArgs(_writeStream).called).to.be.true
            done()
          })
          _extract.on.withArgs('entry').callArgWith(1, {name: 'package/test.js', type: 'file'}, _entry, _cb)
          _extract.on.withArgs('finish').callArg(1)          
        })
        it('should preserve the mode on the created file', function (done) {
          unpack.extract('/test', _res, '.tgz', function (err) {
            expect(_fs.createWriteStream.withArgs(sinon.match.string, {mode:'066'}).called).to.be.true
            done()
          })
          _extract.on.withArgs('entry').callArgWith(1, {name: 'package/test.js', type: 'file', mode: '066'}, _entry, _cb)
          _extract.on.withArgs('finish').callArg(1)
        })
      })
      describe('zip', function () {
        
      })
      describe('other', function () {
        it('should ignore other types of entries', function (done) {
          unpack.extract('/test', _res, '.tgz', function (err) {
            expect(_entry.resume.called).to.be.true
            done()
          })
          _extract.on.withArgs('entry').callArgWith(1, {name: 'package/test.lnk', type: 'link'}, _entry, _cb)
          _extract.on.withArgs('finish').callArg(1)          
        })
      })
    })
  })
})