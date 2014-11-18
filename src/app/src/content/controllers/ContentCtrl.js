'use strict';

function ContentCtrl($scope, Restangular, $state, ContentRepository) {
    $scope.contents = {};
    $scope.newContent = {};
    var contents = Restangular.all('admin/contents');
    var promise = ContentRepository.list({lang: $scope.currentLang.code});

    promise.then(function(response) {
        $scope.contents = response;
    });

    // Temporary contents translation language switch action
    $scope.refreshContentList = function(langCode) {
        ContentRepository.list({lang: langCode}).then(function(response) {
            $scope.contents = response;
        });
    };

    // Temporary ngTasty table data action
    $scope.getResource = function(params) {
        return promise.then(function(response) {
            return {
                'rows': ContentRepository.clean(response),
                'header': [
                    {
                        'key': 'title',
                        'name': 'Title'
                    },
                    {
                        'key': 'id',
                        'name': 'id'
                    }
                ]
            };
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
