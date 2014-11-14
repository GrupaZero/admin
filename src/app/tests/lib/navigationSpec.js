describe('this is navigation test', function () {
    'use strict';

    /** @type Navigation navigation */
    var navigation = null;

    beforeEach(function() {
        navigation = require('../../src/lib/navigation')();
    });

    it('should import a navigation library', function () {
        expect(navigation).toBeDefined();
    });

    it("can add menu link", function() {
        navigation.add({title: 'test'});
        expect(navigation.getItems()).toEqual([{title: 'test'}]);
    });

    it("can add before specified element", function() {
        navigation.add({title: 'test'});
        navigation.addBefore('test', {title: 'before'});
        expect(navigation.getItems()[0]).toEqual({title: 'before'});
    });

    it("can add after specified element", function() {
        navigation.add({title: 'test'});
        navigation.add({title: 'test2'});
        navigation.addAfter('test', {title: 'after'});
        expect(navigation.getItems()[1]).toEqual({title: 'after'});
    });
});
