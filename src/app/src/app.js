'use strict';

require('./core/module.js');
require('./content/module.js');
require('./user/module.js');

var dependencies = [
    'restangular',
    'ui.router',
    'ngAnimate',
    'mgcrea.ngStrap',
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
    '$translatePartialLoaderProvider',
    function ($stateProvider, $urlRouterProvider, RestangularProvider, $translateProvider, $translatePartialLoaderProvider) {
        var viewPath = 'packages/gzero/admin/views/';

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

        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: 'packages/gzero/{part}/lang/{lang}.json'
        });
        $translatePartialLoaderProvider.addPart('admin');

        //$translateProvider.preferredLanguage('pl_PL');
        $translateProvider.preferredLanguage('en_US');

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
