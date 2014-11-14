'use strict';

function CoreCtrl($scope, $translate, LangRepository) {
    $scope.changeLanguage = function() {
        $translate.fallbackLanguage(['en_US']);
        $translate.use($scope.currentLang.i18n);
    };
    LangRepository.list().then(function(data) {
        $scope.langs = data;
        $scope.currentLang = data[0];
    });
    //Off canvas sidebar
    $scope.showSidebar = false;
}

CoreCtrl.$inject = ['$scope', '$translate', 'LangRepository'];
module.exports = CoreCtrl;
