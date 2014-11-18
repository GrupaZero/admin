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
                    title: 'DASHBOARD',
                    action: 'home'
                }
            );
            $rootScope.topNav.add(
                {
                    title: 'SETTINGS',
                    action: 'content.list'
                }
            );
            $rootScope.topNav.addLastChild(
                'SETTINGS',
                {
                    title: 'ALL_CONTENTS',
                    action: 'content.list'
                }
            );
            $rootScope.topNav.addLastChild(
                'SETTINGS',
                {
                    title: 'ADD_NEW',
                    action: 'content.add'
                }
            );
        }
    ]);
