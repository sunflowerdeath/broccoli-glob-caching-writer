var assert = require('assert')
var fs = require('fs-extra')
var path = require('path')
var sinon = require('sinon')
var broccoli = require('broccoli')

var CachingWriter = require('..')

describe('CachingWriter', function() {
	var ORIG_DIR = path.join(__dirname, 'files')
	var DIR = path.join(__dirname, 'files-copy')
	var builder

	var createWriter = function() {
		var Writer = function(inputTree, options) {
			if (!(this instanceof Writer)) return new Writer(inputTree, options)
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
		it('is called with srcDir', function() {
			var Writer = createWriterWithSpy()
			var tree = Writer(DIR)
			builder = new broccoli.Builder(tree)
			return builder.build()
				.then(function() {
					var srcDir = tree.updateCache.getCall(0).args[0]
					assert.deepEqual(srcDir, DIR)
				})
		})

		it('is called with destDir as second arg', function() {
			var Writer = createWriterWithSpy()
			var tree = Writer(DIR)
			builder = new broccoli.Builder(tree)
			return builder.build()
				.then(function() {
					var destDir = tree.updateCache.getCall(0).args[1]
					assert(destDir.match('dest_dir'))
				})
		})

		it('is called with cachedFiles as third arg', function() {
			var Writer = createWriterWithSpy()
			var tree = Writer(DIR)
			builder = new broccoli.Builder(tree)
			return builder.build()
				.then(function() {
					var files = tree.updateCache.getCall(0).args[2]
					assert.deepEqual(files, ['file.css', 'file.js'])
				})
		})

		it('files written to the destDir will be in the final output', function() {
			var FILE = 'file'
			var TEXT = 'text'

			var Writer = createWriter()
			Writer.prototype.updateCache = function(srcDir, destDir) {
				fs.writeFileSync(path.join(destDir, FILE), TEXT)
			}

			var tree = Writer(DIR)
			builder = new broccoli.Builder(tree)
			return builder.build()
				.then(function(result) {
					var text = fs.readFileSync(path.join(result.directory, FILE))
					assert.equal(TEXT, text)
				})
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
