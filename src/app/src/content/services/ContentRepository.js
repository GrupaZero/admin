'use strict';

function ContentRepository(Restangular) {
    var api = Restangular.all('admin/contents');
    return {
        one: function(code) {
            return api.get(code);
        },
        list: function(params) {
            return api.getList(params);
        },
        clean: function(elem){
            return Restangular.stripRestangular(elem);
        }
    };
}

ContentRepository.$inject = ['Restangular'];
module.exports = ContentRepository;
