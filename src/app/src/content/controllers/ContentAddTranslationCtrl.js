'use strict';

function ContentAddTranslationCtrl($scope, $state, $stateParams, ContentRepository) {
    $scope.showTeaser = false;
    // default translations lang code
    $scope.newContentTranslation = {
        contentId: $stateParams.contentId,
        langCode: $scope.listLang.code
    };
    // contents POST action
    $scope.addnewContentTranslation = function addNewContent(newContentTranslation) {
        // TODO add to database
        //ContentRepository.newContentTranslation(newContentTranslation).then(function(response) {
        //    $state.go('content.list', {}, {reload: true});
        //});
    };
}
ContentAddTranslationCtrl.$inject = ['$scope', '$state', '$stateParams', 'ContentRepository'];
module.exports = ContentAddTranslationCtrl;
