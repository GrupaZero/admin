'use strict';

function Notifications() {
    /**
     * Custom methods
     */

    var messages = [];
    return {
        addError: function(error) {
            messages.push(error);
        }
    };
}

module.exports = Notifications;
