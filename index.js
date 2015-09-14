var checker = require('ember-cli-version-checker');
var path = require('path');
var mergeTrees = require('broccoli-merge-trees');
var merge = require('merge');
var fs = require('fs');
var lost = require('lost');

var mkdirp = require('mkdirp');
var assign = require("object-assign");
var CachingWriter = require('broccoli-caching-writer');
var postcss = require('postcss');
var CssSyntaxError = require('postcss/lib/css-syntax-error');

//rip of broccoli-postcss
function PostcssCompiler (inputTrees, inputFile, outputFile, plugins, map) {
    if ( !(this instanceof PostcssCompiler) ) {
        return new PostcssCompiler(inputTrees, inputFile, outputFile, plugins, map);
    }

    if ( !Array.isArray(inputTrees) ) {
        throw new Error('Expected array for first argument - did you mean [tree] instead of tree?');
    }

    CachingWriter.call(this, inputTrees, inputFile);

    this.inputFile = inputFile;
    this.outputFile = outputFile;
    this.plugins = plugins || [];
    this.map = map || {};
    this.warningStream = process.stderr;
}

PostcssCompiler.prototype = Object.create(CachingWriter.prototype);
PostcssCompiler.prototype.constructor = PostcssCompiler;

PostcssCompiler.prototype.updateCache = function (includePaths, destDir) {
    var toFilePath = path.join(destDir, this.outputFile);
    var fromFilePath = path.join(includePaths[0], this.inputFile);

    if ( !this.plugins || this.plugins.length < 1 ) {
        throw new Error('You must provide at least 1 plugin in the plugin array');
    }

    var processor = postcss();
    var css = fs.readFileSync(fromFilePath, 'utf8');
    var options = {
        from: fromFilePath,
        to: toFilePath,
        map: this.map
    };

    this.plugins.forEach(function (plugin) {
        var pluginOptions = assign(options, plugin.options || {});
        processor.use(plugin.module(pluginOptions));
    });

    var warningStream = this.warningStream;

    return processor.process(css, options)
        .then(function (result) {
            result.warnings().forEach(function (warn) {
                warningStream.write(warn.toString());
            });

            mkdirp.sync(path.dirname(toFilePath));
            fs.writeFileSync(toFilePath, result.css);
        })
        .catch(function (error) {
            if ( 'CssSyntaxError' === error.name ) {
                error.message += "\n" + error.showSourceCode();
            }

            throw error;
        });
};
//end of rip


// PostCSSPlugin constructor
function PostCSSPlugin(optionsFn) {
	this.name = 'ember-cli-postcss';
	this.optionsFn = optionsFn;
	//this.plugins = options.plugins;
	//this.map = options.map;
}

PostCSSPlugin.prototype.toTree = function(tree, inputPath, outputPath, inputOptions) {
	var options = merge({}, this.optionsFn(), inputOptions);
	var inputTrees = [tree];

	if (options.includePaths) {
		inputTress = inputTrees.concat(options.includePaths);
	}

    var trees = Object.keys(options.outputPaths).reduce(function(trees, file) {
        var input;
        if (options.extension) {
            input = path.join('.', inputPath, file + '.' + options.extension);
        } else {
            input = tryFile(file + '.css') || tryFile(file + '.css');
        }

        var output = options.outputPaths[file];
        if (input) {
            trees.push(new PostcssCompiler(inputTrees, input, output, options.plugins, options.map));
        }
        return trees;
    }, []);

    function tryFile(file) {
        var filePath = path.join('.', inputPath, file);
        return fs.existsSync(filePath) ? filePath : false;
    }

    return mergeTrees(trees);
};

module.exports = {
	name: 'Ember CLI Postcss Fork by Laurin Quast <laurinquast@googlemail.com>',
	shouldSetupRegistryInIncluded: function() {
		return !checker.isAbove(this, '0.2.0');
	},
    postcssOptions: function(){
        var env  = process.env.EMBER_ENV;
        var options = (this.app && this.app.options.postcssOptions) || {};
        var envConfig = this.project.config(env).sassOptions;
        if (envConfig) {
            console.warn("Deprecation warning: PostcssOptions should be moved to your ember-cli-build");
            merge(options, envConfig);
        }

        if (options.map) {
            // we need to embed the sourcesContent in the source map until libsass has better support for broccoli-sass
            options.map = true;
        }
		options.plugins = options.plugins || [];
        
		options.outputFile = options.outputFile || this.project.name() + '.css';

        return options;
    },
    setupPreprocessorRegistry: function(type, registry) {
        registry.add('css', new PostCSSPlugin(this.postcssOptions.bind(this)));
    },
	included: function included(app) {
		this.app = app;
		this._super.included.apply(this, arguments);

		if (this.shouldSetupRegistryInIncluded()) {
			this.setupPreprocessorRegistry('parent', app.registry);
		}
	}
};
