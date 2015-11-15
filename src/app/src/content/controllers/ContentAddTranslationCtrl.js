'use strict';

function ContentAddTranslationCtrl($scope, Utils, PreviousState, ContentRepository) {
    $scope.showTeaser = false;

    $scope.ckOptions = Utils.ckOptions;

    // default translations lang code
    $scope.newContentTranslation = {
        contentId: Utils.$stateParams.contentId,
        langCode: Utils.$stateParams.langCode
    };
    // contents POST action
    $scope.addnewContentTranslation = function addNewContent(newContentTranslation) {
        ContentRepository.newContentTranslation(Utils.$stateParams.contentId, newContentTranslation).then(function(response) {

            try {
                if (PreviousState.url.length > 0) {
                    // redirected back to the state we came from
                    Utils.$state.go(PreviousState.name, PreviousState.params, {reload: true});
                } else {
                    // otherwise go to content list
                    Utils.$state.go('content.list', {}, {reload: true});
                }
            } catch (exception) { // if PreviousState is not resolved we still want to go back to list
                Utils.$state.go('content.list', {}, {reload: true});
            }

        });
    };
}
ContentAddTranslationCtrl.$inject = ['$scope', 'Utils', 'PreviousState', 'ContentRepository'];
module.exports = ContentAddTranslationCtrl;
