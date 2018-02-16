'use strict';

function ContentAddTranslationCtrl($scope, $translate, Utils, content, ContentRepository) {
    $scope.ckOptions = Utils.ckOptions;
    $scope.isLoaded = true; // form visibility

    // default translations lang code
    $scope.newContentTranslation = {
        content_id: Utils.$stateParams.contentId,
        language_code: Utils.$stateParams.langCode
    };

    // if parent category exists
    if (content.parent_id !== null) {
        $scope.isLoaded = false; // hide form
        // get parent category
        ContentRepository.one(content.parent_id).then(function(response) {
            var parent = ContentRepository.clean(response);
            // check for route translation in selected language
            var route = _.map(_.filter(parent.routes, {langCode: $scope.newContentTranslation.language_code}), 'path');
            if (!route.length) {
                // Redirect user to previous state or content list
                Utils.redirectBack('content.list');
                // "Before adding translations to this content, you need to translate the categories in which it is located!"
                Utils.Notifications.addInfo('NO_PARENT_TRANSLATION_ERROR', { contentType: $translate.instant(content.type.toUpperCase()).toLowerCase() });
            } else {
                // parent url is translated, show form
                $scope.isLoaded = true;
            }
        });
    }

    // contents POST action
    $scope.addNewContentTranslation = function() {
        ContentRepository.newContentTranslation(Utils.$stateParams.contentId, $scope.newContentTranslation).then(function(response) {
            // Redirect user to previous state or content list
            Utils.redirectBack('content.list');
        });
    };
}
ContentAddTranslationCtrl.$inject = ['$scope', '$translate', 'Utils', 'content', 'ContentRepository'];
module.exports = ContentAddTranslationCtrl;
