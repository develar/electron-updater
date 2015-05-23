var expect = require('chai').expect
    should = require('chai').should()
    sinon = require('sinon')
    proxyquire = require('proxyquire').noCallThru()
    path = require('path')

describe('download', function () {

  var download,
    _mocks,
    _https,
    _http,
    _res

  beforeEach(function () {
    _https = {
      get: sinon.stub(),
      on: sinon.stub()
    }
    _http = {
      get: sinon.stub(),
      on: sinon.stub()
    }
    _mocks = {
      'https': _https,
      'http' : _http
    }
    _res = {
      statusCode: 200,
      setEncoding: sinon.stub(),
      on: sinon.stub()
    }
    _https.get.callsArgWith(1, _res).returnsThis()
    _http.get.callsArgWith(1, _res).returnsThis()
    download = proxyquire('../lib/download.js', _mocks)
  })

  describe('with an https url', function () {
    it('should use https module to get resource', function (done) {
      download.get('https://test.com', function (err, res) {
        expect(err).to.be.null
        expect(_https.get.called).to.be.true
        done()
      })
    })
  })

  describe('with an http url', function () {
    it('should use http module to get resource', function (done) {
      download.get('http://test.com', function (err, res) {
        expect(err).to.be.null
        expect(_http.get.called).to.be.true
        done()
      })
    })

    ;[301, 302, 303, 304, 305, 306, 307, 308].forEach(function (code) {
      it('should redirect on code ' + code, function (done) {
        _res.statusCode = code
        _res.headers = { location: 'http://testredirect.com' }
        _http.get.onCall(0).callsArgWith(1, _res).returnsThis()
        _http.get.onCall(1).callsArgWith(1, {statusCode: 200}).returnsThis()
        download.get('http://test.com', function (err, res) {
          expect(err).to.be.null
          expect(_http.get.calledTwice).to.be.true
          done()
        })
      })
    })

    describe('when receiving an error code', function () {
      beforeEach(function () {
        _res.statusCode = 502
        _res.headers = {}
      })

      it('should fail on any other code', function (done) {
        download.get('http://test.com', function (err, res) {
          expect(err).to.not.be.null
          done()
        })
      })

      it('should have the status code', function (done) {
        download.get('http://test.com', function (err, res) {
          expect(err.code).to.equal(502)
          done()
        })
      })

      it('should have the url', function (done){
        download.get('http://test.com', function (err, res) {
          expect(err.url).to.equal('http://test.com')
          done()
        })
      })

      it('should have the response headers', function (done) {
        download.get('http://test.com', function (err, res) {
          expect(err.headers).to.not.be.null
          done()
        })
      })
    })

    describe('when getting json', function () {
      var _obj, _obj2
      beforeEach(function () {
        _obj = {data:'test'}
        _obj2 = {data:'test2'}
      })
      it('should get as utf8', function (done) {
        download.getJson('http://test.com', function (err, res) {
          expect(_res.setEncoding.withArgs('utf8').called).to.be.true
          done()
        })
        _res.on.withArgs('data').callArgWith(1, JSON.stringify(_obj))
        _res.on.withArgs('end').callArg(1)
      })
      it('should support multiple calls to on(data)', function (done) {
        download.getJson('http://test.com', function (err, res) {
          expect(res).to.deep.equal([_obj, _obj2])
          done()
        })
        _res.on.withArgs('data').callArgWith(1, '[')
        _res.on.withArgs('data').callArgWith(1, JSON.stringify(_obj))
        _res.on.withArgs('data').callArgWith(1, ',')
        _res.on.withArgs('data').callArgWith(1, JSON.stringify(_obj2))
        _res.on.withArgs('data').callArgWith(1, ']')
        _res.on.withArgs('end').callArg(1)
      })
      it('should parse data as json', function (done) {
        download.getJson('http://test.com', function (err, res) {
          expect(res).to.deep.equal(_obj)
          done()
        })
        _res.on.withArgs('data').callArgWith(1, JSON.stringify(_obj))
        _res.on.withArgs('end').callArg(1)
      })
    })
  })
})