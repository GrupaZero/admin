'use strict';

function ContentAddCtrl($scope, $state, $stateParams, categories) {
    // contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        _.merge(newContent.translations, {
            langCode: $scope.listLang.code,
            isActive: 1
        });
        newContent.type = $stateParams.type;
        newContent.isActive = 1;
        categories.post(newContent).then(function(response) {
            $state.go('content.list', {contentId: response.id}, {reload: true});
        });
    };
}
ContentAddCtrl.$inject = ['$scope', '$state', '$stateParams', 'categories'];
module.exports = ContentAddCtrl;
