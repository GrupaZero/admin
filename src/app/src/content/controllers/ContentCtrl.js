'use strict';

function ContentCtrl($scope, $rootScope, Restangular, $aside, $state) {
    var contents = Restangular.all('contents');
    var viewPath = 'packages/gzero/admin/views/content/';
    $scope.newContent = {};

    contents.getList().then(function(contents) {
        $scope.contents = contents;
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
    $scope.showCategories = function showCategories() {
        $scope.aside.show();
    };

    // Temporary contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        newContent.lang = {
            code: $scope.currentLang.code,
            i18n: $scope.currentLang.i18n

        };
        contents.post(newContent).then(function() {
            $state.go('content.list');
        }, function() {
            $scope.message = {
                code: 'danger',
                text: 'There was an error saving!'
            };
        });
    };

}

ContentCtrl.$inject = ['$scope', '$rootScope', 'Restangular', '$aside', '$state'];
module.exports = ContentCtrl;
