var proxyquire = require('proxyquire').noCallThru()
  sinon = require('sinon'),
  expect = require('chai').expect

describe('commands', function () {

  var commands,
    _mocks

  beforeEach(function () {
    _mocks = {
    }
    commands = proxyquire('../lib/commands.js', _mocks)
  })

})