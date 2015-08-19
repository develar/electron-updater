var expect = require('chai').expect,
    should = require('chai').should(),
    sinon = require('sinon'),
    proxyquire = require('proxyquire').noCallThru(),
    path = require('path')

describe('file', function () {

  var file,
    _mocks,
    _file,
    _directory,
    _fs,
    _item

  beforeEach(function () {
    _fs = {
      readFile: sinon.stub()
    }
    _directory = {
      create: sinon.stub().callsArg(1)
    }
    _mocks = {
      './directory.js': _directory,
      'fs': _fs,
      'original-fs': _fs
    }
    file = proxyquire('../lib/file.js', _mocks)
  })

  describe('readJson', function () {
    describe('when the file exists', function () {
      beforeEach(function () {
        _fs.readFile.callsArgWith(2, null, '{"test":true}')
      })
      it('should read the file', function (done) {
        file.readJson('test.txt', function (err, obj) {
          if(err) done(err)
          expect(obj.test).to.be.true
          done()
        })
      })
      it('should read it as utf8', function (done) {
        file.readJson('test.txt', function (err, obj) {
          if(err) done(err)
          expect(_fs.readFile.calledWith('test.txt', {encoding:'utf8'})).to.be.true
          done()
        })
      })
      it('should return the content of the file as an object', function (done) {
        file.readJson('test.txt', function (err, obj) {
          expect(obj).to.deep.equal({test:true})
          done()
        })
      })
      it('should fail if the contents are not json', function (done) {
        _fs.readFile.callsArgWith(2, null, "-*7@#42")
        file.readJson('test.txt', function (err, obj) {
          expect(err).to.be.ok
          done()
        })
      })
    })
    describe('when the file doesnt exist', function () {
      it('should return an error', function (done) {
        _fs.readFile.callsArgWith(2, {})
        file.readJson('test.txt', function (err, obj) {
          expect(err).to.be.ok
          done()
        })
      })
    })
  })

  describe('writeJson', function () {

    

  })

  describe('touch', function () {

  })

  describe('copy', function () {

  })

})