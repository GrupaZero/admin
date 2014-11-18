angular.module('CoreFilters', []).filter('langName', function() {
    'use strict';
    // Returns translatable string based on provided language code
    return function(langCode) {
        return 'LANG_NAME_' + angular.uppercase(langCode);
    };
});
