var path = require('path')
var fs = require('fs')
var crypto = require('crypto')
var quickTemp = require('quick-temp')

var _ = require('underscore')
var Q = require('q')
var multiglob = require('multiple-glob')

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

CachingWriter.prototype.read = function(readTree) {
	return Q.all(_.map(this.inputTrees, readTree)).then(function(srcDirs) {
		var destDir = this.destDir
		var hash = this.hashDirs(srcDirs)
		if (hash !== this.cachedHash) {
			destDir = quickTemp.makeOrRemake(this, 'destDir')
			this.cachedHash = hash
			var srcArg = srcDirs.length ? srcDirs : srcDirs[0]
			this.cachedResult = this.updateCache(srcArg, destDir)
		}
		return Q.when(this.cachedResult).then(function() { return destDir })
	}.bind(this))
}

/**
 * Calculates hash of all files mathing globs in srcDirs.
 * @param srcDirs {array.<string>}
 */
CachingWriter.prototype.hashDirs = function(srcDirs) {
	var files = _.flatten(_.map(srcDirs, function(srcDir) {
		var files = multiglob.sync(this.options.files, {
			cwd: srcDir,
			nodir: true,
			nomatch: true
		})
		return _.map(files, function(file) {
			return path.join(srcDir, file)
		})
	}, this))

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