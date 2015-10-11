'use strict';

function SettingsCtrl($scope, Utils, SettingsRepository, categories, settings) {

    // option category
    if (typeof Utils.$stateParams.key !== 'undefined') {
        $scope.categoryKey = Utils.$stateParams.key;
    }

    // lang code exists
    if (typeof Utils.$stateParams.langCode !== 'undefined') {
        $scope.langCode = Utils.$stateParams.langCode;
    }

    // categories exists
    if (typeof categories !== 'undefined') {
        $scope.categories = SettingsRepository.clean(categories); // options categories
    }

    // settings exists
    if (typeof settings !== 'undefined') {
        $scope.settings = SettingsRepository.clean(settings); // category settings
    }
}

SettingsCtrl.$inject = ['$scope', 'Utils', 'SettingsRepository', 'categories', 'settings'];
module.exports = SettingsCtrl;
