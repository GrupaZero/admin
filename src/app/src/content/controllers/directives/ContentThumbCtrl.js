'use strict';

function ContentThumbCtrl($scope, Utils, $modal, ContentRepository, FilesRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';

    vm.searchQuery = null;

    vm.modal = {
        /**
         * Function initiates the AngularStrap modal
         *
         * @param title translatable title of modal
         */
        initModal: function(title) {
            var self = this;
            self.modal = $modal({
                scope: $scope,
                title: title,
                templateUrl: viewPath + 'contentThumbModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be updated, it is saved in the scope
         * @param thumbId content thumbId
         */
        showModal: function(contentId, thumbId) {
            var self = this;
            vm.contentId = contentId;
            vm.thumbId = thumbId;
            self.getFiles();
            self.initModal('THUMBNAIL');
        },
        /**
         * Function close the modal
         *
         */
        closeModal: function() {
            var self = this;
            self.modal.hide();
        },
        searchFiles: function(fileName) {
            var params = {
                type: 'image',
                limit: 20
            };

            if (fileName) {
                params.q = fileName;
            }

            vm.thumbId = null;
            this.loadFiles(params);
        },
        selectFile: function(file) {
            if (typeof file.id !== 'undefined') {
                vm.thumbId = file.id;
            }
        },
        getFiles: function() {
            var params = {
                type: 'image',
                limit: 100
            };

            this.loadFiles(params);
        },
        loadFiles: function(params) {

            FilesRepository.list(params).then(function(response) {
                vm.files = FilesRepository.clean(response);
            });
        },
        /**
         * Function performs the RestAngular patch function for content in scope
         *
         */
        save: function() {
            var self = this;
            var content = {
                thumb_id: vm.thumbId
            };

            ContentRepository.updateContent(vm.contentId, content).then(function(response) {
                self.closeModal();
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
            });
        }
    };
}
ContentThumbCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository', 'FilesRepository'];
module.exports = ContentThumbCtrl;
