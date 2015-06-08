'use strict';

function ContentDeleteButton() {
    return {
        restrict: 'A',
        controller: 'ContentDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, ContentDeleteCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                console.log(attrs);
                ContentDeleteCtrl.deleteModal.showModal(attrs.id, attrs.type, attrs.force);
            });
        }
    };
}

ContentDeleteButton.$inject = [];
module.exports = ContentDeleteButton;
