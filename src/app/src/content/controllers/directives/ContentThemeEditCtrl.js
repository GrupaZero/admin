'use strict';

function ContentThemeEditCtrl($scope, Utils, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Theme modal
    vm.editModal = {
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
                templateUrl: viewPath + 'contentEditThemeModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be updated, it is saved in the scope
         * @param contentTheme content theme
         */
        showModal: function(contentId, contentTheme) {
            var self = this;
            vm.contentId = contentId;
            vm.contentTheme = contentTheme;
            self.initModal('EDIT');
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
         * Function performs the RestAngular customPUT function for content in scope
         *
         */
        saveContentWeight: function() {
            var self = this;
            var content = {
                theme: $scope.vm.contentTheme
            };

            ContentRepository.updateContent(vm.contentId, content).then(function(response) {
                self.closeModal();
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
            });

        }
    };
}
ContentThemeEditCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = ContentThemeEditCtrl;
