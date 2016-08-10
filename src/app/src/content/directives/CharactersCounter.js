'use strict';

function CharactersCounter() {
	return {
		templateUrl: 'gzero/admin/views/content/directives/charactersCounter.tpl.html',
		restrict: 'A',
		scope: {
			'characters': '@count'
		}
	};
}

CharactersCounter.$inject = [];
module.exports = CharactersCounter;