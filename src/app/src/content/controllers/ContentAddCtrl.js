'use strict';

function ContentAddCtrl($scope, $state, $stateParams, ContentRepository) {
    // contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        newContent.langCode = $scope.listLang.code;
        newContent.type = $stateParams.type;
        newContent.isActive = 1;
        ContentRepository.newContent(newContent).then(function(response) {
            $state.go('content.list', {contentId: response.id}, {reload: true});
        });
    };
}
ContentAddCtrl.$inject = ['$scope', '$state', '$stateParams', 'ContentRepository'];
module.exports = ContentAddCtrl;
