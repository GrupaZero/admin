'use strict';

function CoreCtrl($scope, $translate, LangRepository) {
    $scope.changeLanguage = function() {
        $translate.fallbackLanguage(['en_US']);
        $translate.use($scope.currentLang.i18n);
    };
    LangRepository.all().then(function(data) {
        $scope.langs = data;
        $scope.currentLang = data[0];
    });
    //Off canvas sidebar
    $scope.showSidebar = false;
}

CoreCtrl.$inject = ['$scope', '$translate', 'LangRepository'];
module.exports = CoreCtrl;
