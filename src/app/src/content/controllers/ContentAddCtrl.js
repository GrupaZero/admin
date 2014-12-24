'use strict';

function ContentAddCtrl($scope, $state, $stateParams, ContentRepository) {
    // contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        newContent.translations.langCode = $scope.listLang.code;
        newContent.type = $stateParams.type;
        ContentRepository.newContent(newContent).then(function(response) {
            $state.go('content.list', {contentId: response.id}, {reload: true});
        });
    };
}
ContentAddCtrl.$inject = ['$scope', '$state', '$stateParams', 'ContentRepository'];
module.exports = ContentAddCtrl;
