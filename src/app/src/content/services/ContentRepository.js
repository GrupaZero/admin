'use strict';

function ContentRepository(Restangular, noCacheRestService) {
    var api = 'admin/contents';
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        list: function(params) {
            return noCacheRestService.all(api).getList(params);
        },
        children: function(id, params) {
            return Restangular.one(api, id).getList('children', params);
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        }
    };
}

ContentRepository.$inject = ['Restangular', 'noCacheRestService'];
module.exports = ContentRepository;
