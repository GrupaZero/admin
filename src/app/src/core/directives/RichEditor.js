'use strict';

function RichEditor() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var ckeditorController = element.controller('ckeditor'); // angular-ckeditor controller
            var ckeditorInstance = ckeditorController.instance;

            ckeditorInstance.on('instanceReady', function(event)
            {
                //console.log(ckeditorInstance);
                //ckeditorInstance.destroy();
                //CKEDITOR.replace('body', {
                //    language: 'de'
                //});
            });
        }
    };
}

RichEditor.$inject = [];
module.exports = RichEditor;
