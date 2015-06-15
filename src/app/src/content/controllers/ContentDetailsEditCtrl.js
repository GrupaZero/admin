'use strict';

function ContentDetailsEditCtrl($scope, content, langCode, ContentRepository, Notifications) {

    /**
     * Return object with specified lang property from objects array
     *
     * @param translations Translations array
     * @param langCode language code
     * @returns Object
     */
    function getTranslationByLang(translations, langCode) {
        var translation = translations.shift();

        if (translation.lang === langCode) {
            translation.langCode = translation.lang; // Couse we change name of this property in ContentTranslationTransformer
            return translation;
        } else {
            return getTranslationByLang(translations, langCode);
        }
    }

    /**
     * Currently active translation object
     *
     * @type Object
     */
    $scope.activeTranslation = getTranslationByLang(content.translations, langCode);

    /**
     * save current active translation as new active translation
     */
    $scope.saveTranslation = function() {
        ContentRepository.newContentTranslation(content.id, $scope.activeTranslation).then(function() {
            Notifications.addSuccess('SUCCESS');
        });
    };

}
ContentDetailsEditCtrl.$inject = ['$scope', 'content', 'langCode', 'ContentRepository', 'Notifications'];
module.exports = ContentDetailsEditCtrl;
