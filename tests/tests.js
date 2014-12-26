var assert = require('assert')
var path = require('path')
var sinon = require('sinon')
var fs = require('fs-extra')
var broccoli = require('broccoli')

var CachingWriter = require('../index.js')

describe('CachingWriter', function() {
	var ORIG_DIR = path.join(__dirname, 'files')
	var DIR = path.join(__dirname, 'files-copy')
	var builder

	var createWriter = function() {
		var Writer = function(inputTrees, options) {
			if (!(this instanceof Writer)) return new Writer(inputTrees, options)
			CachingWriter.apply(this, arguments)
		}
		Writer.prototype = Object.create(CachingWriter.prototype)
		return Writer
	}

	var createWriterWithSpy = function() {
		var Writer = createWriter()
		Writer.prototype.updateCache = sinon.spy()
		return Writer
	}

	beforeEach(function() {
		fs.copySync(ORIG_DIR, DIR)
	})

	afterEach(function() {
		if (builder) builder.cleanup()
		fs.removeSync(DIR)
	})

	it('throws error if updateCache not overriden', function(done) {
		var Writer = createWriter()
		var tree = new Writer(DIR)
		builder = new broccoli.Builder(tree)
		builder.build()
			.then(function() { done(true) })
			.catch(function() { done() })
	})

	it('calls updateCache when there is no cache', function() {
		var Writer = createWriterWithSpy()
		var tree = Writer(DIR)
		builder = new broccoli.Builder(tree)
		return builder.build()
			.then(function() { assert(tree.updateCache.calledOnce) })
	})

	it('does not call updateCache when files are not changed', function() {
		var Writer = createWriterWithSpy()
		var tree = Writer(DIR)
		builder = new broccoli.Builder(tree)
		return builder.build()
			.then(function() { return builder.build() })
			.then(function() { assert(tree.updateCache.calledOnce) })
	})

	it('calls updateCache when file is changed', function() {
		var Writer = createWriterWithSpy()
		var tree = Writer(DIR)
		builder = new broccoli.Builder(tree)
		return builder.build()
			.then(function() {
				fs.writeFileSync(path.join(DIR, 'file.js'), 'changed', 'utf8')
			})
			.then(function() { return builder.build() })
			.then(function() { assert(tree.updateCache.calledTwice) })
	})

	it('calls updateCache when file is added', function() {
		var Writer = createWriterWithSpy()
		var tree = Writer(DIR)
		builder = new broccoli.Builder(tree)
		return builder.build()
			.then(function() {
				fs.writeFileSync(path.join(DIR, 'newfile.js'), 'new file', 'utf8')
			})
			.then(function() { return builder.build() })
			.then(function() { assert(tree.updateCache.calledTwice) })
	})

	it('calls updateCache when file is removed', function() {
		var Writer = createWriterWithSpy()
		var tree = Writer(DIR)
		builder = new broccoli.Builder(tree)
		return builder.build()
			.then(function() {
				fs.unlinkSync(path.join(DIR, 'file.js'))
			})
			.then(function() { return builder.build() })
			.then(function() { assert(tree.updateCache.calledTwice) })
	})
	
	describe('updateCache', function() {
		xit('is called with single srcDir when single inputTree was provided', function() {
		})

		xit('is called with array of srcDirs when array of inputTrees was provided',
		function() {
		})

		xit('is called with destDir', function() {
		})

		xit('files written to the destDir will be in the final output', function() {
		})
	})
	
	describe('Glob patterns', function() {
		it('calls updateCache when matching file is changed', function() {
			var Writer = createWriterWithSpy()
			var tree = Writer(DIR, { files: ['*.js'] })
			builder = new broccoli.Builder(tree)
			return builder.build()
				.then(function() {
					fs.writeFileSync(path.join(DIR, 'file.js'), 'changed', 'utf8')
				})
				.then(function() { return builder.build() })
				.then(function() { assert(tree.updateCache.calledTwice) })
		})

		it('does not call updateCache when not matching file is changed', function() {
			var Writer = createWriterWithSpy()
			var tree = Writer(DIR, { files: ['*.js'] })
			builder = new broccoli.Builder(tree)
			return builder.build()
				.then(function() {
					fs.writeFileSync(path.join(DIR, 'file.css'), 'changed', 'utf8')
				})
				.then(function() { return builder.build() })
				.then(function() { assert(tree.updateCache.calledOnce) })
		})
	})
})
