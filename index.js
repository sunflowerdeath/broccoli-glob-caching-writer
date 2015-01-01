var path = require('path')
var fs = require('fs')
var crypto = require('crypto')
var quickTemp = require('quick-temp')

var _ = require('underscore')
var Q = require('q')
var dirmatch = require('dirmatch')

/**
 * @param inputTrees {array.<Tree>|Tree} Input tree or list of input trees.
 * @param [options] {object}
 * @param [options.files] {array.<string>} List of glob patterns to specify cached files.
 */
function CachingWriter(inputTrees, options) {
	this.inputTrees = _.isArray(inputTrees) ? inputTrees : [inputTrees]
	if (!options) options = {}
	if (!options.files) options.files = ['**']
	this.options = options
}

var promiseSeries = function(arr, fn) {
  var ready = Q()
  var result = []
  _.each(arr, function(item) {
		ready = ready
			.then(function() { return fn(item) })
			.then(function(res) { result.push(res) })
  })
  return ready.then(function() { return result })
}

CachingWriter.prototype.read = function(readTree) {
	return promiseSeries(this.inputTrees, readTree).then(function(srcDirs) {
		var destDir = this.destDir
		var files = this.findFiles(srcDirs)
		var hash = this.hashFiles(files)
		if (hash !== this.cachedHash) {
			destDir = quickTemp.makeOrRemake(this, 'destDir')
			this.cachedHash = hash
			var srcArg = srcDirs.length ? srcDirs : srcDirs[0]
			this.cachedResult = this.updateCache(srcArg, destDir, files)
		}
		return Q.when(this.cachedResult).then(function() { return destDir })
	}.bind(this))
}

//Finds all files mathing globs in srcDirs
CachingWriter.prototype.findFiles = function(srcDirs) {
	return _.flatten(_.map(srcDirs, function(srcDir) {
		var files = dirmatch(srcDir, this.options.files, {
			nodir: true,
			nomatch: true
		})
		return _.map(files, function(file) {
			return path.join(srcDir, file)
		})
	}, this))
}

//Calculates hash of all files.
CachingWriter.prototype.hashFiles = function(files) {
	var keys = []
	_.each(files, function(file) {
		var stats = fs.statSync(file)
		keys.push(stats.mtime.getTime(), stats.size)
	})
	return crypto.createHash('md5').update(keys.join('')).digest('hex')
}

/**
 * This method creates build results, it must be implemented by inherited class.
 * It is called only when files in input tree are changed.
 * @param srcDirs {string|array.<string>} Path or list of paths of src dirs.
 * @param destDir {string} Path of dest dir.
 */
CachingWriter.prototype.updateCache = function() {
	throw new Error('You must implement method "updateCache"')
}

CachingWriter.prototype.cleanup = function () {
	quickTemp.remove(this, 'destDir')
}

module.exports = CachingWriter
