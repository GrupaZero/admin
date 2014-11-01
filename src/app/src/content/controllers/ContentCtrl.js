'use strict';

function ContentCtrl($scope, $rootScope, Restangular, $aside) {
    console.log('ContentCtrl loaded');
    var contents = Restangular.all('contents');
    var viewPath = 'packages/gzero/admin/views/content/';

    contents.getList().then(function (contents) {
        $scope.contents = contents;
        //$scope.gridOptions.data = contents;
    });

    //// Pre-fetch an external template populated with a custom scope
    $scope.aside = $aside({
        title: 'CATEGORIES',
        content: 'SELECT_CATEGORY',
        container: '.main',
        template: viewPath + 'categories.html',
        scope: $scope,
        show: false
    });
    // Aside manual trigger
    $scope.showCategories = function showCategories(){
        $scope.aside.show();
    };
}

ContentCtrl.$inject = ['$scope', '$rootScope', 'Restangular', '$aside'];
module.exports = ContentCtrl;
