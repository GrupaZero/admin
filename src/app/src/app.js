'use strict';

require('./core/module.js');
require('./content/module.js');
require('./user/module.js');

var dependencies = [
    'restangular',
    'ui.router',
    'ngAnimate',
    'mgcrea.ngStrap',
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
    function($stateProvider, $urlRouterProvider, RestangularProvider, $translateProvider, $translatePartialLoaderProvider) {
        var viewPath = 'packages/gzero/admin/views/';

        // For any unmatched url, redirect to /state1
        $urlRouterProvider.otherwise('/');

        // Now set up the states
        $stateProvider
            .state('home', {
                url: '/',
                templateUrl: viewPath + 'home.html'
            });

        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: 'packages/gzero/{part}/lang/{lang}.json'
        });
        $translatePartialLoaderProvider.addPart('admin');

        //$translateProvider.preferredLanguage('pl_PL');
        $translateProvider.preferredLanguage('en_US');

        RestangularProvider.setBaseUrl(Config.apiUrl + '/v1');

        RestangularProvider.setDefaultHttpFields({
            cache: true,
            withCredentials: true
        });

        // Rename Restangular route field to use a $ prefix for easy distinction between data and metadata
        RestangularProvider.setRestangularFields({ route: '$route'});

        // add a response intereceptor
        RestangularProvider.addResponseInterceptor(function(data, operation) {
            var extractedData;
            // .. to look for getList operations

            if (operation === 'getList') {
                // .. and handle the data and meta data
                extractedData = data.data;
                extractedData.meta = data.meta;
                extractedData.params = data.params;

            } else {
                extractedData = data.data;
            }

            return extractedData;
        });

        RestangularProvider.setErrorInterceptor(function(response, deferred, responseHandler) {
            return alert(response); // error not handled
        });
    }
]).run([
    '$rootScope',
    function($rootScope, $state, $stateParams) {
        $rootScope.navBar.addFirst({title: 'DASHBOARD', action: 'home'});
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.baseUrl = Config.url;
    }
]);
