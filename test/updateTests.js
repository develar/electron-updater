var expect = require('chai').expect
    should = require('chai').should()
    sinon = require('sinon')
    proxyquire = require('proxyquire').noCallThru()
    path = require('path')

describe('update', function () {

  var update,
    _mocks,
    _deps,
    _download

  beforeEach(function () {
    _deps = {
        context: { 
            appDir: '/test'
        },
        dependencies: [],
        plugins: []
    }
    _download = {
        getJson: sinon.stub()
    }
    _mocks = {
        './download.js': _download
    }
    update = proxyquire('../lib/update.js', _mocks)

    _download.getJson.callsArgWith(1, null, { dist: { tarball: 'http://test.com/update.tgz' } })
  })

  it('should update dependencies')
  it('should update dependencies recursively')
  it('should update plugins')

  describe('app', function () {    
    describe('in dev environment', function () {
        it('should not update the app')
    })
    it('should not update the app if its not out of date')
    it('should update the app')
  })

  describe('dependencies', function () {
    beforeEach(function () {
        _deps.dependencies.push({ name: 'test', available: '1.0.1' })
    })
    describe('in dev environment', function () {
        beforeEach(function () {
            _deps.context.dev = true
        })
        it('should not update dependencies', function (done) {
            update.update(_deps, function (err) {
                expect(_download.getJson.called).to.be.false
                done(err)
            })
        })
    })
    it('should update dependencies', function (done) {
        update.update(_deps, function (err) {
            expect(_download.getJson.called).to.be.false
            done(err)
        })        
    })
  })

  describe('plugins', function () {
    describe('in dev environment', function () {
        it('should update plugins')
    })
    it('should update plugins')
  })
})