'use strict';

function ContentDeleteCtrl($scope, Utils, $modal, ContentRepository) { // jshint ignore:line
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
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
                templateUrl: viewPath + 'contentDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be removed, it is saved in the scope
         * @param contentType content type
         * @param forceDelete use forceDelete
         */
        showModal: function(contentId, contentType, forceDelete) {
            var self = this;
            vm.contentId = contentId;
            vm.contentType = contentType;
            vm.forceDelete = forceDelete;
            if (vm.forceDelete === true) {
                self.initModal('PLEASE_CONFIRM', 'DELETE_CONTENT_QUESTION');
            } else {
                self.initModal('PLEASE_CONFIRM', 'MOVE_CONTENT_TO_TRASH_QUESTION');
            }

            // Bind hotkeys
            Utils.hotkeys.add({
                combo: 'enter',
                description: Utils.$filter('translate')(
                    vm.forceDelete ? 'CONFIRM_DELETE' : 'CONFIRM_MOVE_TO_TRASH'
                ),
                callback: function(){
                    self.deleteContent();
                }
            });
        },
        /**
         * Function close the modal
         *
         */
        closeModal: function() {
            var self = this;
            Utils.hotkeys.del('enter');
            self.modal.hide();
        },
        /**
         * Function performs the RestAngular DELETE action for content id in scope
         */
        deleteContent: function() {
            var self = this;

            if (vm.forceDelete) {
                ContentRepository.forceDelete(vm.contentId).then(function() {
                    self.closeModal();
                    // refresh current state
                    if (vm.contentType === 'category') {
                        // removed category
                        Utils.Storage.removeStorageItem('contentListParent');
                        Utils.Notifications.addSuccess('CATEGORY_HAS_BEEN_DELETED');
                    } else {
                        Utils.Notifications.addSuccess('CONTENT_HAS_BEEN_DELETED');
                    }

                    Utils.$state.go('content.trashcan', {contentId: null}, {reload: true, inherit: false});
                });
            } else {
                ContentRepository.delete(vm.contentId).then(function() {
                    self.closeModal();
                    // refresh current state
                    if (vm.contentType === 'category') {
                        // removed category
                        Utils.Storage.removeStorageItem('contentListParent');
                        Utils.$state.go('content.list', {contentId: null}, {reload: true, inherit: false});
                        Utils.Notifications.addSuccess('CATEGORY_HAS_BEEN_DELETED');
                    } else {
                        // removed content
                        if (Utils.$state.$current.name === 'content.show.details') {
                            Utils.$state.go('content.trashcan', {contentId: null}, {reload: true, inherit: false});
                        } else {
                            Utils.$state.go(Utils.$state.current, {}, {reload: true});
                        }
                        Utils.Notifications.addSuccess('CONTENT_HAS_BEEN_MOVED_TO_TRASH');
                    }
                });
            }
        }
    };

}
ContentDeleteCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = ContentDeleteCtrl;
