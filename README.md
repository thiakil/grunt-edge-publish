# grunt-edge-publish

> Node.js based publishing of Adobe Edge Animate projects

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-edge-publish --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-edge-publish');
```

## The "edge_publish" task

### Overview
In your project's Gruntfile, add a section named `edge_publish` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  edge_publish: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

####options.conditionalEdgeLibrary
Type: `Boolean`
Default value: `true`

Use a cut-down version of the Edge runtime that doesn't include tweens that you don't use. Can save file size when you need to include the runtime with your composition.

####options.staticPreloader
Type: `Boolean`
Default value: `true`

Similar to the Edge option that outputs a basic HTML skeleton in the HTML output file. This one acts as a preloader for basic background images.
TODO: Example

####options.embedPreloaderImages
Type: `Boolean`
Default value: `true`

Embed any preloader images as data-uri encoded strings. Preloader can show straight away. ***increases file size slightly***.

####options.uglify
Type: `Boolean`
Default value: `true`

Compress the resulting composition JS with uglify. Reduced file size.

####options.embedCompInHtml
Type: `Boolean`
Default value: `false`

Place the composition definition inside the HTML. Usually it is a separate file named `project_edge.js` where `project` is your project's prefix. Saves a HTTP request, not much benefit and could potentially cause problems.

####options.htmlTemplate:
Type: `String`
Default value: `default_template.handlebars`

Override the Handlebars HTML template used to make the final HTML file. Copy `default_template.handlebars` and modify to your heart's desire.

####options.minify:
Type: `Object | Boolean`
Default value: `Object`

If an object is supplied it will apply custom minification to the composition JS.

#####options.minify.eid
Type: `Boolean`
Default value: `true`

Shorten IDs used on timeline elements. These can grow rather large. This option starts them from zero again.

#####options.minify.colors
Type: `Boolean`
Default value: `true`

Edge uses rgba(x,x,x,y) for mostly everything, but it understands all the varities. This can shorten some colours to their HEX annotation, even the 3 letter variety (e.g. `#fff`).

#####options.minify.numbers
Type: `Boolean`
Default value: `true`

Numbers in strings are turned into plain numbers. `0.00` is trimmed to `0`.

#####options.minify.zeros
Type: `Boolean`
Default value: `true`

Removes units from 0 values. `0px` to `0`, etc.

#####options.minify.strings
Type: `Boolean`
Default value: `true`

Many strings are used multiple times. This option will replace them with a variable when it will save space.


### Usage Examples

#### Default Options
In this example, the default options are used to do something with whatever. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result would be `Testing, 1 2 3.`

```js
grunt.initConfig({
  edge_publish: {
    options: {},
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
});
```

#### Custom Options
In this example, custom options are used to do something else with whatever else. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result in this case would be `Testing: 1 2 3 !!!`

```js
grunt.initConfig({
  edge_publish: {
    options: {
      separator: ': ',
      punctuation: ' !!!',
    },
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
