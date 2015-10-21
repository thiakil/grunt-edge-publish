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
var Handlebars = require('handlebars');
var htmlparser = require("htmlparser2");
var tosource = require('tosource');
var TOSOURCE = function(object){ return tosource(object, 0, ''); };
var EdgeParser = require('../lib/edge_parser');

'use strict';

module.exports = function(grunt) {

	grunt.registerMultiTask('edge_publish', 'Node.js based publishing of Adobe Edge Animate projects', function() {
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options({
			staticPreloader: true,
			embedPreloaderImages: true,
			uglify: true,
			headExtra: false,
			footerExtra: false
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
				console.log(edge_runtime_css, edge_include_filename);

				var edge_main_js = grunt.file.read(src_basedir+project_prefix+'_edge.js');
				var edge_actions_js = grunt.file.read(src_basedir+project_prefix+'_edgeActions.js');

				try {
					edgeParser.parse(edge_main_js+edge_actions_js, edgeParser);
				} catch (e) {
					grunt.fatal(e);
				}

				var edge_load_comp = "AdobeEdge.loadComposition("+TOSOURCE(mycomp.pr)+','+TOSOURCE(edgeParser.compositions[0])+','+TOSOURCE(mycomp.op)+','+TOSOURCE(mycomp.pl)+','+TOSOURCE(mycomp.dl)+')';

				for (var dom_i=0; dom_i<comp_info.preloader.dom.length; dom_i++){
					comp_info.preloader.dom[dom_i].id = comp_info.preloader.dom[dom_i].id.replace(/-/g,'_');
					var imgname = comp_info.preloader.dom[dom_i].fill[1];
					edge_load_comp = edge_load_comp.replace(new RegExp("[\"']"+imgname+"[\"']", 'g'), 'img_'+comp_info.preloader.dom[dom_i].id);
					if (options.embedPreloaderImages){
						comp_info.preloader.dom[dom_i].fill[1] = get_data_uri(src_basedir+comp_info.preloader.dom[dom_i].fill[1]);
					}
				}

				html_template = Handlebars.compile(grunt.file.read('html_template.handlebars'));

				grunt.file.write(outdir+an_content.HTMLFileName, 
					html_template({
						'comp_info': comp_info, 
						'edge_runtime': edge_runtime,
						'edge': {
							include: edge_include_filename,
							css: edge_runtime_css,
							//main: edge_main_js,
							load: edge_load_comp.replace(/^ +/mg, '').replace(/\r?\n/gm, ''),
							//actions: edge_actions_js
						},
						footerExtra: options.footerExtra,
						headExtra: options.headExtra,
						'options': options,
					})
				);

				var edge_main_js_min = 'AdobeEdge.registerCompositionDefn('+TOSOURCE(edgeParser.compositions[0])+','+TOSOURCE(mycomp.definition.sy)+','+TOSOURCE(mycomp.definition.fo)+','+TOSOURCE(mycomp.definition.sc)+','+TOSOURCE(mycomp.definition.re)+','+TOSOURCE(mycomp.definition.op)+');'

				grunt.file.write(outdir+project_prefix+'_edge.js', edge_main_js_min+edge_actions_js);

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

};
