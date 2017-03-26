'use strict';

function AddFilesButton() {
    return {
        scope: {
            entity: '=',
            lang: '@',
            type: '=',
            files: '='
        },
        restrict: 'A',
        controller: 'AddFilesButtonCtrl',
        controllerAs: 'vm',
        link: function(scope, element, attrs, ContentAddFilesCtrl) {
            element.on('click', function() {

                // Show a files modal from a controller
                ContentAddFilesCtrl.filesModal.showModal(scope.entity, scope.lang, scope.files, scope.type)
                .then(function(response) {
                    scope.files = response;
                });
            });
        }
    };
}

AddFilesButton.$inject = [];
module.exports = AddFilesButton;
