'use strict';

function ContentCtrl($scope, Restangular, $state, ContentRepository) {
    var contents = Restangular.all('admin/contents');
    $scope.newContent = {};

    ContentRepository.list({lang: 'en'}).then(function(contents) {
        $scope.contents = contents;
    });

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
