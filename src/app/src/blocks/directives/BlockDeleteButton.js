'use strict';

function BlockDeleteButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'BlockDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, BlockDeleteCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                BlockDeleteCtrl.deleteModal.showModal(attrs.userId);
            });
        }
    };
}

BlockDeleteButton.$inject = [];
module.exports = BlockDeleteButton;
