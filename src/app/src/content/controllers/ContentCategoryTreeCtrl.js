'use strict';

function ContentCategoryTreeCtrl($scope, $stateParams, ContentRepository) {
    $scope.listLang = $scope.currentLang;

    // if state param has category id
    if ($stateParams.contentId) {
        $scope.activeNode = $stateParams.contentId; // select category
        console.log($scope.activeNode);
    }
    // get categories tree root level
    ContentRepository.list({
        lang: $scope.listLang.code,
        type: 'category',
        perPage: 125,
        level: 0
    }).then(function(response) {
        $scope.categories = response;
    });

    // Categories list tree toggle children action
    $scope.toggleChildren = function(scope) {
        if (!scope.$nodeScope.$modelValue.children) { // only if there is no children's
            ContentRepository.children(scope.$nodeScope.$modelValue.id, {
                lang: $scope.listLang.code,
                type: 'category'
            }).then(function(response) {
                if (ContentRepository.clean(response).length > 0) {
                    scope.$nodeScope.$modelValue.children = ContentRepository.clean(response);
                }
            });
        }
        scope.toggle();
    };
}
ContentCategoryTreeCtrl.$inject = ['$scope', '$stateParams', 'ContentRepository'];
module.exports = ContentCategoryTreeCtrl;
