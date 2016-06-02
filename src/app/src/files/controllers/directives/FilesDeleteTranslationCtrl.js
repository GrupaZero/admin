/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class FilesDeleteTranslationCtrl
 *
 * @package    Admin
 */

'use strict';

function FilesDeleteTranslationCtrl($scope, Utils, $modal, FilesRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/files/directives/';
    // Delete modal
    vm.deleteModal = {
        /**
         * Function initiates the AngularStrap modal
         *
         * @param title translatable title of modal
         * @param message translatable messages of modal
         */
        initModal: function(title, message) {
            var self = this;
            self.modal = $modal({
                scope: $scope,
                title: title,
                content: message,
                templateUrl: viewPath + 'translationDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param fileId files id
         * @param translationId translation id
         */
        showModal: function(fileId, translationId) {
            var self = this;
            vm.fileId = fileId;
            vm.translationId = translationId;
            self.initModal('PLEASE_CONFIRM', 'DELETE_TRANSLATION_QUESTION');
        },

        /**
         * Function close the modal
         *
         */
        closeModal: function() {
            var self = this;
            self.modal.hide();
        },

        /**
         * Function performs the RestAngular DELETE action for translation id in scope
         *
         */
        delete: function() {
            var self = this;
            self.closeModal();
            FilesRepository.deleteTranslation(vm.fileId, vm.translationId).then(function() {
                Utils.Notifications.addSuccess('TRANSLATION_HAS_BEEN_DELETED');
                Utils.$state.reload();
            });
        }
    };
}
FilesDeleteTranslationCtrl.$inject = ['$scope', 'Utils', '$modal', 'FilesRepository'];
module.exports = FilesDeleteTranslationCtrl;
