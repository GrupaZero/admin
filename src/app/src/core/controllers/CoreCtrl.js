'use strict';

function CoreCtrl($scope, $translate) {
    $scope.changeLanguage = function (langKey) {
        $translate.use(langKey);
    };
}

CoreCtrl.$inject = ['$scope','$translate'];
module.exports = CoreCtrl;
