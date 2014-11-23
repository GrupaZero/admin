angular.module('CoreFilters', [])
    .filter('langName', function() {
        'use strict';
        // Returns translatable string based on provided language code
        return function(langCode) {
            return 'LANG_NAME_' + angular.uppercase(langCode);
        };
    })
    .filter('activeTranslation', function() {
        'use strict';
        return function(translations, langCode, field) {
            var currentTranslation = _.filter(translations, function(translation) {
                return translation.lang == langCode;
            }).shift();
            if (currentTranslation.hasOwnProperty(field)) {
                return currentTranslation[field];
            } else {
                return null;
            }
        };
    });
