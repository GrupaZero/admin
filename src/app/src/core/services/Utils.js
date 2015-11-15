'use strict';

function Utils(Notifications, Storage, $state, $stateParams, ckOptions) {

    return {
        Notifications: Notifications,
        Storage: Storage,
        $state: $state,
        $stateParams: $stateParams,
        Config: Config,
        ckOptions: ckOptions
    };

}

module.$inject = ['Notifications', 'Storage', '$state', '$stateParams', 'ckOptions'];
module.exports = Utils;
