'use strict';

function Utils(Notifications, Storage, $state, $stateParams) {

    return {

        Notifications: Notifications,
        Storage: Storage,
        $state: $state,
        $stateParams: $stateParams,
        Config: Config
    };

}

module.$inject = ['Notifications', 'Storage', '$state', '$stateParams'];
module.exports = Utils;