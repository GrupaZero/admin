'use strict';

function AddFilesButtonCtrl($scope, $q, Utils, $modal, FilesRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/core/directives/';

    vm.searchQuery = null;
    // files modal
    vm.filesModal = {
        existingFiles: [],
        filesToAdd: [],
        /**
         * Function initiates the AngularStrap modal
         *
         * @param title translatable title of modal
         */
        initModal: function(title) {
            var self = this;
            self.deferred = $q.defer();
            self.modal = $modal({
                scope: $scope,
                title: title,
                templateUrl: viewPath + 'addFilesModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param entity it is saved in the scope
         * @param langCode translation lang code
         * @param existingFiles array with existing files collection
         * @param filesType files type to get
         */
        showModal: function(entity, langCode, existingFiles, filesType) {
            var self = this;

            vm.entity = entity;
            vm.langCode = langCode;
            self.existingFiles = existingFiles;
            self.filesType = filesType;
            self.getFiles();
            self.initModal('SELECT_FILES_TO_ADD');

            return self.deferred.promise;
        },
        /**
         * Function close the modal
         *
         */
        closeModal: function() {
            var self = this;
            vm.searchQuery = null;
            Utils.hotkeys.del('enter');
            self.modal.hide();
            self.deferred.resolve(self.existingFiles);
        },
        getFiles: function() {
            var params = {
                type: this.filesType,
                perPage: 100,
                limit: 100
            };

            this.loadFiles(params);
        },
        searchFiles: function(fileName) {
            var params = {
                type: this.filesType,
                perPage: 100,
                limit: 100
            };

            if (fileName) {
                params.q = fileName;
            }

            this.loadFiles(params);
        },
        selectFile: function(file) {
            if (typeof file.id !== 'undefined') {
                if (!file.isSelected && _.findIndex(this.filesToAdd, {id: file.id}) === -1) {
                    file.weight = this.existingFiles.length;
                    this.filesToAdd.push(file);
                    file.isSelected = true;
                } else {
                    file.isSelected = false;
                    this.filesToAdd = _.reject(this.filesToAdd, {id: file.id});
                }
            }
        },
        addFiles: function() {
            // only when files has been selected
            if (this.filesToAdd.length) {
                this.existingFiles = _.union(this.existingFiles, this.filesToAdd);
            }

            this.closeModal();
        },
        loadFiles: function(params) {
            var self = this;

            this.filesToAdd = [];
            FilesRepository.list(params).then(function(response) {
                var files = FilesRepository.clean(response);

                vm.availableFiles = self.rejectExistingFiles(files);
            });
        },
        rejectExistingFiles: function(files) {
            var filesIds = _.map(this.existingFiles, 'id');

            return _.reject(files, function(file) {
                return _.indexOf(filesIds, file.id) !== -1;
            });
        }
    };

}
AddFilesButtonCtrl.$inject = ['$scope', '$q', 'Utils', '$modal', 'FilesRepository'];
module.exports = AddFilesButtonCtrl;
