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

    // TODO: get registered tabs
    $scope.tabs = [
        {
            title: 'CONTENT',
            action: 'details',
            default: true // default active tab in settings edit mode
        },
        {
            title: 'HISTORY_OF_CHANGES',
            action: 'history'
        }
    ];

    // if lang code exists
    if (typeof langCode !== 'undefined') {
        $scope.langCode = langCode;
    }

    // if content exists
    if (typeof content !== 'undefined') {
        $scope.content = ContentRepository.clean(content);
    }

}
ContentDetailsEditCtrl.$inject = ['$scope', 'content', 'langCode', 'ContentRepository', 'Notifications'];
module.exports = ContentDetailsEditCtrl;
