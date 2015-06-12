'use strict';

function ContentRestoreCtrl($scope, $state, $modal, ContentRepository, Notifications) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Restore modal
    vm.restoreModal = {
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
                template: viewPath + 'contentRestoreModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be restored, it is saved in the scope
         */
        showModal: function(contentId) {
            var self = this;
            vm.contentId = contentId;
            // check for children
            self.initModal('PLEASE_CONFIRM', 'RESTORE_CONTENT_QUESTION');
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
         * Function restore softDeleted content
         *
         */
        restoreContent: function() {
            var self = this;
            ContentRepository.restoreContent(vm.contentId).then(function(response) {
                self.closeModal();
                // refresh current state
                $state.go($state.current, {}, {reload: true});
                Notifications.addSuccess('CONTENT_HAS_BEEN_RESTORED');
            });
        }
    };
}
ContentRestoreCtrl.$inject = ['$scope', '$state', '$modal', 'ContentRepository', 'Notifications'];
module.exports = ContentRestoreCtrl;
