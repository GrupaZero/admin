'use strict';

require('./core/module.js');
require('./content/module.js');
require('./user/module.js');

var dependencies = [
    'restangular',
    'ui.router',
    'ngAnimate',
    'ui.grid',
    'pascalprecht.translate',
    'admin.core',
    'admin.content',
    'admin.user'
];
dependencies.push.apply(dependencies, modules); // Other modules are loaded by twig

angular.module('admin', dependencies).config([
    '$stateProvider',
    '$urlRouterProvider',
    'RestangularProvider',
    '$translateProvider',
    function ($stateProvider, $urlRouterProvider, RestangularProvider, $translateProvider) {
        var viewPath = 'packages/gzero/admin/views/';
        var translationsPath = 'packages/gzero/admin/languages/';

        // For any unmatched url, redirect to /state1
        $urlRouterProvider.otherwise("/");

        // Now set up the states
        $stateProvider
            .state('home', {
                url: "/",
                views: {
                    "index@": {
                        templateUrl: viewPath + "home.html"
                    }
                }
            });

        $translateProvider.useStaticFilesLoader({
            prefix: translationsPath,
            suffix: '.json'
        });

        $translateProvider.preferredLanguage('pl_PL');
        //$translateProvider.preferredLanguage('en_US');

        RestangularProvider.setBaseUrl('/api/v1');
        RestangularProvider.setResponseExtractor(function (response, operation) {
            return response.data;
        });
    }
]).run([
    '$rootScope',
    function ($rootScope) {
        $rootScope.navBar.addFirst({title: 'DASHBOARD', action: 'home'});
    }
]);
