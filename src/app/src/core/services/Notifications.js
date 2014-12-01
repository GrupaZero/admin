'use strict';

function Notifications($alert, $translate) {
    var container = '.main';
    return {
        addInfos: function(messages) {
            var self = this;
            self.addMessages(self.addInfo, messages);
        },
        addErrors: function(messages) {
            var self = this;
            self.addMessages(self.addError, messages);
        },
        addWarnings: function(messages) {
            var self = this;
            self.addMessages(self.addWarning, messages);
        },
        addSuccesses: function(messages) {
            var self = this;
            self.addMessages(self.addSuccess, messages);
        },
        addMessages: function(callback, messages) {
            _.forEach(messages, function(messages) {
                callback(messages[0]);
            });
        },
        addInfo: function(message) {
            $alert({
                title: $translate.instant('INFORMATION') + ':',
                content: $translate.instant(message),
                container: container,
                type: 'info'
            });
        },
        addError: function(message) {
            $alert({
                title: $translate.instant('ERROR') + ':',
                content: $translate.instant(message),
                container: container,
                type: 'danger'
            });
        },
        addWarning: function(message) {
            $alert({
                title: $translate.instant('WARNING') + ':',
                content: $translate.instant(message),
                container: container,
                type: 'warning'
            });
        },
        addSuccess: function(message) {
            $alert({
                title: $translate.instant('SUCCESS') + ':',
                content: $translate.instant(message),
                container: container,
                type: 'success'
            });
        }
    };
}

module.$inject = ['$alert', '$translate'];
module.exports = Notifications;
