# broccoli-glob-caching-writer

Similar to [broccoli-caching-writer](https://github.com/rwjblue/broccoli-caching-writer)
but allows to specify files that need to be cached using glob patterns.

## Install

```
npm install broccoli-glob-caching-writer
```

## Usage

```js
var CachingWriter = require('broccoli-glob-caching-writer')

var MyWriter = function(inputTree, options) {
  CachingWriter.apply(this, arguments)
}
MyWriter.prototype = Object.create(CachingWriter.prototype)
MyWriter.prototype.updateCache = function(srcDirs, destDir) {
  //create result files
}


var tree = new MyWriter('inputTree', {
	files: ['**/*.js']
})
```

## API

### CachingWriter(inputTree, [options])

Constructor.

#### inputTree

Type: `Tree`

Input broccoli tree.

#### options

Type: `object`

Object with options.

#### options.files

Type: `array.<string>`

List of glob patterns to specify files that need to be cached.

Patterns that begin with `!` will exclude files.
Patterns are processed in order, so inclusion and exclusion order is significant.


### CachingWriter.prototype.updateCache(srcDir, destDir, cachedFiles)

This method creates build results, it must be implemented in inherited class.
It is called only when files in input tree are changed.

If you want to perform async operations, return a promise from this method.

#### srcDir

Type: `string`

Path of the `inputTree`.

#### destDir

Type: `string`

Path of directory for result files.

#### cachedFiles

Type: `array.<string>`

Array of cached files paths.
Paths are relative to the `inputTree`.

## License

Public domain, see the `LICENCE.md` file.

