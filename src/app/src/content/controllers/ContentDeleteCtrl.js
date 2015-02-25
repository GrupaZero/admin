'use strict';

function ContentDeleteCtrl($scope, $state, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'packages/gzero/admin/views/content/directives/';
    vm.deleteModal = {
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
        showModal: function(contentId) {
            var self = this;
            vm.contentId = contentId;
            self.initModal();
        },
        closeModal: function() {
            var self = this;
            self.modal.hide();
        },
        // contents DELETE action
        deleteContent: function() {
            var self = this;
            ContentRepository.deleteContent(vm.contentId).then(function(response) {
                self.closeModal();
                $state.go($state.current, {}, {reload: true});
            });
        }
    };
}
ContentDeleteCtrl.$inject = ['$scope', '$state', '$modal', 'ContentRepository'];
module.exports = ContentDeleteCtrl;
