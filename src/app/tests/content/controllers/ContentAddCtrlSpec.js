var controller = require('../../../src/content/controllers/ContentAddCtrl');

describe('ContentAddCtrl', function() {
    var scope;
    var listParent;
    var ContentRepository;
    var ctrl;
    var Utils = {
        $stateParams: {
            type: 'dummy'
        }
    };

    beforeEach(function() {
        scope = {
            listLang: {code: 'en'}
        };
        ctrl = new controller(scope, Utils, listParent, ContentRepository);
    });

    it('should set default content type', function() {
        expect(scope.contentType).toBe('dummy');
    });

    it('should set list parent if present', function() {
        expect(scope.newContent).toBeDefined();
        expect(scope.newContent.type).toBe('dummy');
    });

    it('could create new content', function() {
        expect(scope.addNewContent).toBeDefined();
    });
});
