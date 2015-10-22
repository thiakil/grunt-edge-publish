/*
 * grunt-edge-publish
 * https://github.com/thiakil/grunt-edge-publish
 *
 * Copyright (c) 2015 Xander Victory
 * Licensed under the GPL-3.0 license.
 */

var async= require('async');
var vm = require('vm');
var path = require('path');
var util = require('util');
var Handlebars = require('handlebars');
var htmlparser = require("htmlparser2");
var tosource = require('../lib/tosource');
var TOSOURCE = function(object){ return tosource(object, 0, ''); };
var TOSOURCE_min = function(object, StringsCB){ return tosource(object, 0, '', '', StringsCB); };
var EdgeParser = require('../lib/edge_parser');
var UglifyJS = require("uglify-js");

'use strict';

module.exports = function(grunt) {

	grunt.registerMultiTask('edge_publish', 'Node.js based publishing of Adobe Edge Animate projects', function() {
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options({
			staticPreloader: true,
			embedPreloaderImages: true,
			uglify: true,
			headExtra: false,
			footerExtra: false,
			embedCompInHtml: false,
			minify: {
				eid: true,
				colors: true,
				numbers: true,
				zeros: true,
				strings: true,
			}
		});

		var done = this.async();

		var edge_runtime_re = /<!--Adobe Edge Runtime-->([\s\S]*)<!--Adobe Edge Runtime End-->/m;

		async.each(this.files, function (file, next) {
			var src_files = file.src.filter(function(filepath) {
				// Warn on and remove invalid source files (if nonull was set).
				if (!grunt.file.exists(filepath)) {
					grunt.log.warn('Source file "' + filepath + '" not found.');
					return false;
				} else {
					return true;
				}
			});
			if (!file.dest || !path.dirname(file.dest)){
				grunt.fail("No destination found in config");
			}
			file.dest = path.dirname(file.dest);

			var outdir = file.dest+'/';
			if (!grunt.file.exists(outdir)) {
				grunt.file.mkdir(outdir);
			}

			src_files.forEach(function(src){
				var src_basedir = path.dirname(src)+'/';

				edgeParser = new EdgeParser();

				//var an_content = JSON.parse(grunt.file.read(src).replace(/\\\r?\n/g, ''));
				var an_content; 
				try {
					eval('an_content = '+grunt.file.read(src)+';');
				} catch (e) {}
				if (!an_content.HTMLFileName) {
					return grunt.fatal("Could not get HTMLFileName!");
				}
				var project_prefix = an_content.HTMLFileName.replace(new RegExp(path.extname(an_content.HTMLFileName)+'$'), '');
				//console.log(an_content.HTMLFileName);
				var src_html = grunt.file.read(src_basedir+an_content.HTMLFileName);
				var edge_runtime = edge_runtime_re.exec(src_html);
				if (!edge_runtime || !edge_runtime[1]){
					return grunt.fatal("Could not find runtime content in "+an_content.HTMLFileName);
				}
				edge_runtime = edge_runtime[1];

				var edge_include_filename, edge_runtime_css;

				var handler = new htmlparser.DomHandler(function (error, dom) {
					if (error){
						grunt.fatal(error);
					} else {
						//console.log(dom);
						dom.forEach(function(e){
							if (e.type == 'script' && e.children.length){
								e.children.forEach(function(ee){
									if (ee.type == 'text' && ee.data.indexOf('loadComposition')){
										try {
											//console.log("found", ee.data);
											edgeParser.parse(ee.data, edgeParser);
										} catch (err) {
											grunt.fatal(err);
										}
									} else { console.log(ee)}
								})							
							} else if (e.type == 'script' && e.attribs.src && e.attribs.src.indexOf('edge_includes') > -1){
								edge_include_filename = e.attribs.src;
							} else if (e.type == 'style' && e.children.length){
								e.children.forEach(function(ee){
									if (ee.type == 'text') {
										edge_runtime_css = (edge_runtime_css || '')+ee.data.trim();
									}
								});
							}
						})
					}
				}, {normalizeWhitespace:true});

				var parser = new htmlparser.Parser(handler);
				parser.write(edge_runtime);
				parser.done();

				if (!edgeParser.compositions.length){
					grunt.fatal("No compositions were found to be loading!")
				} else if (edgeParser.compositions.length > 1){
					grunt.fatal("More than 1 composition was found!");
				} else if (!edge_include_filename){
					grunt.fatal("Did not find edge include in HTML!");
				}
				//console.log(edgeParser._compositions[edgeParser.compositions[0]]);
				var mycomp = edgeParser._compositions[edgeParser.compositions[0]]
				comp_info = {
					name: mycomp.pr,
					className: edgeParser.compositions[0],
					settings: mycomp.op,
					preloader: mycomp.pl,
					downlevel: mycomp.dl
				};
				//console.log(edge_runtime_css, edge_include_filename);

				var edge_main_js = grunt.file.read(src_basedir+project_prefix+'_edge.js');
				var edge_actions_js = grunt.file.read(src_basedir+project_prefix+'_edgeActions.js');

				try {
					edgeParser.parse(edge_main_js+edge_actions_js, edgeParser);
				} catch (e) {
					grunt.fatal(e);
				}

				var eid_i = 0;
				function minEid(curval){
					if (!curval.match(/^eid\d+$/)){ return curval; }
					else { return 'e'+(eid_i++); }
				}
				var rgba_re = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i;
				var rgb_re = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
				var shorthex_re = /#([a-f0-9])\1([a-f0-9])\2([a-f0-9])\3/i;
				function minColour(curval){
					if (rgba_re.test(curval)){
						var rgba_val = rgba_re.exec(curval);
						if (rgba_val[4] == '1' || rgba_val[4] == '1.00'){
							var hexval = '#'+parseInt(rgba_val[1]).toString(16)+
											 parseInt(rgba_val[2]).toString(16)+
											 parseInt(rgba_val[3]).toString(16);
							if (shorthex_re.test(hexval)){//eg FFFFFF
								var hextmp = (shorthex_re).exec(hexval);
								return '#'+hextmp[1]+hextmp[2]+hextmp[3];//return eg. #fff
							} else {
								return hexval;//can't shorten, return full
							}
						} else if (rgba_val[4].match(/^0\.\d+$/)){
							rgba_val[4] = rgba_val[4].replace(/^0/, '');//remove the useless 0
							return "rgba("+rgba_val[1]+','+rgba_val[2]+','+rgba_val[3]+','+rgba_val[4]+')';
						}
					}
					if (rgb_re.test(curval)){
						var rgb_val = rgb_re.exec(curval);
						var hexval = '#'+parseInt(rgb_val[1]).toString(16)+
										 parseInt(rgb_val[2]).toString(16)+
										 parseInt(rgb_val[3]).toString(16);
						if (shorthex_re.test(hexval)) {//eg FFFFFF
							var hextmp = (shorthex_re).exec(hexval);
							return '#'+hextmp[1]+hextmp[2]+hextmp[3];//return eg. #fff
						} else {
							return hexval;//can't shorten, return full
						}
					}
					return curval;
				}
				function minNumber(curval){
					if (curval.match(/^\d+$/)){
						var numval = parseInt(curval);
						if (numval == curval){//likely useless, but just be sure
							return numval;
						}
					}
					if (curval.match(/^0\.0+$/)){ //e.g. 0.00000000
						return 0;
					}
					return curval;
				}
				var zero_units_re = /^0+(px|em|%|ex|cm|mm|in|pt|pc|ch|rem)$/;//add css units here
				function minZero(curval){
					if (zero_units_re.test(curval)){
						return 0;
					}
					return curval;
				}
				var stringsList = {};
				function min_el(el){
					if (typeof el == 'string'){
						if (options.minify.eid){
							el = minEid(el);
						}
						if (options.minify.colors){
							el = minColour(el);
						}
						if (options.minify.numbers){
							el = minNumber(el);
						}
						if (options.minify.zeros){
							el = minZero(el);
						}
						if (typeof el == 'string'){//check that its still a string
							stringsList[el] = (stringsList[el] || 0) + 1;
						}
					} else if (util.isArray(el)){
						el = el.map(min_el);
					} /*else {
						console.log(typeof el);
						console.log(Object.getPrototypeOf(el));
					}*/
					return el;
				}
				/*minify: {
					eid: true,
					colors: true,
					numbers: true,
					zeros: true,
					strings: true
				}*/
				if (options.minify){
					grunt.log.writeln('Minifying values')
					for (sym in mycomp.definition.sy){
						mycomp.definition.sy[sym].content.dom.forEach(function recurseDomEl(domEl){
							for (prop in domEl){
								if (prop == 'c'){
									domEl.c.forEach(recurseDomEl);
								} else {
									domEl[prop] = min_el(domEl[prop]);
								}
							}
						});
						mycomp.definition.sy[sym].timeline.data = mycomp.definition.sy[sym].timeline.data.map(function(timelineEl){
							//console.log(timelineEl);
							return min_el(timelineEl);
						});
					}
				}

				var min_str_i = 0;
				var min_str_map = {};
				function min_string_var(){
					return 'v'+(min_str_i++);
				}

				function min_strings(obj){
					var nextvarlen = 1 + (min_str_i).toString().length;// v + num to stringlen
					//console.log('v'+min_str_i.toString()+' = '+nextvarlen);
					if (
						!options.minify.strings || 
						stringsList[obj] === undefined || 
						stringsList[obj] == 1 ||
						/*obj plus quotes*/(obj.length + 2) * /*num occurrences*/ stringsList[obj] < (nextvarlen) * stringsList[obj]/*=str var occurrences*/ + /*initial dec=*/obj.length + /*quotes*/2 + /*var name in declaration*/(nextvarlen) + /*= and ,*/2
					){
						return JSON.stringify(obj);
					}
					if (min_str_map[obj] !== undefined){
						return min_str_map[obj];
					}
					grunt.log.verbose.writeln(obj+" was used "+stringsList[obj]+" times");
					var this_id = min_string_var();
					min_str_map[obj] = this_id;
					//console.log(min_str_map[obj]);
					return this_id;
				}

				var edge_main_js_min = 'AdobeEdge.registerCompositionDefn(compId,'+TOSOURCE_min(mycomp.definition.sy, min_strings)+','+TOSOURCE(mycomp.definition.fo, min_strings)+','+TOSOURCE_min(mycomp.definition.sc, min_strings)+','+TOSOURCE_min(mycomp.definition.re, min_strings)+','+TOSOURCE_min(mycomp.definition.op, min_strings)+');'

				var edge_vars = [];
				if (Object.keys(min_str_map).length){
					for (str in min_str_map){
						edge_vars.push(min_str_map[str]+'='+JSON.stringify(str));
					}
				}
				if (edge_vars.length){
					edge_main_js_min = 'var '+edge_vars.join(',')+';'+edge_main_js_min
				}

				//console.log(TOSOURCE(mycomp.definition.actions));

				var generated_actions = '';
				for (sym in mycomp.definition.actions){
					var this_sym_actions = '';
					for (func in mycomp.definition.actions[sym]){
						for (el in mycomp.definition.actions[sym][func]){//el is event name for symbolaction
							if (func == 'bindSymbolAction'){
								var funcDefn = compress_actions(mycomp.definition.actions[sym][func][el]);
								if (funcDefn != "function(sym,e){}")//empty func
									this_sym_actions += 'Symbol.bindSymbolAction(compId,x_sym,'+TOSOURCE_min(el, min_strings)+','+funcDefn+');';
							} else {
								for (ev in mycomp.definition.actions[sym][func][el]){
									var funcDefn = compress_actions(mycomp.definition.actions[sym][func][el][ev]);
									if (funcDefn != "function(sym,e){}")//empty func
										this_sym_actions += 'Symbol.'+func+'(compId,x_sym,'+TOSOURCE_min(el, min_strings)+','+TOSOURCE_min(ev, min_strings)+','+funcDefn+');';
								}
							}
						}
					}
					if (this_sym_actions){
						generated_actions+='(function(x_sym){' +
											this_sym_actions +
											'})('+TOSOURCE_min(sym, min_strings)+');';
					}
				}


				var js_out_with_closure = '(function($,Edge,compId){var Composition=Edge.Composition,Symbol=Edge.Symbol;'+
					edge_main_js_min +
					generated_actions +
				'})(window.jQuery||AdobeEdge.$,AdobeEdge,'+TOSOURCE(edgeParser.compositions[0])+');';

				var edge_load_comp = "AdobeEdge.loadComposition("+(options.embedCompInHtml ? '0' : TOSOURCE(mycomp.pr))+','+TOSOURCE(edgeParser.compositions[0])+','+TOSOURCE(mycomp.op)+','+TOSOURCE(mycomp.pl)+','+TOSOURCE(mycomp.dl)+')';

				if (options.staticPreloader || options.embedPreloaderImages){
					comp_info.preloader.dom.forEach(function(domEl){
						domEl.id = domEl.id.replace(/-/g,'_');
						var imgname = domEl.fill[1];
						edge_load_comp = edge_load_comp.replace(new RegExp("[\"']"+imgname+"[\"']", 'g'), 'img_'+domEl.id);
						if (options.embedPreloaderImages){
							domEl.fill[1] = get_data_uri(src_basedir+domEl.fill[1]);
						}
						if (options.staticPreloader){
							edge_runtime_css += '#'+domEl.id+'{'+
												'position:absolute;'+
												'top:'+domEl.rect[1]+';'+
												'left:'+domEl.rect[0]+';'+
												'width:'+domEl.rect[2]+';'+
												'height:'+domEl.rect[3]+';'+
												'background: none '+ //image
															(domEl.fill[6] ? domEl.fill[6] : 'no-repeat')+' '+//repeat type
															domEl.fill[2]+' '+domEl.fill[3]+//position
															(domEl.fill[4] && domEl.fill[5] ? '/'+domEl.fill[4]+' '+domEl.fill[5] : '/ 100% 100%')+//size
															' '+domEl.fill[0]+//color
												'}';
						}
					});
				}
				
				var html_template = Handlebars.compile(grunt.file.read('html_template.handlebars'));

				grunt.file.write(outdir+an_content.HTMLFileName, 
					html_template({
						'comp_info': comp_info, 
						'edge_runtime': edge_runtime,
						'edge': {
							include: edge_include_filename,
							css: edge_runtime_css,
							//main: edge_main_js,
							load: edge_load_comp,
							//actions: edge_actions_js
						},
						footerExtra: options.footerExtra,
						headExtra: options.headExtra,
						'options': options,
					})
				);
				grunt.file.write(outdir+project_prefix+'_edge.js', js_out_with_closure);

				grunt.file.mkdir(outdir+'edge_includes');
				grunt.file.copy(src_basedir+edge_include_filename, outdir+edge_include_filename);

				edgeParser.dirs.forEach(function(dir){
					grunt.file.mkdir(outdir+dir);
				});

				edgeParser.images.forEach(function(file){
					grunt.file.copy(src_basedir+file, outdir+file);
				});

			});

			next();

		}, function (err) {
			if (err) {
				grunt.warn(err);
			}
			done();
		});
	});

	function get_data_uri(filename){
		var data_uri = 'data:';
		var file = grunt.file.read(filename, {encoding: null});
		switch (path.extname(filename).toLowerCase()) {
			case '.png':
				data_uri += 'image/png';
				//data_uri += ';base64,'+file.toString('base64');
				break;
			case '.jpg':
			case '.jpeg':
				data_uri += 'image/jpeg';
				//data_uri += ';base64,'+file.toString('base64');
				break;
			case '.svg':
				data_uri += 'image/svg+xml';
				//data_uri += ';utf8,'+encodeURIComponent(file.toString('utf8'));
				break;
			default:
				grunt.fail("Unknown filetype! "+path.extname(filename).toLowerCase());
		}
		data_uri += ';base64,'+file.toString('base64');
		return data_uri;
	}

	function compress_actions(func){
		var funcDefn = TOSOURCE(func);
		try {
			funcDefn = funcDefn.replace(/^function\s*\(/, 'function a(');//hack to make uglify not choke at anonymous func
			//funcDefn = UglifyJS.minify(funcDefn, {fromString:true}).code;
			funcDefn = UglifyJS.parse(funcDefn);
			funcDefn.figure_out_scope();
			funcDefn = funcDefn.print_to_string().replace(/^function a\(/, 'function(');
		} catch (e) { 
			grunt.warn("Error parsing action function: "+e); 
		}

		return funcDefn;
	}

};
