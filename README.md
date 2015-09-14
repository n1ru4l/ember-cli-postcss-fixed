# ember-cli-postcss-fixed

This is a modification of https://www.npmjs.com/package/ember-cli-postcss

It adds functionality for multiple file processing.

Use [postcss](https://github.com/postcss/postcss) to process your `css` with a large selection of JavaScript plug-ins.

## Installation

```shell
npm install --save-dev ember-cli-postcss-fixed
```

## Usage



### Configuring Plug-ins

There are two steps to setting up [postcss](https://github.com/postcss/postcss) with `ember-cli-postcss`:

1. install and require the node modules for any plug-ins
2. provide the node module and plug-in options as a `postcssOptions` object in the Brocfile

The `postcssOptions` object should have a property `plugins`, which is an array of objects that contain a `module` property and an `options` property:

```javascript
postcssOptions: {
  plugins: [
    {
      module: <module>,
      options: {
        ...
      }
    }
  ]
}
```

## Example

Install the autoprefixer plugin:

```shell
npm i --save-dev autoprefixer
```

Specify some plugins in your ember-cli-build.js:

```javascript
var EmberApp = require('ember-cli/lib/broccoli/ember-app');
var autoprefixer = require('autoprefixer');

var app = new EmberApp({
  postcssOptions: {
    plugins: [
      {
        module: autoprefixer,
        options: {
          browsers: ['last 2 version']
        }
      }
    ]
  }
});

module.exports = app.toTree();
```


### Processing multiple files
If you need to process multiple files, it can be done by [configuring the output paths](http://www.ember-cli.com/user-guide/#configuring-output-paths) in your ember-cli-build.js:
```javascript
	var app = new EmberApp({
  outputPaths: {
    app: {
      css: {
        'app': '/assets/application-name.css',
        'themes/alpha': '/assets/themes/alpha.css'
      }
    }
  }
});

```