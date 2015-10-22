var vm = require('vm');
var path = require('path');

module.exports = function EdgeParser(){

	this.contextObj = {
		window: { edge_authoring_mode: true },
		AdobeEdge: { 
			Symbol: {
				bindTimelineAction: saveAction('bindTimelineAction'),
				bindElementAction: saveAction('bindElementAction'),
				bindTriggerAction: saveAction('bindTriggerAction'),
				bindSymbolAction: function (compId, symbolName, eventName, eventFunction) {
					if (!_compositions[compId])
						throw new Error(compId+" is not loaded!");
					_compositions[compId].definition.actions[symbolName] = _compositions[compId].definition.actions[symbolName] || {};
					_compositions[compId].definition.actions[symbolName]['bindSymbolAction'] = _compositions[compId].definition.actions[symbolName]['bindSymbolAction'] || {};
					_compositions[compId].definition.actions[symbolName]['bindSymbolAction'][eventName] = eventFunction;
				}
			},
			$:function(){}
		},
	};

	var images = this.images = [];
	var dirs = this.dirs = [];
	var _compositions = this._compositions = {};
	var compositions = this.compositions = [];

	function saveAction(fnName){
		return function(compId, symbolName, elementSelector_or_null, eventName, eventFunction){
			if (!_compositions[compId])
				throw new Error(compId+" is not loaded!");
			_compositions[compId].definition.actions[symbolName] = _compositions[compId].definition.actions[symbolName] || {};
			_compositions[compId].definition.actions[symbolName][fnName] = _compositions[compId].definition.actions[symbolName][fnName] || {};
			_compositions[compId].definition.actions[symbolName][fnName][elementSelector_or_null] = _compositions[compId].definition.actions[symbolName][fnName][elementSelector_or_null] || {};
			_compositions[compId].definition.actions[symbolName][fnName][elementSelector_or_null][eventName] = eventFunction;
		
		}
	}

	this.contextObj.AdobeEdge.registerCompositionDefn = function (compId, symbols, fonts, scripts, resources, opts){
		var images_map = {};

		if (!_compositions[compId])
			throw new Error(compId+" is not loaded!");

		_compositions[compId].definition = {
			actions: {},
			sy: symbols,
			fo: fonts,
			sc: scripts,
			re: resources,
			op: opts
		};

		function recurseObj(obj){
			for (var i=0; i<obj.length; i++){
				if (obj[i].fill && obj[i].fill.length > 1 && typeof obj[i].fill[1] === 'string'){
					images_map[decodeURIComponent(obj[i].fill[1])] = 1;
				}
				if (obj[i].hasOwnProperty('c')){
					recurseObj(obj[i].c);
				}
			}
			
		}
		
		for (sym in symbols){
			recurseObj(symbols[sym].content.dom);
		}

		Object.keys(images_map).forEach(function(e){
			images.push(e);
		});

		var dirs_map = {};
		images.forEach(function(e){
			dirs_map[path.dirname(e)] = 1;
		});
		Object.keys(dirs_map).forEach(function(e){
			dirs.push(e);
		});
	};

	this.contextObj.AdobeEdge.loadComposition = function(projectPrefix, compId, opts, preloaderDOM, downLevelStageDOM){
		if (_compositions[compId])
			throw new Error(compId+" is already defined!");
		_compositions[compId] = {
			pr: projectPrefix, 
			op: opts, 
			pl: preloaderDOM, 
			dl: downLevelStageDOM
		};
		compositions.push(compId);
	};

	this.sandbox = vm.createContext(this.contextObj);
};

module.exports.prototype.parse = function(content){
	vm.runInContext(content, this.sandbox);
}