'use strict';

function ContentRepository(Restangular) {
    var api = 'contents';
    var contents = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        tree: function(params) {
            return Restangular.all('contents-tree').getList(params);
        },
        list: function(params) {
            return contents.getList(params);
        },
        deleted: function(params) {
            return Restangular.all('deleted-contents').getList(params);
        },
        children: function(id, params) {
            return Restangular.one(api, id).getList('children', params);
        },
        blocks: function(id, params) {
            return Restangular.one(api, id).getList('blocks', params);
        },
        newContent: function(newContent) {
            return contents.post(newContent);
        },
        updateContent: function(id, content) {
            return Restangular.one(api, id).patch(content);
        },
        newContentTranslation: function(id, newTranslation) {
            return Restangular.one(api, id).all('translations').post(newTranslation);
        },
        updateContentRoute: function(id, newRoute) {
            return Restangular.one(api, id).all('route').patch(newRoute);
        },
        translations: function(id, params) {
            return Restangular.one(api, id).all('translations').getList(params);
        },
        deleteTranslation: function(contentId, translationId) {
            return Restangular.one(api, contentId).one('translations', translationId).remove();
        },
        delete: function(id) {
            return Restangular.one(api, id).remove();
        },
        forceDelete: function(id) {
            return Restangular.one('deleted-contents', id).remove();
        },
        restoreContent: function(id) {
            return Restangular.one('deleted-contents', id).post('restore');
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        }
    };
}

ContentRepository.$inject = ['Restangular'];
module.exports = ContentRepository;
