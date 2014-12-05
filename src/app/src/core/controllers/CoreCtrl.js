'use strict';

function CoreCtrl($scope, $translate, LangRepository, NavBar, TopNavBar) {

    LangRepository.list().then(function(response) {
        $scope.langs = response;
        $scope.currentLang = response[0];
    });

    $scope.changeLanguage = function() {
        $translate.fallbackLanguage(['en_US']);
        $translate.use($scope.currentLang.i18n);
    };

    $scope.navBar = NavBar.getItems();
    $scope.topNavBar = TopNavBar.getItems();

    //Off canvas sidebar
    $scope.showSidebar = false;
}

CoreCtrl.$inject = ['$scope', '$translate', 'LangRepository', 'NavBar', 'TopNavBar', '$state'];
module.exports = CoreCtrl;
