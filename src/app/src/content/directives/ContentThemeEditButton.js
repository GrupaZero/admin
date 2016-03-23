'use strict';

function ContentThemeEditButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentThemeEditCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, ContentThemeEditCtrl) {
            element.on('click', function() {
                ContentThemeEditCtrl.editModal.showModal(
                    attrs.contentId,
                    attrs.contentTheme
                );
            });
        }
    };
}

ContentThemeEditButton.$inject = [];
module.exports = ContentThemeEditButton;
