'use strict';

function Translations($q, $translate, LangRepository, Utils) {
    //create deferred promise
    var deferred = $q.defer();
    var languages = {};

    //get languages
    LangRepository.list().then(function(response) {
        languages.langs = response;
        languages.currentLang = languages.listLang = response[0];
        // resolve thr promise
        deferred.resolve(languages);
    });

    return {
        /**
         * Function returns the object of languages
         *
         * @returns {object}
         */
        getTranslations: function() {
            return deferred.promise;
        },
        /**
         * Function sets the language of the translation for the angular-translate module
         *
         * @param lang object that will be used to translate
         */
        selectAdminLang: function(lang) {
            $translate.fallbackLanguage(['en_US']);
            $translate.use(lang.i18n);
        },
        /**
         * Redirect if user try to access non existing language
         * @param langCode
         */
        checkIfLanguageIsAvailable: function(langCode) {
            var available = [];
            console.log('test');
            if(languages==={}){
                angular.forEach(languages, function(v, k) {
                    available.push(v.code);
                });
                if(available.indexOf(langCode) === -1){
                    Utils.Notifications.addError('LANGUAGE_NOT_FOUND');
                    Utils.$state.go('home');
                }else{
                    console.log(langCode);
                    console.log(available);
                }
            }else{
                LangRepository.list().then(function(response) {
                    angular.forEach(LangRepository.clean(response), function(v, k) {
                        available.push(v.code);
                    });
                    if(available.indexOf(langCode) === -1){
                        Utils.Notifications.addError('LANGUAGE_NOT_FOUND');
                        Utils.$state.go('home');
                    }else{
                        console.log(available);
                        console.log(langCode);
                    }
                });
            }
        }
    };
}
Translations.$inject = ['$q', '$translate', 'LangRepository', 'Utils'];
module.exports = Translations;

