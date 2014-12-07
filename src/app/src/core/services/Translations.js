'use strict';

function Translations($translate) {
    return {
        selectAdminLang: function(lang) {
            $translate.fallbackLanguage(['en_US']);
            $translate.use(lang.i18n);
        }
    };
}
Translations.$inject = ['$translate'];
module.exports = Translations;

