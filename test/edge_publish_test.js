'use strict';

var grunt = require('grunt');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.edge_publish = {
  setUp: function(done) {
    // setup here if necessary
    done();
  },
  /*default_options: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/default_options');
    var expected = grunt.file.read('test/expected/default_options');
    test.equal(actual, expected, 'should describe what the default behavior is.');

    test.done();
  },
  custom_options: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/custom_options');
    var expected = grunt.file.read('test/expected/custom_options');
    test.equal(actual, expected, 'should describe what the custom option(s) behavior is.');

    test.done();
  },*/
  edge_parser: function(test){
    test.expect(3);
    var EdgeParser = require('../lib/edge_parser');
    var parser = new EdgeParser();
    test.doesNotThrow(function(){ parser.parse('AdobeEdge.loadComposition("all", "EDGE-9362843", {scaleToFit: "none", centerStage: "none", minW: "0px", maxW: "undefined", width: "550px", height: "400px"}, {dom: [ ]}, {dom: [ ]});')}, "EdgeParser.parse should not throw here");
    test.ok(Array.isArray(parser.compositions), "parser.compositions is an array");
    test.equal(parser.compositions[0], 'EDGE-9362843', "parser.compositions[0] == 'EDGE-9362843'");
    test.done();
  }
};
