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

    it('can export to \'dropdown\' menu', function() {
        navigation.add({title: 'test', action: 'test.action'});
        navigation.add({title: 'test2', action: 'test2.action'});
        var out = [];
        out.push({text: 'test', action: 'test.action'});
        out.push({text: 'test2', action: 'test2.action'});
        expect(navigation.exportToDropdownMenu()).toEqual(out);
    });

    it('can add first child link', function() {
        navigation.add({title: 'test', action: 'test.action'});
        var out, child, first;
        out = [];
        child = {title: 'child', action: 'child.action'};
        first = {title: 'first.child', action: 'first.child.action'};
        out.push(first);
        out.push(child);
        navigation.addFirstChild('test', child);
        navigation.addFirstChild('test', first);
        expect(navigation.getItems()[0].children).toEqual(out);
    });

    it('can add last child link', function() {
        navigation.add({title: 'test', action: 'test.action'});
        var out = [],
            child = {title: 'child', action: 'child.action'},
            last = {title: 'last.child', action: 'last.child.action'};
        out.push(child);
        out.push(last);
        navigation.addLastChild('test', child);
        navigation.addLastChild('test', last);
        expect(navigation.getItems()[0].children).toEqual(out);
    });

    it('can add before child link', function() {
        navigation.add({title: 'test', action: 'test.action'});
        var out = [],
            child = {title: 'child', action: 'child.action'},
            child2 = {title: 'child2', action: 'child2.action'},
            before = {title: 'before', action: 'before.action'};
        out.push(child);
        out.push(before);
        out.push(child2);
        navigation.addLastChild('test', child);
        navigation.addLastChild('test', child2);
        navigation.addBeforeChild('test', 'child2', before);
        expect(navigation.getItems()[0].children).toEqual(out);
    });

    it('can add after child link', function() {
        navigation.add({title: 'test', action: 'test.action'});
        var out = [],
            child = {title: 'child', action: 'child.action'},
            child2 = {title: 'child2', action: 'child2.action'},
            after = {title: 'after', action: 'after.action'};
        out.push(child);
        out.push(after);
        out.push(child2);
        navigation.addLastChild('test', child);
        navigation.addLastChild('test', child2);
        navigation.addAfterChild('test', 'child', after);
        expect(navigation.getItems()[0].children).toEqual(out);
    });
});
