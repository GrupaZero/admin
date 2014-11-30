'use strict';

function Notifications() {
    var messages = {
        error: [],
        warning: [],
        success: []
    };
    return {
        addErrors: function(errors) {
            messages.error = errors;
        },
        addError: function(error) {
            messages.error.push(error);
        },
        getErrors: function() {
            return messages.error;
        }
    };
}

module.exports = Notifications;
