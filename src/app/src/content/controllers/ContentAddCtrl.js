'use strict';

function ContentAddCtrl($scope, $state) {
    // contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        _.merge(newContent.translations, {
            langCode: $scope.listLang.code,
            isActive: 1
        });
        newContent.type = $state.params.type;
        newContent.isActive = 1;
        $scope.categories.post(newContent).then(function onSuccess(response) {
            setTimeout(function() {
                $scope.$apply(function() {
                    $scope.categories.push(response);
                    $state.go('content.list');
                });
            }, 1000);
        });
    };
}
ContentAddCtrl.$inject = ['$scope', '$state'];
module.exports = ContentAddCtrl;
