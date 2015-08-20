/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ContentDetailsEditCtrl
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentDetailsEditCtrl($scope, Utils, content, langCode, ContentRepository) { //jshint ignore:line

    /**
     * Return translation with specified lang property from translations array
     * and fetch lang property
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
    $scope.activeTranslation = getTranslationByLang((content.translations.slice(0)), langCode);

    /**
     * save current active translation as new active translation
     * and go back to details show state
     */
    $scope.saveTranslation = function() {
        ContentRepository.newContentTranslation(content.id, $scope.activeTranslation).then(function() {
            Utils.$state.go('content.show.details', {
                contentId: content.id,
                langCode: langCode
            });
            Utils.Notifications.addSuccess('SUCCESS');
        });
    };

}
ContentDetailsEditCtrl.$inject = ['$scope', 'Utils', 'content', 'langCode', 'ContentRepository'];
module.exports = ContentDetailsEditCtrl;
