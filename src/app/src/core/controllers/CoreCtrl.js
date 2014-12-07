'use strict';

function CoreCtrl($scope, Translations, LangRepository, NavBar, TopNavBar) {

    LangRepository.list().then(function(response) {
        $scope.langs = response;
        $scope.currentLang = response[0];
        $scope.listLang = $scope.currentLang;
    });

    // admin panel language
    $scope.selectAdminLang = function() {
        Translations.selectAdminLang($scope.currentLang);
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

CoreCtrl.$inject = ['$scope', 'Translations', 'LangRepository', 'NavBar', 'TopNavBar', '$state'];
module.exports = CoreCtrl;
