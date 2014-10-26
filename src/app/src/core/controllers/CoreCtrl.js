'use strict';

function CoreCtrl($scope, $translate) {
    $scope.changeLanguage = function (langKey) {
        $translate.fallbackLanguage(['en_US']);
        $translate.use(langKey);
    };
}

CoreCtrl.$inject = ['$scope','$translate'];
module.exports = CoreCtrl;
