'use strict';

function Utils(Notifications, Storage, $state, $previousState, $stateParams, $timeout, ckOptions) {

    return {
        Notifications: Notifications,
        Storage: Storage,
        $state: $state,
        $stateParams: $stateParams,
        Config: Config,
        ckOptions: ckOptions,
        /**
         * Redirect user to previous state
         * @param {string} defaultStateName default state name
         */
        redirectBack: function(defaultStateName) {
            // Gets a reference to the previous state.
            var previousState = $previousState.get();
            // Wait for CKEeditor instance, so that it can be removed without errors
            $timeout(function() {
                // if there is a previousState
                if (previousState !== null) {
                    // redirected back to the state we came from
                    $state.go(previousState.state.name, previousState.params, {reload: true});
                } else {
                    // otherwise go to default state
                    $state.go(defaultStateName, {}, {reload: true});
                }
            }, 100);
        }
    };

}

module.$inject = ['Notifications', 'Storage', '$state', '$stateParams', '$timeout', 'ckOptions'];
module.exports = Utils;
