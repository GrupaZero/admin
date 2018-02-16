'use strict';

function Translations($q, $translate, LangRepository, Utils) {
    //create deferred promise
    var deferred = $q.defer();
    var languages = {};

    //get languages
    LangRepository.list().then(function(response) {
        languages.langs = LangRepository.clean(response);
        // resolve the promise
        deferred.resolve(languages);
    });

    return {
        /**
         * Function returns the language with isDefault flag set to true
         *
         * @returns {object}
         */
        getDefaultLang: function() {
            return _.find(languages.langs, 'is_default');
        },
        /**
         * Function returns the object of languages
         *
         * @returns {object}
         */
        getTranslations: function() {
            return deferred.promise;
        },
        /**
         * Function sets the fallback language of the translation for the angular-translate module
         *
         * @returns {object}
         */
        setFallbackLang: function() {
            $translate.fallbackLanguage([Utils.Config.fallbackLangCode]);
        },
        /**
         * Function sets the language of the translation for the angular-translate module
         *
         * @param lang object that will be used to translate
         */
        setLang: function(lang) {
            if (!_.isUndefined(lang)) {
                $translate.use(lang.code);
            }
        },
        /**
         * Redirect if user try to access non existing language
         * @param langCode
         */
        checkIfLanguageIsAvailable: function(langCode) {
            var available = [];
            if (languages === {}) {
                angular.forEach(languages, function(v, k) {
                    available.push(v.code);
                });
                if (available.indexOf(langCode) === -1) {
                    Utils.Notifications.addError('LANGUAGE_NOT_FOUND');
                    Utils.$state.go('home');
                }
            } else {
                LangRepository.list().then(function(response) {
                    angular.forEach(LangRepository.clean(response), function(v, k) {
                        available.push(v.code);
                    });
                    if (available.indexOf(langCode) === -1) {
                        Utils.Notifications.addError('LANGUAGE_NOT_FOUND');
                        Utils.$state.go('home');
                    }
                });
            }
        }
    };
}
Translations.$inject = ['$q', '$translate', 'LangRepository', 'Utils'];
module.exports = Translations;

