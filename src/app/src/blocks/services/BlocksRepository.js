'use strict';

function BlocksRepository(Restangular) {
    var api = 'blocks';
    var blocks = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        list: function(params) {
            return blocks.getList(params);
        },
        listForContent: function(id) {
            return Restangular.one(api + '/content', id).getList();
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        },
        create: function(newContent) {
            return blocks.post(newContent);
        },
        delete: function(id) {
            return Restangular.one(api, id).remove();
        },
        forceDelete: function(id) {
            return Restangular.one('deleted-blocks', id).remove();
        },
        update: function(categoryKey, data) {
            return Restangular.one(api, categoryKey).patch(data);
        },
        createTranslation: function(id, newTranslation) {
            return Restangular.one(api, id).all('translations').post(newTranslation);
        }
    };
}

BlocksRepository.$inject = ['Restangular'];
module.exports = BlocksRepository;
