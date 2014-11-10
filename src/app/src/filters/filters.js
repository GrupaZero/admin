angular.module('filters', []).filter('langName', function() {
    'use strict';
    // Returns translatable string based on provided language code
    return function(langCode) {
        return 'LANG_NAME_' + angular.uppercase(langCode);
    };
}).filter('isActive', function() {
    'use strict';
    // Returns translatable string
    return function(isActive, button) {
        if (button) {
            return isActive ? 'HOLD_PUBLICATION' : 'PUBLISH';
        }
        return isActive ? 'PUBLISHED' : 'NOT_PUBLISHED';
    };
});
