/** @type Navigation navigation */
var navigation = require('../../src/lib/navigation')();
describe('this is navigation test', function () {
    it('should import a navigation library', function () {
        expect(navigation).toBeDefined();
    });

    it("can add menu link", function() {
        navigation.add({test: 'test'});
        expect(navigation.getItems()).toEqual([{test: 'testx'}]);
    });
});
