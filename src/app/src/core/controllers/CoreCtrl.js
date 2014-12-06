'use strict';

function CoreCtrl($scope, $translate, LangRepository, NavBar, TopNavBar) {

    LangRepository.list().then(function(response) {
        $scope.langs = response;
        $scope.currentLang = response[0];
        $scope.listLang = $scope.currentLang;
    });

    // admin panel language
    $scope.changeLanguage = function() {
        $translate.fallbackLanguage(['en_US']);
        $translate.use($scope.currentLang.i18n);
    };

    // translations language
    $scope.selectLanguage = function(lang) {
        $scope.listLang = lang;
    };

    $scope.navBar = NavBar.getItems();
    $scope.topNavBar = TopNavBar.getItems();

    //Off canvas sidebar
    $scope.showSidebar = false;
}

CoreCtrl.$inject = ['$scope', '$translate', 'LangRepository', 'NavBar', 'TopNavBar', '$state'];
module.exports = CoreCtrl;
