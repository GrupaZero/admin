'use strict';

require('./core/module.js');
require('./content/module.js');
require('./user/module.js');

var dependencies = _.merge([
    'restangular',
    'ui.router',
    'ngAnimate',
    'admin.core',
    'admin.content',
    'admin.user'
], modules); // Other modules are loaded by twig

angular.module('admin', dependencies).config([
    '$stateProvider',
    '$urlRouterProvider',
    'RestangularProvider',
    function ($stateProvider, $urlRouterProvider, RestangularProvider) {
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

        RestangularProvider.setBaseUrl('/api/v1');
        RestangularProvider.setResponseExtractor(function (response, operation) {
            return response.data;
        });
    }
]).run([
    '$rootScope',
    function ($rootScope) {

    }
]);
