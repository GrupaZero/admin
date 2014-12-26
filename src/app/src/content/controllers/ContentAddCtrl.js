'use strict';

function ContentAddCtrl($scope, $state, $stateParams, listParent, ContentRepository) {
    var parentId = null;
    // if parent category exists
    if (typeof listParent !== 'undefined') {
        $scope.listParent = listParent; // selected category
        parentId = listParent.id;
    }
    // contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        newContent.translations.langCode = $scope.listLang.code;
        newContent.type = $stateParams.type;
        newContent.parentId = parentId;
        ContentRepository.newContent(newContent).then(function(response) {
            $state.go('content.list', {contentId: response.id}, {reload: true});
        });
    };
}
ContentAddCtrl.$inject = ['$scope', '$state', '$stateParams', 'listParent', 'ContentRepository'];
module.exports = ContentAddCtrl;
