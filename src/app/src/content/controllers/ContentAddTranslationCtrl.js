'use strict';

function ContentAddTranslationCtrl($scope, $state, $stateParams, PreviousState, ContentRepository) {
    $scope.showTeaser = false;
    // default translations lang code
    $scope.newContentTranslation = {
        contentId: $stateParams.contentId,
        langCode: $stateParams.langCode
    };
    // contents POST action
    $scope.addnewContentTranslation = function addNewContent(newContentTranslation) {
        ContentRepository.newContentTranslation($stateParams.contentId, newContentTranslation).then(function(response) {
            if (PreviousState.url.length > 0) {
                // redirected back to the state we came from
                $state.go(PreviousState.name, PreviousState.params, {reload: true});
            } else {
                // otherwise go to content list
                $state.go('content.list', {}, {reload: true});
            }
        });
    };
}
ContentAddTranslationCtrl.$inject = ['$scope', '$state', '$stateParams', 'PreviousState', 'ContentRepository'];
module.exports = ContentAddTranslationCtrl;
