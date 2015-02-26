'use strict';

function ContentDeleteCtrl($scope, $state, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'packages/gzero/admin/views/content/directives/';
    // Delete modal
    vm.deleteModal = {
        /**
         * Function initiates the AngularStrap modal
         *
         */
        initModal: function() {
            var self = this;
            self.modal = $modal({
                scope: $scope,
                title: 'PLEASE_CONFIRM',
                content: 'DELETE_CONTENT_QUESTION',
                template: viewPath + 'contentDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be removed, it is saved in the scope
         */
        showModal: function(contentId) {
            var self = this;
            vm.contentId = contentId;
            self.initModal();
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
         * Function performs the RestAngular DELETE action for content id in scope
         *
         */
        deleteContent: function() {
            var self = this;
            ContentRepository.deleteContent(vm.contentId).then(function(response) {
                self.closeModal();
                // refresh current state
                $state.go($state.current, {}, {reload: true});
            });
        }
    };
}
ContentDeleteCtrl.$inject = ['$scope', '$state', '$modal', 'ContentRepository'];
module.exports = ContentDeleteCtrl;
