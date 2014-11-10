'use strict';

function LangRepository(Restangular) {
    var api = Restangular.all('langs');
    var langs = [];
    api.getList().then(function(contents) {
        langs = contents;
    });
    return {
        test: function() {
            return langs;
        }
    };
}

LangRepository.$inject = ['Restangular'];
module.exports = LangRepository;
