'use strict';

function CoreCtrl($scope, $translate, LangRepository, Notifications) {
    var promise = LangRepository.list();

    promise.then(function(response) {
        $scope.langs = response;
        $scope.currentLang = response[0];
    });

    $scope.changeLanguage = function() {
        $translate.fallbackLanguage(['en_US']);
        $translate.use($scope.currentLang.i18n);
    };

    //Off canvas sidebar
    $scope.showSidebar = false;
    $scope.errors = Notifications.getErrors();
    console.log($scope.errors);
}

CoreCtrl.$inject = ['$scope', '$translate', 'LangRepository', 'Notifications'];
module.exports = CoreCtrl;
