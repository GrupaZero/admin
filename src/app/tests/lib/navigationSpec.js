describe('this is navigation test', function() {
    'use strict';

    /** @type Navigation navigation */
    var navigation = null;

    beforeEach(function() {
        navigation = require('../../src/lib/navigation')();
    });

    it('should import a navigation library', function() {
        expect(navigation).toBeDefined();
    });

    it('can add menu link', function() {
        navigation.add({title: 'test', action: 'test.action'});
        expect(navigation.getItems()).toEqual([{title: 'test', action: 'test.action'}]);
    });

    it('can add before specified element', function() {
        navigation.add({title: 'test', action: 'test.action'});
        navigation.addBefore('test', {title: 'before', action: 'before.action'});
        expect(navigation.getItems()[0]).toEqual({title: 'before', action: 'before.action'});
    });

    it('can add after specified element', function() {
        navigation.add({title: 'test', action: 'test.action'});
        navigation.add({title: 'test2', action: 'test2.action'});
        navigation.addAfter('test', {title: 'after', action: 'after.action'});
        expect(navigation.getItems()[1]).toEqual({title: 'after', action: 'after.action'});
    });

    it('can export to target menu', function() {
        navigation.add({title: 'test', action: 'test.action'});
        navigation.add({title: 'test2', action: 'test2.action'});
        var out = [];
        out.push({text: 'test', href: 'test.action'});
        out.push({text: 'test2', href: 'test2.action'});
        expect(navigation.exportToTargetMenu()).toEqual(out);
    });

    it('can export to action menu', function() {
        navigation.add({title: 'test', href: 'test.action'});
        navigation.add({title: 'test2', href: 'test2.action'});
        var out = [];
        out.push({title: 'test', action: 'test.action'});
        out.push({title: 'test2', action: 'test2.action'});
        expect(navigation.exportToActionMenu()).toEqual(out);
    });
});
