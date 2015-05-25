var controller = require('../../../src/content/controllers/ContentAddCtrl');

describe('ContentAddCtrl', function() {
  var scope;
  var state;
  var stateParams = {type: 'dummy'};
  var listParent;
  var ContentRepository;
  var ctrl;

  beforeEach(function() {
    scope = {
      listLang: {code: 'en'}
    };
    ctrl = new controller(scope, state, stateParams, listParent, ContentRepository);
  });

  it('should set default content type', function() {
    expect(scope.contentType).toBe('dummy');
  });

  it('should set list parent if present', function() {
    expect(scope.newContent).toBeDefined();
  });
});
