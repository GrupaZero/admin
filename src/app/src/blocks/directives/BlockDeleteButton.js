'use strict';

function BlockDeleteButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'BlocksDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, BlocksDeleteCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                BlocksDeleteCtrl.deleteModal.showModal(attrs.blockId, attrs.force === 'true');
            });
        }
    };
}

BlockDeleteButton.$inject = [];
module.exports = BlockDeleteButton;
