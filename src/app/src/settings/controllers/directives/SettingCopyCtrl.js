'use strict';

function SettingCopyCtrl($scope, Utils, $modal, SettingsRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/settings/directives/';
    // Copy modal
    vm.copyModal = {
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
                templateUrl: viewPath + 'settingCopyModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param attrs attributes from directive
         */
        showModal: function(attrs) {
            var self = this;
            vm.attrs = attrs;
            self.initModal('PLEASE_CONFIRM', 'OPTIONS_LANG.COPY_OPTION_QUESTION');
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
         * Function apply setting value to other languages and performs the RestAngular PUT action for option value
         *
         */
        saveSetting: function() {
            var self = this;
            self.closeModal();
            // prepare option data
            var data = {
                key: vm.attrs.optionKey,
                value: angular.fromJson(vm.attrs.optionValue)
            };

            // set option value to all other languages
            _.forEach(angular.fromJson(vm.attrs.optionValue), function(n, key) {
                data.value[key] = vm.attrs.optionNewValue;
            });

            // save option
            SettingsRepository.update(vm.attrs.categoryKey, data).then(function() {
                Utils.Notifications.addSuccess('OPTIONS_LANG.COPY_CONFIRM');
                Utils.$state.reload();
            });
        }
    };
}
SettingCopyCtrl.$inject = ['$scope', 'Utils', '$modal', 'SettingsRepository'];
module.exports = SettingCopyCtrl;
