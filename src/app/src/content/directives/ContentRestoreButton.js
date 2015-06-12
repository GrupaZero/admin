'use strict';

function ContentRestoreButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentRestoreCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, ContentRestoreCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                ContentRestoreCtrl.restoreModal.showModal(attrs.id);
            });
        }
    };
}

ContentRestoreButton.$inject = [];
module.exports = ContentRestoreButton;
