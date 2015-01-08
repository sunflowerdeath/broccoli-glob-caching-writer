var path = require('path')
var fs = require('fs')
var crypto = require('crypto')

var _ = require('underscore')
var Q = require('q')
var dirmatch = require('dirmatch')
var quickTemp = require('quick-temp')

/**
 * @param inputTree {Tree}
 * @param [options] {object}
 * @param [options.files] {array.<string>} List of glob patterns to specify cached files.
 */
function CachingWriter(inputTree, options) {
	this.inputTree = inputTree
	if (!options) options = {}
	if (!options.files) options.files = ['**']
	this.options = options
}

//Compares current files hash and cached hash,
//and if they are different, calls updateCache.
CachingWriter.prototype.read = function(readTree) {
	return readTree(this.inputTree).then(function(srcDir) {
		var destDir = this.destDir
		var files = dirmatch(srcDir, this.options.files)
		var absFiles = _.map(files, function(file) { return path.join(srcDir, file) })
		var hash = this.hashFiles(absFiles)
		if (hash !== this.cachedHash) {
			destDir = quickTemp.makeOrRemake(this, 'destDir')
			this.cachedHash = hash
			this.cachedResult = this.updateCache(srcDir, destDir, files)
		}
		return Q.when(this.cachedResult).then(function() { return destDir })
	}.bind(this))
}

//Calculates hash of all files
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
