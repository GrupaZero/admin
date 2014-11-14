'use strict';

angular.module('admin.core', [])
    .controller('CoreCtrl', require('./controllers/CoreCtrl.js'))
    .factory('LangRepository', require('./services/LangRepository.js'))
    .run([
        '$rootScope',
        function($rootScope) {
            /** @type Navigation */
            $rootScope.navBar = require('./../lib/navigation.js')();
            $rootScope.topNav = require('./../lib/navigation.js')();
            $rootScope.topNav.add(
                {
                    title: 'Another action',
                    href: '#anotherAction'
                }
            );
            $rootScope.topNav.add(
                {
                    title: 'External link',
                    href: '/auth/facebook',
                    target: '_self'
                }
            );
            $rootScope.topNav.add(
                {
                    title: 'divider',
                    href: '',
                    divider: true
                }
            );
            $rootScope.topNav.add(
                {
                    title: 'Logout',
                    href: '/admin/logout'
                }
            );
        }
    ]);
