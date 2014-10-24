'use strict';

angular.module('admin.core', [])
    .run([
        '$rootScope',
        function ($rootScope) {
            /** @type Navigation */
            $rootScope.navBar = require('./../lib/navigation.js')();
        }
    ]);
