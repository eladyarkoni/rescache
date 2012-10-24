/*
* Name: jquery.rescache.js
* Description: resource caching api
* Author: Elad Yarkoni
* Version: 1.0.0
*
*
*
*/
(function($){

	// prevent duplication
	$.rescache = $.rescache || {};
	if ( $.rescache.version ) {
		return;
	}

	/*
	*	Settings
	*
	*/
	var settings = {
		resourceSelector: "[res-cache='true']",
		cachedir: 'rescache',
		defaultQuota: 1024 * 1024 * 1000
	};

	/*
	*	Privates
	*
	*/

	var _fsHandler = null;
	var _fsRoot = null;

	var error = function(err) {
		console.log(err);
	};

	var filename = function(path) {
		return path.split("/").join("_");
	};

	var init = function(callback, errorCallback) {
		var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
		var storageInfo = window.storageInfo || window.webkitStorageInfo;
		if ((typeof(requestFileSystem) === 'undefined') || (typeof(storageInfo) === 'undefined')) {
			errorCallback("rescache: webkit fileAPI error");
			return;
		}
		var quota = settings.defaultQuota;
		var onInitFs = function(fs) {
			_fsHandler = fs;
			fs.root.getDirectory(settings.cachedir, {create: true}, function(dirEntry) {
				_fsRoot = dirEntry;
				callback();
			}, error);
		};

		storageInfo.requestQuota(window.PERSISTENT, quota,function(grantedBytes){
			requestFileSystem(window.PERSISTENT, grantedBytes, onInitFs, error);
		}, error);
	};

	var fetch = function(res, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', res, true);
		xhr.responseType = 'arraybuffer';
		xhr.addEventListener('load', function() {
			callback(res, xhr.response);
		});
		xhr.addEventListener('error', error);
		xhr.send();
	};

	var cache = function(res, data) {
		_fsRoot.getFile(filename(res), {create: true}, function(fileEntry) {
			var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
			var bb = new BlobBuilder();
			bb.append(data);
			fileEntry.createWriter(function(writer){
				writer.write(bb.getBlob());
			});
		}, error);
	};

	var getFileFromCache = function(res, inCacheCallback, notInCacheCallback) {
		var cachePath = filename(res);
		_fsRoot.getFile(cachePath, {create: false}, function(fileEntry) {
			inCacheCallback(fileEntry.toURL());
		}, notInCacheCallback);
	};

	/*
	*	Publics
	*
	*/
	$.extend($.rescache, {

		version: '1.0.0',

		settings: function(data) {
			if (typeof(data) !== 'undefined') {
				for (var key in data) {
					settings[key] = data[key];
				}
			}
		},

		prefetch: function(el) {
			var $el = $(el);
			var elSource = $el.attr("src");
			var elStyleImage = $el.css("background-image");
			if (elSource) {
				getFileFromCache(elSource, function(path){
					$el.attr("src", path);
				},function() {
					fetch(elSource, cache);
				});
			} else if (elStyleImage) {
				elStyleImage = elStyleImage.replace('url(','').replace(')','');
				getFileFromCache(elStyleImage, function(path){
					$el.css("background-image", 'url('+path+')');
				},function(){
					fetch(elStyleImage, cache);
				});
			}
		},

		prefetchAll: function() {
			var prefetch = this.prefetch;
			init(function(){
				$(settings.resourceSelector).each(function(){
					prefetch(this);
				});
			}, function(err){
				console.log(err);
			});
		}

	});

})(jQuery);