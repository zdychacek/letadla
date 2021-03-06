'use strict';

var InitDB = require('./initDB');

module.exports = function (grunt) {
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	var appConfig = {
		app: 'public',
		dist: 'dist'
	};

	var nodemonIgnoredFiles = [
		'Gruntfile.js',
		'node-inspector.js',
		'/.git/',
		'/public/',
		'/dist/'
	];

	grunt.initConfig({
		appConfig: appConfig,
		watch: {
			options: {
				livereload: true
			},
			scripts: {
				files: [
					'**/*.js',
					'!node_modules/**/*.js',
					'!public/components/**/*.js'
				],
				tasks: [/*'jshint'*/]
			},
			css: {
				files: [
					'<%= appConfig.app %>/css/**/*.css',
				]
			},
			less: {
				files: [
					'<%= appConfig.app %>/less/**/*.less'
				],
				tasks: ['less']
			},
			images: {
				files: [
					'<%= appConfig.app %>/images/**/*.{png,jpg,jpeg,webp}'
				]
			},
			html: {
				files: [
					'<%= appConfig.app %>/*.html',
					'<%= appConfig.app %>/app/**/*.html',
				]
			},
			jade: {
				files: [
					'<%= appConfig.app %>/*.jade',
					'<%= appConfig.app %>/app/**/*.jade'
				],
				tasks: ['jade']
			},
			latex: {
				files: [
					'tex/diplomka.tex',
					'tex/Figures/**/*',
				],
				tasks: ['latex']
			}
		},
		clean: {
			dist: {
				files: [{
					dot: true,
					src: [
						'<%= appConfig.dist %>/*',
						'!<%= appConfig.dist %>/.git*'
					]
				}]
			},
			generated_views: {
				src: [
					'<%= appConfig.app %>/*.html',
					'<%= appConfig.app %>/app/**/*.html'
				]
			}
		},
		jshint: {
			options: {
				'node': true,
				'browser': true,
				'esnext': true,
				'bitwise': true,
				//'camelcase': true,
				'curly': true,
				'eqeqeq': true,
				'latedef': true,
				'newcap': true,
				'noarg': true,
				'quotmark': 'single',
				'regexp': true,
				'undef': true,
				'strict': true,
				'smarttabs': true,
				'laxcomma': true,
				'globals': {
					'jQuery': true,
					'angular': true,
					'define': true,
					'io': true
				},
				'-W087': true,
				'-W064': true,
				// type coersion
				'-W116': true,
				'-W030': true,
				// W093: Did you mean to return a conditional instead of an assignment?
				'-W093': true,
				// W124: A generator function shall contain a yield statement.
				'-W124': true
			},
			all: [
				'**/*.js',
				'!node_modules/**/*.js',
				'!public/components/**/*.js'
			]
		},
		rev: {
			dist: {
				files: {
					src: [
						'<%= appConfig.dist %>/css/{,*/}*.css',
						'<%= appConfig.dist %>/images/{,*/}*.{png,jpg,jpeg,gif,webp}'
					]
				}
			}
		},
		cssmin: {
			dist: {
				files: {
					'<%= appConfig.dist %>/css/app.css': '<%= appConfig.app %>/css/app.css'
				}
			}
		},
		htmlmin: {
			dist: {
				options: {
					/*removeCommentsFromCDATA: true,
					// https://github.com/appConfig/grunt-usemin/issues/44
					//collapseWhitespace: true,
					collapseBooleanAttributes: true,
					removeAttributeQuotes: true,
					removeRedundantAttributes: true,
					useShortDoctype: true,
					removeEmptyAttributes: true,
					removeOptionalTags: true*/
				},
				files: [{
					expand: true,
					cwd: '<%= appConfig.app %>',
					src: '*.html',
					dest: '<%= appConfig.dist %>'
				}]
			}
		},
		// Put files not handled in other tasks here
		copy: {
			dist: {
				files: [{
					expand: true,
					dot: true,
					cwd: '<%= appConfig.app %>',
					dest: '<%= appConfig.dist %>',
					src: [
						'*.{ico,txt}',
						'images/**/*.{webp,gif}',
						'components/**/*',
						'**/*.html'
					]
				}]
			}
		},
		concurrent: {
			nodemon: {
				options: {
					logConcurrentOutput: true,
				},
				tasks: [
					'nodemon:nodeInspector',
					'nodemon:dev',
					'watch'
				]
			},
			dist: [
				'less:dist',
				'htmlmin'
			]
		},
		bower: {
			options: {
				exclude: ['modernizr']
			}
		},
		uglify: {
			options: {
				mangle: {
					sort: true,
					toplevel: false,
					eval: true,
					except: ['jQuery', 'angular'],
				},
				compress: true,
				report: 'min',
				wrap: true,
				preserveComments: false,
			},
			dist: {
				files: [{
					expand: true,
					dot: true,
					cwd: '<%= appConfig.app %>/app',
					dest: '<%= appConfig.dist %>/app',
					src: '**/*.js',
				}]
			}
		},
		nodemon: {
			dev: {
				options: {
					file: 'index.js',
					nodeArgs: ['--harmony'],
					args: ['--debug'],
					watchedExtensions: [
						'js'
					],
					debug: true,
					delayTime: 1,
					ignoredFiles: nodemonIgnoredFiles,
					env: {
						PORT: '9000'
					}
				}
			},
			nodeInspector: {
				options: {
					file: 'node-inspector.js',
					watchedExtensions: [
						'js'
					],
					exec: 'node-inspector',
					ignoredFiles: nodemonIgnoredFiles
				},
			},
		},
		jade: {
			development: {
				options: {
					pretty: true
				},
				files: (function () {
					var files = grunt.file.expandMapping(['**/*.jade'], 'public/app/', {
						cwd: 'public/app',
						rename: function (destBase, destPath) {
							return destBase + destPath.replace(/\.jade$/, '.html');
						}
					});

					// public/index.jade
					files.push({
						src: 'public/index.jade',
						dest: 'public/index.html'
					});

					return files;
				})()
			}
		},
		less: {
			development: {
				options: {
					paths: ['<%= appConfig.app %>/less']
				},
				files: {
					'<%= appConfig.app %>/css/app.css': '<%= appConfig.app %>/less/app.less',
				}
			},
			dist: {
				options: {
					paths: ['<%= appConfig.app %>/less'],
					yuicompress: true
				},
				files: {
					'<%= appConfig.app %>/css/app.css': '<%= appConfig.app %>/less/app.less',
					'<%= appConfig.app %>/css/bootstrap.css': '<%= appConfig.app %>/less/bootstrap/bootstrap.less'
				}
			}
		},

		latex: {
			options: {
				haltOnError: 'true'
			},
			src: [ 'tex/diplomka.tex' ]
		},
	});

	grunt.registerTask('insertUsers', 'Insert test users in DB.', function (env) {
		var done = this.async();

		InitDB.insertUsers(env, function () {
			var users = Array.prototype.slice.call(arguments),
				err = users.shift();

			if (err) {
				grunt.log.error(err);
			}

			done();
		});
	});

	grunt.registerTask('removeUsers', 'Remove all users from DB.', function (env) {
		var done = this.async();

		InitDB.removeUsers(env, function (err) {
			err && grunt.log.error(err);
			done();
		});
	});

	grunt.registerTask('insertFlights', 'Insert test flights.', function (count, env) {
		var done = this.async();
		count = count || 10;

		grunt.log.writeln('Inserting ' + count + ' flights...');

		InitDB.generateFlights(count, env, function (err, flights) {
			err && grunt.log.error(err);
			done();
		});
	});

	grunt.registerTask('removeFlights', 'Remove all flight from DB.', function (env) {
		var done = this.async();

		InitDB.removeFlights(env, function (err) {
			err && grunt.log.error(err);
			done();
		});
	});

	grunt.registerTask('default', [
		'jade:development',
		'less:development',
		//'jshint',
		'concurrent:nodemon'
	]);

	grunt.registerTask('build', [
		'clean:dist',
		'jshint',
		'concurrent:dist',
		'uglify:dist',
		'cssmin',
		'uglify',
		'copy'
	]);

	grunt.registerTask('tex', [
		'latex',
		'watch:latex'
	]);
};
