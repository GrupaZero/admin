'use strict';

function ContentAddButton($dropdown) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var dropdown = $dropdown(element, {
                template: 'gzero/admin/views/content/directives/contentAddDropdown.tpl.html',
                animation: 'am-flip-x',
                placement: 'bottom-right'
            });

            element.on('click', function() {
                // TODO: get registered content types
                dropdown.$scope.content = [
                    {
                        text: 'ADD_CONTENT',
                        href: 'content.add({ type: "content" })',
                        icon: 'fa fa-file-text-o'

                    },
                    {
                        divider: true
                    },
                    {
                        text: 'ADD_CATEGORY',
                        href: 'content.add({ type: "category" })',
                        icon: 'fa fa-folder-o'
                    }
                ];
            });
        }
    };
}

ContentAddButton.$inject = [];
module.exports = ContentAddButton;
