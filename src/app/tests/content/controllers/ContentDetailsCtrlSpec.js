var controller = require('../../../src/content/controllers/ContentDetailsCtrl');

describe('ContentDetailsCtrl', function() {
    var scope;
    var langCode = 'en';
    var content = {
        id: 1,
        path: [1]
    };
    var author = {};
    var ContentRepository = {
        clean: function() {
            return [];
        }
    };
    var ctrl;
    var Utils = {Config: {}};

    beforeEach(function() {
        scope = {};
        ctrl = new controller(scope, content, langCode, author, ContentRepository, Utils);
    });

    it('should set lang code', function() {
        expect(scope.langCode).toBe('en');
    });

    it('could save content', function() {
        expect(scope.saveContent).toBeDefined();
    });
});
