var expect = require('chai').expect
    should = require('chai').should()
    sinon = require('sinon')
    proxyquire = require('proxyquire').noCallThru()
    path = require('path')

describe('update', function () {
    var update,
        _mocks,
        _deps,
        _got,
        _res,
        _unpack,
        _file,
        _directory,
        _logger

    beforeEach(function () {
        _deps = {
            context: { 
                name: 'test',
                appDir: '/test'
            },
            dependencies: [],
            plugins: []
        }
        _res = { on: sinon.stub() }
        _got = sinon.stub().returns(_res)
        _unpack = {
            extract: sinon.stub()
        }
        _file = {
            readJson: sinon.stub(),
            writeJson: sinon.stub()
        }
        _directory = {
            create: sinon.stub(),
            remove: sinon.stub(),
            appDir: sinon.stub().returns('/test')
        }
        _logger = {
            log: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            debug: sinon.stub()
        }
        _mocks = {
            'got': _got,
            './unpack.js': _unpack,
            './file.js': _file,
            './directory.js': _directory,
            './logger.js': _logger
        }
        update = proxyquire('../lib/update.js', _mocks)

        _got.withArgs(sinon.match.string, {json:true}).callsArgWith(2, null, { versions: { '1.0.0': {}, '1.0.1': {} }, dist: { tarball: 'http://test.com/update.tgz' } })
        _unpack.extract.callsArgWith(2, null)
        _file.readJson.callsArgWith(1, null, { dependencies: {} })
        _file.writeJson.callsArgWith(2, null)
        _directory.create.callsArgWith(1, null)
        _directory.remove.callsArgWith(1, null)
    })

    describe('app', function () {    
        describe('update available', function () {
            beforeEach(function () {
                _deps.app = { name: 'test', available: '1.0.1' }
            })
            describe('in dev environment', function () {
                beforeEach(function () {
                    _deps.context.dev = true
                })
                it('should not update the app', function (done) {
                    update.update(_deps, _logger, function (err) {
                        expect(_got.called).to.be.false
                        done(err)
                    })
                })
            })
            it('should update the app', function (done) {
                update.update(_deps, _logger, function (err) {
                    expect(_got.called).to.be.true
                    expect(_unpack.extract.called).to.be.true
                    done(err)
                })
            })
            it('should download binaries', function (done) {
                var pkg = { binaries: ['http://example.com/test.tgz'] }
                _file.readJson.onFirstCall().callsArgWith(1, null, pkg)
                update.update(_deps, _logger, function (err) {
                    expect(_got.withArgs('http://example.com/test.tgz').called).to.be.true
                    done(err)
                })
            })
        })
        describe('update not available', function () {
            it('should not update the app if its not out of date', function (done) {
                update.update(_deps, _logger, function (err) {
                    expect(_got.called).to.be.false
                    done(err)
                })        
            })        
        })
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
                update.update(_deps, _logger, function (err) {
                    expect(_got.called).to.be.false
                    done(err)
                })
            })
        })
        it('should update dependencies', function (done) {
            update.update(_deps, _logger, function (err) {
                expect(_got.called).to.be.true
                expect(_unpack.extract.called).to.be.true
                done(err)
            })        
        })
        it('should download binaries', function (done) {
            var pkg = { binaries: ['http://example.com/test.tgz'] }
            _file.readJson.onFirstCall().callsArgWith(1, null, pkg)
            update.update(_deps, _logger, function (err) {
                expect(_got.withArgs('http://example.com/test.tgz').called).to.be.true
                done(err)
            })
        })
        describe('with sub-dependencies', function () {
            beforeEach(function () {
                var pkg = { dependencies: { testSub: '^1.0.0' } }
                _file.readJson.onFirstCall().callsArgWith(1, null, pkg)
                _file.readJson.onSecondCall().callsArgWith(1, null, pkg)
            })
            it('should get sub dependencies', function (done) {            
                update.update(_deps, _logger, function (err) {
                    expect(_got.callCount).to.equal(5)
                    done(err)
                })
            })
            it('should extract sub dependencies', function (done) {            
                update.update(_deps, _logger, function (err) {
                    expect(_unpack.extract.calledTwice).to.be.true
                    done(err)
                })
            })
        })
    })

    describe('plugins', function () {
        beforeEach(function () {
            _deps.plugins.push({ name: 'test', available: '1.0.1' })
        })
        describe('in dev environment', function () {
            it('should update plugins', function (done) {
                update.update(_deps, _logger, function (err) {
                    expect(_got.called).to.be.true
                    expect(_unpack.extract.called).to.be.true
                    done(err)
                })
            })
        })    
        describe('with sub-dependencies', function () {
            beforeEach(function () {
                var pkg = { dependencies: { testSub: '^1.0.0' } }
                _file.readJson.onFirstCall().callsArgWith(1, null, pkg)
                _file.readJson.onSecondCall().callsArgWith(1, null, pkg)
            })
            it('should get sub dependencies', function (done) {            
                update.update(_deps, _logger, function (err) {
                    expect(_got.callCount).to.equal(5)
                    done(err)
                })
            })
            it('should extract sub dependencies', function (done) {            
                update.update(_deps, _logger, function (err) {
                    expect(_unpack.extract.calledTwice).to.be.true
                    done(err)
                })
            })
        })        
        it('should download binaries', function (done) {
            var pkg = { binaries: ['http://example.com/test.tgz'] }
            _file.readJson.onFirstCall().callsArgWith(1, null, pkg)
            update.update(_deps, _logger, function (err) {
                expect(_got.withArgs('http://example.com/test.tgz').called).to.be.true
                done(err)
            })
        })
        it('should update plugins', function (done) {
            update.update(_deps, _logger, function (err) {
                expect(_got.called).to.be.true
                expect(_unpack.extract.called).to.be.true
                done(err)
            })
        })
        it('should update the .current file', function (done) {
            update.update(_deps, _logger, function (err) {
                expect(_file.writeJson.called).to.be.true
                done(err)
            })
        })
    })
})