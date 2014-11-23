'use strict';

function ContentCtrl($scope, Restangular, $state, ContentRepository) {
    $scope.contents = {};
    $scope.newContent = {};
    var contents = Restangular.all('admin/contents');

    // Temporary contents list action
    $scope.refreshContentList = function(langCode, currentPage, pageItems, filterBy, filterByFields, orderBy, orderByReverse) {
        ContentRepository.list({lang: langCode, page: currentPage + 1}).then(function(response) {
            console.log(response.meta);
            $scope.contents = response;
            $scope.meta = response.meta;
        });
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

ContentCtrl.$inject = ['$scope', 'Restangular', '$state', 'ContentRepository'];
module.exports = ContentCtrl;
