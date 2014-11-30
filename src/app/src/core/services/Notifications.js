'use strict';

function Notifications($alert) {
    var messages = {
        error: [],
        warning: [],
        success: []
    };
    return {
        addErrors: function(errors) {
            var self = this;
            messages.error = errors;
            _.forEach(errors, function(error) {
                self.addError(error[0]);
            });
        },
        addError: function(error) {
            $alert({
                title: 'Error',
                content: error,
                placement: 'top',
                type: 'danger',
                show: true
            });
        }
    };
}

module.$inject = ['$alert'];
module.exports = Notifications;
