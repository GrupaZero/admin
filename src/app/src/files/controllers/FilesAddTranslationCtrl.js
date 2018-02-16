'use strict';

function FilesAddTranslationCtrl($scope, Utils, FilesRepository) {
    // default translations lang code
    $scope.newFileTranslation = {
        language_code: Utils.$stateParams.langCode
    };

    // files translations POST action
    $scope.addFileTranslation = function() {
        FilesRepository.newTranslation(Utils.$stateParams.fileId, $scope.newFileTranslation)
            .then(function(response) {
            // Redirect user to previous state or files list
            Utils.redirectBack('files.list');
        });
    };
}
FilesAddTranslationCtrl.$inject = ['$scope', 'Utils', 'FilesRepository'];
module.exports = FilesAddTranslationCtrl;
