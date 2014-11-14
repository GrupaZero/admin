/** @type Navigation navigation */
var navigation = require('../../src/lib/navigation')();
describe('this is navigation test', function () {
    'use strict';

    it('should import a navigation library', function () {
        expect(navigation).toBeDefined();
    });

    it("can add menu link", function() {
        navigation.add({title: 'test'});
        expect(navigation.getItems()).toEqual([{title: 'test'}]);
    });

    it("can add before specified element", function() {
        navigation.addBefore('test', {title: 'before'});
        expect(navigation.getItems()[0]).toEqual({title: 'before'});
    });

    it("can add after specified element", function() {
        navigation.add({title: 'test2'});
        navigation.addAfter('test', {title: 'after'});
        console.log(navigation.getItems());
        expect(navigation.getItems()[2]).toEqual({title: 'after'});
    });
});
