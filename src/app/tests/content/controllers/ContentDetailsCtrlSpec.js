var controller = require('../../../src/content/controllers/ContentDetailsCtrl');

describe('ContentDetailsCtrl', function() {
    var scope;
    var langCode = 'en';
    var content;
    var ContentRepository;
    var Notifications;
    var ctrl;

    beforeEach(function() {
        scope = {};
        ctrl = new controller(scope, content, langCode, ContentRepository, Notifications);
    });

    it('should set lang code', function() {
        expect(scope.langCode).toBe('en');
    });

    it('could save content', function() {
        expect(scope.saveContent).toBeDefined();
    });
});
