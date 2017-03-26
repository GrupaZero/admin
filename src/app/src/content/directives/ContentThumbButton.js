'use strict';

function ContentThumbButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentThumbCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, ContentThumbCtrl) {
            element.on('click', function() {
                ContentThumbCtrl.modal.showModal(
                    attrs.contentId,
                    attrs.thumbId
                );
            });
        }
    };
}

ContentThumbButton.$inject = [];
module.exports = ContentThumbButton;
