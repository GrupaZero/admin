'use strict';

function Utils(Notifications, Storage, $state, $previousState, $stateParams, ckOptions, hotkeys, $filter) { // jshint ignore:line

    return {
        Notifications: Notifications,
        Storage: Storage,
        $state: $state,
        $stateParams: $stateParams,
        $previousState: $previousState,
        Config: Config,
        ckOptions: ckOptions,
        hotkeys: hotkeys,
        $filter: $filter,
        /**
         * Redirect user to previous state
         * @param {string} defaultStateName default state name
         */
        redirectBack: function(defaultStateName) {
            // gets a reference to the previous state.
            var previousState = $previousState.get();
            // set default name for the redirect if it is is not specified
            if (typeof defaultStateName === 'undefined') {
                defaultStateName = 'home'; // Redirect to home
            }

            // if there is a previousState
            if (previousState !== null && $state.current.name !== previousState.state.name) {
                // redirected back to the state we came from
                $state.go(previousState.state.name, previousState.params, {reload: true});
            } else {
                // otherwise go to default state
                $state.go(defaultStateName, {}, {reload: true});
            }
        },
        /**
         * function checks if one of provided state names is included in current state
         *
         * @param {array} stateNames the collection to iterate over
         *
         * @returns {bool} whether any of state exists
         */
        stateIncludes: function(stateNames) {
            var includes = false;
            if (typeof stateNames !== 'undefined') {
                _.forEach(stateNames, function(stateName) {
                    if ($state.includes(stateName)) {
                        includes = true;
                    }
                });
            }

            return includes;
        },
        /**
         * Return translation with specified lang property from translations array
         * and fetch lang property
         *
         * @param translations Translations array
         * @param langCode language code
         * @returns Object | false
         */
        getTranslationByLang: function(translations, langCode) {
            var translation = translations.shift();

            if (!translation) {
                return false;
            }

            if (translation.langCode === langCode) {
                return translation;
            } else {
                return this.getTranslationByLang(translations, langCode);
            }
        },
        /**
         * Return all available entities types object from config
         *
         * // @TODO include 'music' and 'video' back
         * @returns Object available entities types
         */
        getEntitiesTypes: function() {
            return {
                contentTypes: this.Config.contentTypes,
                blockTypes: this.Config.blockTypes,
                fileTypes: _.without(this.Config.fileTypes, 'music', 'video')
            };
        }
    };

}

module.$inject = [
    'Notifications',
    'Storage',
    '$state',
    '$previousState',
    '$stateParams',
    'ckOptions',
    'hotkeys',
    '$filter'
];

module.exports = Utils;
