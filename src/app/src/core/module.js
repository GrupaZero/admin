'use strict';

angular.module('admin.core', [])
    .controller('CoreCtrl', require('./controllers/CoreCtrl.js'))
    .run([
        '$rootScope',
        function ($rootScope) {
            /** @type Navigation */
            $rootScope.navBar = require('./../lib/navigation.js')();
        }
    ]);
