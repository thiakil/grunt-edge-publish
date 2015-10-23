var vm = require('vm');
var path = require('path');
var semver = require('semver');
var fs=require('fs');

var TL_PROP_MAP = [
	'eventId',
	'property',
	'startTime',//ms
	'endTime',//ms
	'easing',
	'element',
	'fromVal',
	'toVal'
];

var EdgeParser = module.exports = function EdgeParser(){

	this.images = [];
	this.dirs = [];
	this._compositions = {};
	this.compositions = [];
	this.propertiesAnimated = [];
	this.easingsUsed = [];
	this.sandbox = vm.createContext(this.getContextObj());
};

EdgeParser.prototype.supportedVersion = "6.0.0+400";

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
					if (semver.lt(this.supportedVersion, symbols[sym].minimumCompatibleVersion)){
						throw new Error("Symbol '"+sym+"' requires a higher version! ("+symbols[sym].minimumCompatibleVersion+")");
					}
					recurseObj(symbols[sym].content.dom);
					symbols[sym].timeline.data.forEach(function(tlEl) {
						TL_PROP_MAP.forEach(function(prop,i){
							Object.defineProperty(tlEl, prop, {get: function(){return this[i];}})
						})
						if (propertiesAnimated.indexOf(tlEl.property) == -1){
							propertiesAnimated.push(tlEl.property);
						}
						if (easingsUsed.indexOf(tlEl.easing) == -1){
							easingsUsed.push(tlEl.easing);
						}
					});
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
};


EdgeParser.prototype.load = function(file) {
	if (!fs.accessSync(file)){
		throw new Error(file+" doesn't exist");
	}
	switch (path.extname(file).toLowerCase()){
		case '.html':{
			break;
		} 
		case '.js': {
			return this.parse(fs.readFileSync(file, 'utf8'));
			break;
		}
		default:
			throw new Error("File extension not supported! "+path.extname(file));
	}
};