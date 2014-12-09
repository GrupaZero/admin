'use strict';

function ContentCategoryTreeCtrl($scope, $stateParams, Storage, ContentRepository) {
    // get categories tree root level
    ContentRepository.list({
        lang: $scope.listLang.code,
        type: 'category',
        perPage: 125,
        level: 0
    }).then(function(response) {
        $scope.categories = ContentRepository.clean(response);

        // if state param has category id
        if ($stateParams.contentId) {
            // selected category
            $scope.activeNode = $stateParams.contentId;

            // load children of selected category
            ContentRepository.children($scope.activeNode, {
                lang: $scope.listLang.code,
                type: 'category'
            }).then(function(response) {
                _.forEach($scope.categories, function(category) {
                    if (category.id === parseInt($scope.activeNode)) {
                        category.children = ContentRepository.clean(response);
                    }
                });
            });
        }

        // removes parent id from storage
        $scope.uncategorized = function() {
            Storage.removeListParam('contentListParent');
        };
    });
}
ContentCategoryTreeCtrl.$inject = ['$scope', '$stateParams', 'Storage', 'ContentRepository'];
module.exports = ContentCategoryTreeCtrl;
