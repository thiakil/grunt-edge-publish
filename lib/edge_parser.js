var vm = require('vm');
var path = require('path');

var EdgeParser = module.exports = function EdgeParser(){

	this.images = [];
	this.dirs = [];
	this._compositions = {};
	this.compositions = [];
	this.sandbox = vm.createContext(this.getContextObj());
};
EdgeParser.prototype.getContextObj = function(){
	var _this = this;
	return {
		window: { edge_authoring_mode: true },
		AdobeEdge: { 
			Symbol: {
				bindTimelineAction: this.saveAction('bindTimelineAction'),
				bindElementAction: this.saveAction('bindElementAction'),
				bindTriggerAction: this.saveAction('bindTriggerAction'),
				bindSymbolAction: function (compId, symbolName, eventName, eventFunction) {
					if (!_this._compositions[compId])
						throw new Error(compId+" is not loaded!");
					_this._compositions[compId].definition.actions[symbolName] = _this._compositions[compId].definition.actions[symbolName] || {};
					_this._compositions[compId].definition.actions[symbolName]['bindSymbolAction'] = _this._compositions[compId].definition.actions[symbolName]['bindSymbolAction'] || {};
					_this._compositions[compId].definition.actions[symbolName]['bindSymbolAction'][eventName] = eventFunction;
				}
			},
			$:function(){},
			registerCompositionDefn: function (compId, symbols, fonts, scripts, resources, opts){
				var images_map = {};

				if (!_this._compositions[compId])
					throw new Error(compId+" is not loaded!");

				_this._compositions[compId].definition = {
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
					_this.images.push(e);
				});

				var dirs_map = {};
				_this.images.forEach(function(e){
					dirs_map[path.dirname(e)] = 1;
				});
				Object.keys(dirs_map).forEach(function(e){
					_this.dirs.push(e);
				});
			},
			loadComposition: function(projectPrefix, compId, opts, preloaderDOM, downLevelStageDOM){
				if (_this._compositions[compId])
					throw new Error(compId+" is already defined!");
				_this._compositions[compId] = {
					pr: projectPrefix, 
					op: opts, 
					pl: preloaderDOM, 
					dl: downLevelStageDOM
				};
				_this.compositions.push(compId);
			}
		},
	}
};

EdgeParser.prototype.saveAction = function(fnName){
	return function(compId, symbolName, elementSelector_or_null, eventName, eventFunction){
		if (!_this._compositions[compId])
			throw new Error(compId+" is not loaded!");
		_this._compositions[compId].definition.actions[symbolName] = _this._compositions[compId].definition.actions[symbolName] || {};
		_this._compositions[compId].definition.actions[symbolName][fnName] = _this._compositions[compId].definition.actions[symbolName][fnName] || {};
		_this._compositions[compId].definition.actions[symbolName][fnName][elementSelector_or_null] = _this._compositions[compId].definition.actions[symbolName][fnName][elementSelector_or_null] || {};
		_this._compositions[compId].definition.actions[symbolName][fnName][elementSelector_or_null][eventName] = eventFunction;
	
	}
};

EdgeParser.prototype.parse = function(content){
	vm.runInContext(content, this.sandbox);
}