'use strict';

function FilesAddCtrl($scope, Utils, type, Upload, FilesRepository, FileService) {
    var async = require('async');
    $scope.files = [];
    $scope.progress = [];
    $scope.isBusy = false;
    // default file record values
    $scope.newFileDefaults = {
        isActive: 1,
        type: type,
        translations: {
            langCode: Utils.Config.defaultLangCode
        }
    };

    // set translations lang code
    if (typeof $scope.transLang !== 'undefined') {
        $scope.newFileDefaults.translations.langCode = $scope.transLang.code;
    }

    // remove file from files queue
    $scope.removeFile = function(index) {
        $scope.files.splice(index, 1);
        $scope.progress.splice(index, 1);
    };

    /* Set the default values for ngf-select and ngf-drop directives*/
    $scope.invalidFiles = [];
    Upload.setDefaults({
        ngfMaxTotalSize: '5MB', //@TODO allowed total files size
        ngfKeep: '"distinct"',
        ngfMaxFiles: 10, //@TODO allowed max files number
        ngfValidate: {pattern: FileService.getTypeExtensionsPattern(type)}, //allowed type files extensions
        ngfModelInvalid: 'invalidFiles'
    });

    // file POST action
    $scope.save = function() {
        $scope.isBusy = true;
        async.forEachOf($scope.files, function(file, index, callback) {
            var defaults = _.cloneDeep($scope.newFileDefaults);
            var data = FileService.prepareRequestData(file, defaults);
            FilesRepository.create(data).then(function(response) {
                $scope.removeFile(index);
                Utils.Notifications.addSuccess('FILE_CREATED', {fileName: file.name});
                callback();
            }, function(response) {
                $scope.progress[index] = 0;
                callback({fileName: file.name});
            }, function(evt) {
                // progress notify
                $scope.progress[index] = parseInt(100.0 * evt.loaded / evt.total);
            });

        }, function(error) {
            $scope.isBusy = false;
            // if any of the file processing produced an error
            if (error) {
                // All processing will now stop.
                Utils.Notifications.addError('FILE_CREATE_ERROR', error);
            } else {
                Utils.$state.go('files.list', {}, {reload: true});
            }
        });
    };
}

FilesAddCtrl.$inject = ['$scope', 'Utils', 'type', 'Upload', 'FilesRepository', 'FileService'];
module.exports = FilesAddCtrl;
