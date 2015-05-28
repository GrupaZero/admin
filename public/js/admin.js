(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

require('./core/module.js');
require('./content/module.js');
require('./user/module.js');

var dependencies = [
    'restangular',
    'ui.router',
    'ngAnimate',
    'mgcrea.ngStrap',
    'pascalprecht.translate',
    'admin.core',
    'admin.content',
    'admin.user'
];
dependencies.push.apply(dependencies, modules); // Other modules are loaded by twig

angular.module('admin', dependencies).config([
    '$stateProvider',
    '$urlRouterProvider',
    'RestangularProvider',
    '$translateProvider',
    '$translatePartialLoaderProvider',
    function($stateProvider, $urlRouterProvider, RestangularProvider, $translateProvider, $translatePartialLoaderProvider) {
        var viewPath = 'gzero/admin/views/';

        // For any unmatched url, redirect to /state1
        $urlRouterProvider.otherwise('/');

        // Now set up the states
        $stateProvider
            .state('home', {
                url: '/',
                templateUrl: viewPath + 'home.html'
            });

        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: 'gzero/{part}/lang/{lang}.json'
        });
        $translatePartialLoaderProvider.addPart('admin');

        //$translateProvider.preferredLanguage('pl_PL');
        $translateProvider.preferredLanguage('en_US');

        RestangularProvider.setBaseUrl(Config.apiUrl + '/v1');

        RestangularProvider.setDefaultHttpFields({
            cache: false,
            withCredentials: true
        });

        // Rename Restangular route field to use a $ prefix for easy distinction between data and metadata
        RestangularProvider.setRestangularFields({route: '$route'});

        // add a response intereceptor
        RestangularProvider.addResponseInterceptor(function(data, operation) {
            var extractedData;
            // .. to look for getList operations

            if (operation === 'getList') {
                // .. and handle the data and meta data
                if (typeof data.data !== 'undefined') {
                    extractedData = data.data;
                    extractedData.meta = data.meta;
                    extractedData.params = data.params;
                } else { // only one item in collection
                    extractedData = [data];
                }
            } else {
                extractedData = data;
            }

            return extractedData;
        });
    }
]).run([
    'NavBar',
    '$rootScope',
    'Restangular',
    'Notifications',
    function(NavBar, $rootScope, Restangular, Notifications) {
        NavBar.addFirst({title: 'DASHBOARD', action: 'home', icon: 'fa fa-home'});
        $rootScope.baseUrl = Config.url;

        Restangular.setErrorInterceptor(function(response, deferred, responseHandler) {
            if (response.status === 404) {
                Notifications.addError('COMMON_ERROR');
                return false; // error handled
            } else if (response.status === 500) {
                Notifications.addError(response.data.message);
            }
            Notifications.addErrors(response.data.messages);
            return false; // error not handled
        });
    }
]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/app.js","/src")

},{"./content/module.js":18,"./core/module.js":22,"./user/module.js":35,"_process":6,"buffer":2}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
    return fromTypedArray(that, object)
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = String(string)

  if (string.length === 0) return 0

  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      return string.length
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return string.length * 2
    case 'hex':
      return string.length >>> 1
    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(string).length
    case 'base64':
      return base64ToBytes(string).length
    default:
      return string.length
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/browserify/node_modules/buffer/index.js","/../../node_modules/browserify/node_modules/buffer")

},{"_process":6,"base64-js":3,"buffer":2,"ieee754":4,"is-array":5}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../../node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")

},{"_process":6,"buffer":2}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../../node_modules/browserify/node_modules/buffer/node_modules/ieee754")

},{"_process":6,"buffer":2}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/browserify/node_modules/buffer/node_modules/is-array/index.js","/../../node_modules/browserify/node_modules/buffer/node_modules/is-array")

},{"_process":6,"buffer":2}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/browserify/node_modules/process/browser.js","/../../node_modules/browserify/node_modules/process")

},{"_process":6,"buffer":2}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentAddCtrl($scope, $state, $stateParams, listParent, ContentRepository) {
    var parentId = null;
    $scope.contentType = $stateParams.type;
    // if parent category exists
    if (typeof listParent !== 'undefined') {
        $scope.listParent = listParent; // selected category
        parentId = listParent.id;
    }
    // default translations lang code
    $scope.newContent = {
        type: $stateParams.type,
        isActive: true,
        translations: {
            langCode: $scope.listLang.code
        }
    };
    // contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        newContent.parentId = parentId; // set parent category as null
        newContent.publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // set publish at date
        // if parent category exists
        if (typeof $scope.listParent !== 'undefined') {
            // check for route translation in selected language
            var route = _.pluck(_.filter($scope.listParent.route.translations, 'lang', newContent.translations.langCode), 'url');
            if (!route.length) {
                newContent.parentId = null; // if not found set as uncategorized
            }
        }
        ContentRepository.newContent(newContent).then(function(response) {
            if ($stateParams.type === 'category') {
                // when create a category then set it as a new listParent on content list
                $state.go('content.list', {contentId: response.id}, {reload: true});
            } else {
                // otherwise go to list without new listParent
                $state.go('content.list', {}, {reload: true});
            }
        });
    };
}
ContentAddCtrl.$inject = ['$scope', '$state', '$stateParams', 'listParent', 'ContentRepository'];
module.exports = ContentAddCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentAddCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentAddTranslationCtrl($scope, $state, $stateParams, ContentRepository) {
    $scope.showTeaser = false;
    // default translations lang code
    $scope.newContentTranslation = {
        contentId: $stateParams.contentId,
        langCode: $stateParams.langCode
    };
    // contents POST action
    $scope.addnewContentTranslation = function addNewContent(newContentTranslation) {
        ContentRepository.newContentTranslation($stateParams.contentId, newContentTranslation).then(function(response) {
            $state.go('content.list', {}, {reload: true});
        });
    };
}
ContentAddTranslationCtrl.$inject = ['$scope', '$state', '$stateParams', 'ContentRepository'];
module.exports = ContentAddTranslationCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentAddTranslationCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentCategoryTreeCtrl($scope, categories, openCategories, listParent, Storage) {
    /**
     * Function returns root id from provided path
     *
     * @param path to search over
     *
     * @returns {int} root id
     * @throws Error
     */
    function getRootIdFromPath(path) {
        if (path.length > 0) {
            return path[0];
        } else {
            throw new Error('Node path is too short!');
        }
    }

    /**
     * Function returns specified node form provided collection
     *
     * @param collection the collection to iterate over
     * @param id  node id
     *
     * @returns {object} returns the found element, else undefined
     */
    function getNodeById(collection, id) {
        return _.find(collection, function(category) {
            return category.id === id;
        });
    }

    // if there are open categories in the Storage
    if (typeof openCategories !== 'undefined') {
        $scope.openCategories = openCategories;
    } else {
        $scope.openCategories = [];
    }

    // if categories tree exists
    if (typeof categories !== 'undefined') {
        $scope.categories = categories;
    }

    // if parent category exists
    if (typeof listParent !== 'undefined') {
        $scope.activeNode = listParent.id;

        // merge open categories with active category path
        $scope.openCategories = _.union($scope.openCategories, listParent.path);
        $scope.root = getNodeById($scope.categories, getRootIdFromPath(listParent.path));
        // save open categories in the store
        Storage.setStorageItem({openCategories: $scope.openCategories});
    }

    // removes listParent id from storage
    $scope.uncategorized = function() {
        Storage.removeStorageItem('contentListParent');
    };

    // toggles Node in categories tree and manage Storage open categories object
    $scope.toggleNode = function(scope) {
        scope.toggle();
        var nodeId = _.parseInt(scope.$element[0].id, 10);
        // if node is open
        if (!scope.collapsed) {
            // add to scope
            $scope.openCategories.push(nodeId);
        } else {
            // remove from scope
            $scope.openCategories = _.without($scope.openCategories, nodeId);
        }
        // save in the store
        Storage.setStorageItem({openCategories: $scope.openCategories});
    };

}
ContentCategoryTreeCtrl.$inject = ['$scope', 'categories', 'openCategories', 'listParent', 'Storage'];
module.exports = ContentCategoryTreeCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentCategoryTreeCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDashboardCtrl($scope) {

}
ContentDashboardCtrl.$inject = ['$scope'];
module.exports = ContentDashboardCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDashboardCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDeleteCtrl($scope, $state, $modal, Storage, ContentRepository, Notifications) { // jshint ignore:line
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Delete modal
    vm.deleteModal = {
        /**
         * Function initiates the AngularStrap modal
         *
         * @param title translatable title of modal
         * @param message translatable messages of modal
         */
        initModal: function(title, message) {
            var self = this;
            self.modal = $modal({
                scope: $scope,
                title: title,
                content: message,
                template: viewPath + 'contentDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be removed, it is saved in the scope
         * @param contentType content type
         */
        showModal: function(contentId, contentType) {
            var self = this;
            vm.contentId = contentId;
            vm.contentType = contentType;
            // check for children
            ContentRepository.children(contentId).then(function(response) {
                if (ContentRepository.clean(response).length === 0) {
                    self.initModal('PLEASE_CONFIRM', 'DELETE_CONTENT_QUESTION');
                } else {
                    vm.hideSubmitButton = true;
                    self.initModal('INFORMATION', 'DELETE_NOT_EMPTY_CATEGORY_INFO');
                }
            });
        },
        /**
         * Function close the modal
         *
         */
        closeModal: function() {
            var self = this;
            self.modal.hide();
        },
        /**
         * Function performs the RestAngular DELETE action for content id in scope
         *
         */
        deleteContent: function() {
            var self = this;
            ContentRepository.deleteContent(vm.contentId).then(function(response) {
                self.closeModal();
                // refresh current state
                if (vm.contentType === 'category') {
                    // removed category
                    Storage.removeStorageItem('contentListParent');
                    $state.go('content.list', {contentId: null}, {reload: true, inherit: false});
                    Notifications.addSuccess('CATEGORY_HAS_BEEN_DELETED');
                } else {
                    // removed content
                    if ($state.$current.name === 'content.show') {
                        $state.go('content.list', {contentId: null}, {reload: true, inherit: false});
                    } else {
                        $state.go($state.current, {}, {reload: true});
                    }
                    Notifications.addSuccess('CONTENT_HAS_BEEN_DELETED');
                }

            });
        }
    };
}
ContentDeleteCtrl.$inject = ['$scope', '$state', '$modal', 'Storage', 'ContentRepository', 'Notifications'];
module.exports = ContentDeleteCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDeleteCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDetailsCtrl($scope, $stateParams, ContentRepository, Notifications) {
    // get single content
    ContentRepository.one($stateParams.contentId).then(function(response) {
        $scope.content = ContentRepository.clean(response);
    });

    $scope.saveContent = function() {
        ContentRepository
            .updateContent($scope.content.id, $scope.content)
            .then(function() {
                Notifications.addSuccess('SAVED');
            });
    };

}
ContentDetailsCtrl.$inject = ['$scope', '$stateParams', 'ContentRepository', 'Notifications'];
module.exports = ContentDetailsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDetailsCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentListCtrl($scope, $stateParams, listParent, ContentRepository, NgTableParams) {
    // if parent category exists
    if (typeof listParent !== 'undefined') {
        $scope.listParent = listParent; // selected category
    }

    //  ngTable configuration
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'translations.title': 'asc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.listLang.code,
                type: 'content'
            };

            // params.count() - number of items per page declared in view
            if (typeof $stateParams.perPage !== 'undefined') {
                params.count($stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof $stateParams.page !== 'undefined') {
                params.page($stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // $stateParams - filters without contentId
            var filters = _.omit($stateParams, 'contentId');
            queryOptions = _.merge(queryOptions, filters);
            $scope.activeFilter = filters;

            // get list by default
            var promise = ContentRepository.list(queryOptions);

            // if parent category is not selected
            if (typeof listParent === 'undefined') {
                // get uncategorized
                queryOptions.level = 0;
            } else {
                // get children's
                promise = ContentRepository.children(listParent.id, queryOptions);
            }

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(ContentRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}
ContentListCtrl.$inject = ['$scope', '$stateParams', 'listParent', 'ContentRepository', 'ngTableParams'];
module.exports = ContentListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentListCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentRouteCtrl($scope, $state, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Delete modal
    vm.editRouteModal = {
        /**
         * Function initiates the AngularStrap modal
         *
         * @param title translatable title of modal
         */
        initModal: function(title) {
            var self = this;
            self.modal = $modal({
                scope: $scope,
                title: title,
                template: viewPath + 'contentEditRouteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be removed, it is saved in the scope
         * @param contentRoute content route
         * @param langCode route translation language
         */
        showModal: function(contentId, contentRoute, langCode) {
            var self = this;
            vm.contentId = contentId;
            vm.contentRoute = contentRoute.substr(contentRoute.lastIndexOf('/') + 1); // last url segment
            vm.langCode = langCode;
            self.initModal('EDIT');
        },
        /**
         * Function close the modal
         *
         */
        closeModal: function() {
            var self = this;
            self.modal.hide();
        },
        /**
         * Function performs the RestAngular DELETE action for content id in scope
         *
         */
        saveContentRoute: function() {
            var self = this;
            var newRoute = {
                langCode: vm.langCode,
                url: vm.contentRoute
            };
            ContentRepository.newContentRoute(vm.contentId, newRoute).then(function(response) {
                self.closeModal();
                $state.go($state.current, {}, {reload: true});
            });

        }
    };
}
ContentRouteCtrl.$inject = ['$scope', '$state', '$modal', 'ContentRepository'];
module.exports = ContentRouteCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentRouteCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class UserController
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentTrashcanCtrl($scope, $stateParams, ContentRepository, NgTableParams) {
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'id': 'desc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.listLang.code
            };

            // params.count() - number of items per page declared in view
            if (typeof $stateParams.perPage !== 'undefined') {
                params.count($stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof $stateParams.page !== 'undefined') {
                params.page($stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // get list by default
            var promise = ContentRepository.deleted(queryOptions);

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(ContentRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

ContentTrashcanCtrl.$inject = ['$scope', '$stateParams', 'ContentRepository', 'ngTableParams'];
module.exports = ContentTrashcanCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentTrashcanCtrl.js","/src/content/controllers")

},{"_process":6,"buffer":2}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDeleteButton() {
    return {
        restrict: 'A',
        controller: 'ContentDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, ContentDeleteCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                ContentDeleteCtrl.deleteModal.showModal(attrs.id, attrs.type);
            });
        }
    };
}

ContentDeleteButton.$inject = [];
module.exports = ContentDeleteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentDeleteButton.js","/src/content/directives")

},{"_process":6,"buffer":2}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentEditRouteButton() {
    return {
        restrict: 'A',
        controller: 'ContentRouteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, ContentRouteCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                ContentRouteCtrl.editRouteModal.showModal(attrs.id, attrs.route, attrs.lang);
            });
        }
    };
}

ContentEditRouteButton.$inject = [];
module.exports = ContentEditRouteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentEditRouteButton.js","/src/content/directives")

},{"_process":6,"buffer":2}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

angular.module('admin.content', ['ngTable', 'ui.tree'])
    .config([
        '$stateProvider',
        function($stateProvider) {
            var viewPath = 'gzero/admin/views/content/';
            // Now set up the states
            $stateProvider
                .state('content', {
                    url: '/content',
                    controller: 'ContentDashboardCtrl',
                    templateUrl: viewPath + 'index.html',
                    resolve: {
                        categories: [
                            'ContentRepository', function(ContentRepository) {
                                // get tree of all categories
                                return ContentRepository.tree({
                                    type: 'category'
                                });
                            }
                        ]
                    }
                })
                .state('content.list', {
                    url: '/list/{contentId}?isActive&page&perPage',
                    resolve: {
                        listParent: [
                            '$stateParams', 'Storage', 'ContentRepository', function($stateParams, Storage, ContentRepository) {
                                // if state param has category id
                                if ($stateParams.contentId) {
                                    Storage.setStorageItem({contentListParent: $stateParams.contentId});
                                    return ContentRepository.one($stateParams.contentId);
                                } else {
                                    // if storage has category id
                                    if (Storage.getStorageItem('contentListParent')) {
                                        $stateParams.contentId = Storage.getStorageItem('contentListParent');
                                        return ContentRepository.one(Storage.getStorageItem('contentListParent'));
                                    }
                                }
                            }
                        ],
                        openCategories: [
                            // get open categories from Storage
                            'Storage', function(Storage) {
                                return Storage.getStorageItem('openCategories');
                            }
                        ]
                    },
                    views: {
                        'content': {
                            templateUrl: viewPath + 'list.html',
                            controller: 'ContentListCtrl'
                        },
                        'quickSidebarLeft': {
                            templateUrl: viewPath + 'categories.html',
                            controller: 'ContentCategoryTreeCtrl'
                        }
                    }
                })
                .state('content.show', {
                    url: '/{contentId}/show',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'show.html',
                            controller: 'ContentDetailsCtrl'
                        }
                    }
                })
                .state('content.trashcan', {
                    url: '/trashcan',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'trashcan.html',
                            controller: 'ContentTrashcanCtrl'
                        }
                    }
                })
                .state('content.add', {
                    url: '/add/{type}',
                    resolve: {
                        listParent: [
                            'Storage', 'ContentRepository', function(Storage, ContentRepository) {
                                // if storage has category id
                                if (Storage.getStorageItem('contentListParent')) {
                                    return ContentRepository.one(Storage.getStorageItem('contentListParent'));
                                }
                            }
                        ]
                    },
                    views: {
                        'content': {
                            templateUrl: viewPath + 'add.html',
                            controller: 'ContentAddCtrl'
                        }
                    }
                })
                .state('content.addTranslation', {
                    url: '/{contentId}/add-translation/{langCode}',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'addTranslation.html',
                            controller: 'ContentAddTranslationCtrl'
                        }
                    }
                });
        }
    ])
    .controller('ContentAddCtrl', require('./controllers/ContentAddCtrl'))
    .controller('ContentDeleteCtrl', require('./controllers/ContentDeleteCtrl'))
    .controller('ContentCategoryTreeCtrl', require('./controllers/ContentCategoryTreeCtrl'))
    .controller('ContentDashboardCtrl', require('./controllers/ContentDashboardCtrl'))
    .controller('ContentDetailsCtrl', require('./controllers/ContentDetailsCtrl'))
    .controller('ContentListCtrl', require('./controllers/ContentListCtrl'))
    .controller('ContentTrashcanCtrl', require('./controllers/ContentTrashcanCtrl'))
    .controller('ContentAddTranslationCtrl', require('./controllers/ContentAddTranslationCtrl'))
    .controller('ContentRouteCtrl', require('./controllers/ContentRouteCtrl'))
    .factory('ContentRepository', require('./services/ContentRepository.js'))
    .directive('contentDeleteButton', require('./directives/ContentDeleteButton.js'))
    .directive('contentEditRouteButton', require('./directives/ContentEditRouteButton.js'))
    .run([
        'NavBar',
        function(NavBar) {
            NavBar.add(
                {
                    title: 'CONTENT',
                    action: 'content.list',
                    icon: 'fa fa-file-text-o'
                }
            );
            //NavBar.addLastChild(
            //    'CONTENT',
            //    {
            //        title: 'ALL_CONTENTS',
            //        action: 'content.list',
            //        icon: 'fa fa-th'
            //    }
            //);
            //NavBar.addLastChild(
            //    'CONTENT',
            //    {
            //        title: 'ADD_CONTENT',
            //        action: 'content.add({ type: "content" })',
            //        icon: 'fa fa-file-text-o'
            //    }
            //);
            //NavBar.addLastChild(
            //    'CONTENT',
            //    {
            //        title: 'ADD_CATEGORY',
            //        action: 'content.add({ type: "category" })',
            //        icon: 'fa fa-file-text'
            //    }
            //);
        }
    ]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/module.js","/src/content")

},{"./controllers/ContentAddCtrl":7,"./controllers/ContentAddTranslationCtrl":8,"./controllers/ContentCategoryTreeCtrl":9,"./controllers/ContentDashboardCtrl":10,"./controllers/ContentDeleteCtrl":11,"./controllers/ContentDetailsCtrl":12,"./controllers/ContentListCtrl":13,"./controllers/ContentRouteCtrl":14,"./controllers/ContentTrashcanCtrl":15,"./directives/ContentDeleteButton.js":16,"./directives/ContentEditRouteButton.js":17,"./services/ContentRepository.js":19,"_process":6,"buffer":2}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentRepository(Restangular) {
    var api = 'admin/contents';
    var contents = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        tree: function(params) {
            return Restangular.one(api).getList('tree', params);
        },
        list: function(params) {
            return contents.getList(params);
        },
        deleted: function(params) {
            return Restangular.one(api).getList('deleted', params);
        },
        children: function(id, params) {
            return Restangular.one(api, id).getList('children', params);
        },
        newContent: function(newContent) {
            return contents.post(newContent);
        },
        updateContent: function(id, content) {
            return Restangular.one(api, id).customPUT(content);
        },
        newContentTranslation: function(id, newTranslation) {
            return Restangular.one(api, id).all('translations').post(newTranslation);
        },
        newContentRoute: function(id, newRoute) {
            return Restangular.one(api, id).all('route').post(newRoute);
        },
        deleteContent: function(id) {
            return Restangular.one(api, id).remove();
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        }
    };
}

ContentRepository.$inject = ['Restangular'];
module.exports = ContentRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/services/ContentRepository.js","/src/content/services")

},{"_process":6,"buffer":2}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function CoreCtrl($scope, $state, Translations, NavBar, TopNavBar) {
    // get translations languages
    Translations.getTranslations().then(function(response) {
        $scope.langs = response.langs;
        $scope.currentLang = $scope.listLang = response.currentLang;
    });

    // admin panel language
    $scope.selectAdminLang = function() {
        Translations.selectAdminLang($scope.currentLang);
    };

    // translations language
    $scope.selectLanguage = function(lang) {
        $scope.listLang = lang;
    };

    // refresh current state
   $scope.refreshCurrentState = function() {
       $state.go($state.current, {}, {reload: true});
    };

    $scope.navBar = NavBar.getItems();
    $scope.topNavBar = TopNavBar.getItems();

    //Off canvas sidebar
    $scope.showSidebar = false;

    // toggle sidebar
    $scope.$state = $state;
}

CoreCtrl.$inject = ['$scope', '$state', 'Translations', 'NavBar', 'TopNavBar', '$state'];
module.exports = CoreCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/controllers/CoreCtrl.js","/src/core/controllers")

},{"_process":6,"buffer":2}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
angular.module('CoreFilters', [])
/**
 * Filter returns translatable string based on provided language code
 *
 * @param langCode  language code
 *
 * @returns {string} translatable string
 */
    .filter('langName', function() {
        'use strict';
        return function(langCode) {
            return 'LANG_NAME_' + angular.uppercase(langCode);
        };
    })
/**
 * Filter returns the translation in provided language
 *
 * @param translations the collection to iterate over
 * @param langCode  language code
 * @param field  field name
 *
 * @returns {object} translation field
 */
    .filter('getTranslation', function() {
        'use strict';
        return function(translations, langCode, field) {
            var currentTranslation = _.filter(translations, function(translation) {
                return translation.lang === langCode;
            }).shift();
            if (_.has(currentTranslation, field)) {
                return currentTranslation[field];
            } else {
                return null;
            }
        };
    })
/**
 * Filter checks if specified node exists in provided path
 *
 * @param path the node path to iterate over
 * @param id  node id
 *
 * @returns {bool} true or false
 */
    .filter('nodeInPath', function() {
        'use strict';
        return function(path, id) {
            // if path exists and not empty
            if (typeof path !== 'undefined' && path.length > 0) {
                return path.indexOf(id) > -1;
            } else {
                return false;
            }
        };
    })

    .filter('trustAsHtml', function($sce) {
        'use strict';
        return $sce.trustAsHtml;
    });

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/filters/CoreFilters.js","/src/core/filters")

},{"_process":6,"buffer":2}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

require('./filters/CoreFilters.js');

angular.module('admin.core', ['CoreFilters'])
    .controller('CoreCtrl', require('./controllers/CoreCtrl.js'))
    .factory('LangRepository', require('./services/LangRepository.js'))
    .factory('NavBar', require('./services/NavBar.js'))
    .factory('TopNavBar', require('./services/TopNavBar.js'))
    .factory('Notifications', require('./services/Notifications.js'))
    .factory('Translations', require('./services/Translations.js'))
    .factory('Storage', require('./services/Storage.js'))
    .run([
        'TopNavBar',
        function(TopNavBar) {
            TopNavBar.add(
                {
                    title: 'DASHBOARD',
                    action: 'home'
                }
            );
            TopNavBar.add(
                {
                    title: 'SETTINGS',
                    action: 'content.list'
                }
            );
            TopNavBar.addLastChild(
                'SETTINGS',
                {
                    title: 'ALL_CONTENTS',
                    action: 'content.list'
                }
            );
            TopNavBar.addLastChild(
                'SETTINGS',
                {
                    title: 'ADD_NEW',
                    action: 'content.add'
                }
            );
        }
    ]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/module.js","/src/core")

},{"./controllers/CoreCtrl.js":20,"./filters/CoreFilters.js":21,"./services/LangRepository.js":23,"./services/NavBar.js":24,"./services/Notifications.js":25,"./services/Storage.js":26,"./services/TopNavBar.js":27,"./services/Translations.js":28,"_process":6,"buffer":2}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function LangRepository(Restangular) {
    /**
     * Custom methods
     */
    Restangular.extendModel('langs', function(model) {
        model.test = function() {
            return 'test';
        };
        return model;
    });

    var api = Restangular.all('admin/langs');
    return {
        one: function(code) {
            return api.get(code);
        },
        list: function() {
            return api.getList();
        }
    };
}

LangRepository.$inject = ['Restangular'];
module.exports = LangRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/LangRepository.js","/src/core/services")

},{"_process":6,"buffer":2}],24:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function NavBar() {
    /** @var Navigation */
    return require('../../lib/navigation.js')();
}

module.$inject = [];
module.exports = NavBar;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/NavBar.js","/src/core/services")

},{"../../lib/navigation.js":29,"_process":6,"buffer":2}],25:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function Notifications($alert, $translate) {
    var container = 'body';
    var placement = 'top-right';
    var type = 5;
    /**
     * Function which shows messages of given type
     *
     * @param callback function used to show each message
     * @param messages messages to show
     */
    var addMessages = function(callback, messages) {
        _.forEach(messages, function(messages) {
            callback(messages[0]);
        });
    };
    return {
        /**
         * Function shows multiple AngularStrap info type alerts
         *
         * @param messages translatable messages to show
         */
        addInfos: function(messages) {
            var self = this;
            addMessages(self.addInfo, messages);
        },
        /**
         * Function shows multiple AngularStrap danger type alerts
         *
         * @param messages translatable messages to show
         */
        addErrors: function(messages) {
            var self = this;
            addMessages(self.addError, messages);
        },
        /**
         * Function shows multiple AngularStrap warning type alerts
         *
         * @param messages translatable messages to show
         */
        addWarnings: function(messages) {
            var self = this;
            addMessages(self.addWarning, messages);
        },
        /**
         * Function shows multiple AngularStrap success type alerts
         *
         * @param messages translatable messages to show
         */
        addSuccesses: function(messages) {
            var self = this;
            addMessages(self.addSuccess, messages);
        },
        /**
         * Function shows the AngularStrap info type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         */
        addInfo: function(message) {
            $alert({
                title: $translate.instant('INFORMATION') + ':',
                content: $translate.instant(message),
                container: container,
                placement: placement,
                duration: type,
                type: 'info'
            });
        },
        /**
         * Function shows the AngularStrap danger type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         */
        addError: function(message) {
            $alert({
                title: $translate.instant('ERROR') + ':',
                content: $translate.instant(message),
                container: container,
                placement: placement,
                duration: type,
                type: 'danger'
            });
        },
        /**
         * Function shows the AngularStrap warning type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         */
        addWarning: function(message) {
            $alert({
                title: $translate.instant('WARNING') + ':',
                content: $translate.instant(message),
                container: container,
                placement: placement,
                duration: type,
                type: 'warning'
            });
        },
        /**
         * Function shows the AngularStrap success type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         */
        addSuccess: function(message) {
            $alert({
                title: $translate.instant('SUCCESS') + ':',
                content: $translate.instant(message),
                container: container,
                placement: placement,
                duration: type,
                type: 'success'
            });
        }
    };
}

module.$inject = ['$alert', '$translate'];
module.exports = Notifications;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/Notifications.js","/src/core/services")

},{"_process":6,"buffer":2}],26:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function Storage() {
    var storageItems = {};
    return {
        /**
         * Function adds specified object to the storageItems
         *
         * @param object
         */
        setStorageItem: function(object) {
            storageItems =   _.merge(storageItems, object, function(objectValue, sourceValue) {
                if (_.isArray(objectValue)) {
                    return  sourceValue;
                }
            });
        },
        /**
         * Function returns the specified object from the storageItems
         *
         * @param index
         * @returns {object}
         */
        getStorageItem: function(index) {
            return storageItems[index];
        },
        /**
         * Function removes specified object from the storageItems
         *
         * @param index
         * @returns {object}
         */
        removeStorageItem: function(index) {
            storageItems = _.omit(storageItems, index);
        }
    };
}

Storage.$inject = [];
module.exports = Storage;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/Storage.js","/src/core/services")

},{"_process":6,"buffer":2}],27:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function TopNavBar() {
    /** @var Navigation */
    return require('../../lib/navigation.js')();
}

module.$inject = [];
module.exports = TopNavBar;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/TopNavBar.js","/src/core/services")

},{"../../lib/navigation.js":29,"_process":6,"buffer":2}],28:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function Translations($q, $translate, LangRepository) {
    //create deferred promise
    var deferred = $q.defer();

    //get languages
    LangRepository.list().then(function(response) {
        var languages = {};
        languages.langs = response;
        languages.currentLang = languages.listLang = response[0];

        // resolve thr promise
        deferred.resolve(languages);
    });

    return {
        /**
         * Function returns the object of languages
         *
         * @returns {object}
         */
        getTranslations: function() {
            return deferred.promise;
        },
        /**
         * Function sets the language of the translation for the angular-translate module
         *
         * @param lang object that will be used to translate
         */
        selectAdminLang: function(lang) {
            $translate.fallbackLanguage(['en_US']);
            $translate.use(lang.i18n);
        }
    };
}
Translations.$inject = ['$q', '$translate', 'LangRepository'];
module.exports = Translations;


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/Translations.js","/src/core/services")

},{"_process":6,"buffer":2}],29:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
function Navigation() {
    'use strict';

    var items = [];

    /**
     * Function checks if 'item' structure is valid
     *
     * @param item object
     * @returns {boolean}
     */
    var checkStructure = function(item) {
        if (_.has(item, 'divider')) {
            if (item.divider !== true) {
                throw new Error('Property: ' + '\'divider\'' + ' must be set to \'true\'');
            }
        } else if (!_.has(item, 'title')) {
            throw new Error('Property: ' + 'title' + ' is missing');
        } else if (!_.has(item, 'action') && !_.has(item, 'href')) {
            throw new Error('Property: ' + '\'action\' or \'href\'' + ' are required');
        }
        return true;
    };
    /**
     * Function returns children of element specified by 'title'
     *
     * @param title string
     * @returns {Array}
     */
    var getChildren = function(title) {
        var children = [],
            foundFlag = false;
        _.forEach(items, function(value, index) {
            if (value.title === title) {
                foundFlag = true;
                if (_.has(value, 'children') && Array.isArray(value.children)) {
                    children = value.children;
                }
                return false;
            }
        });
        if (foundFlag === false) {
            throw new Error('Parent: \'' + title + '\' have no children, because does not exist');
        }
        return children;
    };
    /**
     * Function adds element according to 'position' argument
     * position = 'before' - element will be added before element specified by 'title'
     * position = 'after' - element will be added after element specified by 'title'
     *
     * @param title string
     * @param item object
     * @param position string
     */
    var addBeforeAfter = function(title, item, position) {
        if (typeof position === 'undefined') {
            throw new Error('Argument \'position\' is required, values: \'before\' or \'after\'');
        } else if (typeof position !== 'string') {
            throw new Error('Argument \'position\' must be of string type, values: \'before\' or \'after\'');
        }
        if (checkStructure(item)) {
            var foundFlag = false;
            _.forEach(items, function(value, index) {
                if (value.title === title) {
                    foundFlag = true;
                    if (position === 'before') {
                        items.splice(index, 0, item);
                    } else if (position === 'after') {
                        items.splice(index + 1, 0, item);
                    }
                    return false;
                }
            });
            if (foundFlag === false) {
                throw new Error('Element: \'' + title + '\' does not exist');
            }
        }
    };
    /**
     * Function adds child link according to 'position' argument
     * position = true - child will be added as first element
     * position = false - child will be added as last element
     *
     * @param parent string
     * @param item object
     * @param position boolean
     */
    var addChild = function(parent, item, position) {
        if (typeof position === 'undefined') {
            position = false;
        } else if (typeof position !== 'boolean') {
            throw new Error('Argument \'position\' must be of boolean type');
        }
        if (checkStructure(item)) {
            var foundFlag = false;
            _.forEach(items, function(value, index) {
                if (value.title === parent) {
                    if (!_.has(value, 'children') || !Array.isArray(value.children)) {
                        value.children = [];
                    }
                    if (position === true) {
                        value.children.unshift(item);
                    } else if (position === false) {
                        value.children.push(item);
                    }
                    foundFlag = true;
                    return false;
                }
            });
            if (foundFlag === false) {
                throw new Error('Parent: \'' + parent + '\' does not exist');
            }
        }
    };
    /**
     * Function adds child link according to 'position' argument
     * position = 'before' - child will be added before element specified by 'title'
     * position = 'after' - child will be added after element specified by 'title'
     *
     * @param parent string
     * @param title string
     * @param item object
     * @param position string
     */
    var addBeforeAfterChild = function(parent, title, item, position) {
        if (typeof position === 'undefined') {
            throw new Error('Argument \'position\' is required, values: \'before\' or \'after\'');
        } else if (typeof position !== 'string') {
            throw new Error('Argument \'position\' must be of string type, values: \'before\' or \'after\'');
        }
        if (checkStructure(item)) {
            var foundFlag = false,
                children = getChildren(parent);

            if (children.length === 0) {
                throw new Error('Parent: \'' + parent + '\' have no children');
            }
            _.forEach(children, function(value, index) {
                if (value.title === title) {
                    foundFlag = true;
                    if (position === 'before') {
                        children.splice(index, 0, item);
                    } else if (position === 'after') {
                        children.splice(index + 1, 0, item);
                    }
                    return false;
                }
            });
            if (foundFlag === false) {
                throw new Error('Child: \'' + title + '\' does not exist');
            }
        }
    };

    return {
        /**
         * Function adds element to the end of menu
         *
         * @param item object
         */
        add: function(item) {
            if (checkStructure(item)) {
                items.push(item);
            }
        },
        /**
         * Function adds element to the menu as first
         *
         * @param item object
         */
        addFirst: function(item) {
            if (checkStructure(item)) {
                items.unshift(item);
            }
        },
        /**
         * Function adds element 'item' to the menu before element specified by 'title'
         *
         * @param title string
         * @param item object
         */
        addBefore: function(title, item) {
            addBeforeAfter(title, item, 'before');
        },
        /**
         * Function adds element 'item' to the menu after element specified by 'title'
         *
         * @param title string
         * @param newItem object
         */
        addAfter: function(title, newItem) {
            addBeforeAfter(title, newItem, 'after');
        },
        /**
         * Function adds child link as first to the element specified by 'parent' argument
         *
         * @param parent string
         * @param item object
         */
        addFirstChild: function(parent, item) {
            addChild(parent, item, true);
        },
        /**
         * Function adds child link as last to the element specified by 'parent' argument
         *
         * @param parent string
         * @param item object
         */
        addLastChild: function(parent, item) {
            addChild(parent, item, false);
        },
        /**
         * Function adds link to the element specified by 'parent' before child element specified by 'title'
         *
         * @param parent string
         * @param title string
         * @param item object
         */
        addBeforeChild: function(parent, title, item) {
            addBeforeAfterChild(parent, title, item, 'before');
        },
        /**
         * Function adds link to the element specified by 'parent' after child element specified by 'title'
         *
         * @param parent string
         * @param title string
         * @param item object
         */
        addAfterChild: function(parent, title, item) {
            addBeforeAfterChild(parent, title, item, 'after');
        },
        /**
         * Function return items from menu
         *
         * @returns {Array}
         */
        getItems: function() {
            return items;
        },
        /**
         * Function exports links to 'dropdown' menu
         *
         * @returns {Array}
         */
        exportToDropdownMenu: function() {
            var results = [];
            var newItem = {};
            _.forEach(items, function(value) {
                _.forIn(value, function(value, key) {
                    if (key === 'title') {
                        newItem.text = value;
                    } else {
                        newItem[key] = value;
                    }
                });
                results.push(newItem);
                newItem = {};
            });
            return results;
        }
    };
}
module.exports = Navigation;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/lib/navigation.js","/src/lib")

},{"_process":6,"buffer":2}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class UserController
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function UserListCtrl($scope, $state, UserRepository, $modal) {
    var vm = this;
    var viewPath = 'gzero/admin/views/user/directives/';
    // Delete modal
    vm.deleteModal = {
        /**
         * Function initiates the AngularStrap modal
         *
         * @param title translatable title of modal
         * @param message translatable messages of modal
         */
        initModal: function(title, message) {
            var self = this;
            self.modal = $modal({
                scope: $scope,
                title: title,
                content: message,
                template: viewPath + 'userDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param userId user id to be removed, it is saved in the scope
         */
        showModal: function(userId) {
            var self = this;
            vm.userId = userId;
            self.initModal('PLEASE_CONFIRM', 'DELETE_USER_QUESTION');
        },

        /**
         * Function close the modal
         *
         */
        closeModal: function() {
            var self = this;
            self.modal.hide();
        },

        /**
         * Function performs the RestAngular DELETE action for user id in scope
         *
         */
        deleteUser: function() {
            var self = this;
            UserRepository.delete(vm.userId).then(function(response) {
                self.closeModal();
                $state.go($state.current, {}, {reload: true});
            });
        }

    };
}

UserListCtrl.$inject = ['$scope', '$state', 'UserRepository', '$modal'];
module.exports = UserListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserDeleteCtrl.js","/src/user/controllers")

},{"_process":6,"buffer":2}],31:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class UserController
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function UserDetailsCtrl($scope, $stateParams, UserRepository) {
    // get single user
    UserRepository.one($stateParams.userId).then(function(response) {
        $scope.user = UserRepository.clean(response);
    });
}
UserDetailsCtrl.$inject = ['$scope', '$stateParams', 'UserRepository'];
module.exports = UserDetailsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserDetailsCtrl.js","/src/user/controllers")

},{"_process":6,"buffer":2}],32:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class UserController
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function UserDetailsCtrl($scope, $state, $stateParams, UserRepository, Notifications) {
    // get single user
    UserRepository.one($stateParams.userId).then(function(response) {
        $scope.user = UserRepository.clean(response);
    });

    $scope.saveUser = function(){
        UserRepository.update($scope.user.id, $scope.user).then(function(response){
            $state.go('user.list');
            Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
        });
    };

}
UserDetailsCtrl.$inject = ['$scope', '$state','$stateParams', 'UserRepository', 'Notifications'];
module.exports = UserDetailsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserEditCtrl.js","/src/user/controllers")

},{"_process":6,"buffer":2}],33:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class UserController
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function UserListCtrl($scope, $stateParams, $rootScope, UserRepository, NgTableParams) {
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'id': 'desc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.listLang.code,
                type: 'user'
            };

            // params.count() - number of items per page declared in view
            if (typeof $stateParams.perPage !== 'undefined') {
                params.count($stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof $stateParams.page !== 'undefined') {
                params.page($stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // get list by default
            var promise = UserRepository.list(queryOptions);

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(UserRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

UserListCtrl.$inject = ['$scope', '$stateParams', '$rootScope', 'UserRepository', 'ngTableParams'];
module.exports = UserListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserListCtrl.js","/src/user/controllers")

},{"_process":6,"buffer":2}],34:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class UserController
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function UserDeleteButton() {
    return {
        restrict: 'A',
        controller: 'UserDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, UserDeleteController) {
            element.on('click', function() {
                // Show a delete modal from a controller
                UserDeleteController.deleteModal.showModal(attrs.userId);
            });
        }
    };
}

UserDeleteButton.$inject = [];
module.exports = UserDeleteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/directives/UserDeleteButton.js","/src/user/directives")

},{"_process":6,"buffer":2}],35:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

angular.module('admin.user', ['ngTable'])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'gzero/admin/views/user/';

            // Now set up the states
            $stateProvider
                .state('user', {
                    url: '/user',
                    templateUrl: viewPath + 'index.html'
                })
                .state('user.show', {
                    url: '/{userId}/show',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'show.html',
                            controller: 'UserDetailsCtrl'
                        }
                    }
                }).state('user.edit', {
                    url: '/{userId}/edit',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'edit.html',
                            controller: 'UserEditCtrl'
                        }
                    }
                })
                .state('user.list', {
                    url: '/list/{userId}?page&perPage',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'list.html'
                        }
                    },

                });
        }
    ])
    .controller('UserListCtrl', require('./controllers/UserListCtrl'))
    .controller('UserDeleteCtrl', require('./controllers/UserDeleteCtrl'))
    .controller('UserEditCtrl', require('./controllers/UserEditCtrl'))
    .controller('UserDetailsCtrl', require('./controllers/UserDetailsCtrl'))
    .factory('UserRepository', require('./services/UserRepository.js'))
    .directive('userDeleteButton', require('./directives/UserDeleteButton.js'))
    .run([
        'NavBar',
        function(NavBar) {
            NavBar.add({
                title: 'USER', action: 'user.list', icon: 'fa fa-user'
                //children: [
                //    {
                //        title: 'USER_LIST',
                //        action: 'user.list',
                //        icon: 'fa fa-th'
                //    }
                //]
            });
        }
    ]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/module.js","/src/user")

},{"./controllers/UserDeleteCtrl":30,"./controllers/UserDetailsCtrl":31,"./controllers/UserEditCtrl":32,"./controllers/UserListCtrl":33,"./directives/UserDeleteButton.js":34,"./services/UserRepository.js":36,"_process":6,"buffer":2}],36:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class UserController
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function UserRepository(Restangular) {
    var api = 'admin/users';
    var users = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        tree: function(params) {
            return Restangular.one(api).getList('tree', params);
        },
        list: function(params) {
            return users.getList(params);
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        },
        delete: function(id) {
            return Restangular.one(api, id).remove();
        },
        update: function(id, user) {
            return Restangular.one(api, id).customPUT(user);
        }
    };
}

UserRepository.$inject = ['Restangular'];
module.exports = UserRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/services/UserRepository.js","/src/user/services")

},{"_process":6,"buffer":2}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2lzLWFycmF5L2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRBZGRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudERhc2hib2FyZEN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50RGVsZXRlQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnREZXRhaWxzQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRMaXN0Q3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRSb3V0ZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50VHJhc2hjYW5DdHJsLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50RGVsZXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50RWRpdFJvdXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvbW9kdWxlLmpzIiwic3JjL2NvbnRlbnQvc2VydmljZXMvQ29udGVudFJlcG9zaXRvcnkuanMiLCJzcmMvY29yZS9jb250cm9sbGVycy9Db3JlQ3RybC5qcyIsInNyYy9jb3JlL2ZpbHRlcnMvQ29yZUZpbHRlcnMuanMiLCJzcmMvY29yZS9tb2R1bGUuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9MYW5nUmVwb3NpdG9yeS5qcyIsInNyYy9jb3JlL3NlcnZpY2VzL05hdkJhci5qcyIsInNyYy9jb3JlL3NlcnZpY2VzL05vdGlmaWNhdGlvbnMuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9TdG9yYWdlLmpzIiwic3JjL2NvcmUvc2VydmljZXMvVG9wTmF2QmFyLmpzIiwic3JjL2NvcmUvc2VydmljZXMvVHJhbnNsYXRpb25zLmpzIiwic3JjL2xpYi9uYXZpZ2F0aW9uLmpzIiwic3JjL3VzZXIvY29udHJvbGxlcnMvVXNlckRlbGV0ZUN0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyRGV0YWlsc0N0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyRWRpdEN0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyTGlzdEN0cmwuanMiLCJzcmMvdXNlci9kaXJlY3RpdmVzL1VzZXJEZWxldGVCdXR0b24uanMiLCJzcmMvdXNlci9tb2R1bGUuanMiLCJzcmMvdXNlci9zZXJ2aWNlcy9Vc2VyUmVwb3NpdG9yeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3Q0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJy4vY29yZS9tb2R1bGUuanMnKTtcbnJlcXVpcmUoJy4vY29udGVudC9tb2R1bGUuanMnKTtcbnJlcXVpcmUoJy4vdXNlci9tb2R1bGUuanMnKTtcblxudmFyIGRlcGVuZGVuY2llcyA9IFtcbiAgICAncmVzdGFuZ3VsYXInLFxuICAgICd1aS5yb3V0ZXInLFxuICAgICduZ0FuaW1hdGUnLFxuICAgICdtZ2NyZWEubmdTdHJhcCcsXG4gICAgJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUnLFxuICAgICdhZG1pbi5jb3JlJyxcbiAgICAnYWRtaW4uY29udGVudCcsXG4gICAgJ2FkbWluLnVzZXInXG5dO1xuZGVwZW5kZW5jaWVzLnB1c2guYXBwbHkoZGVwZW5kZW5jaWVzLCBtb2R1bGVzKTsgLy8gT3RoZXIgbW9kdWxlcyBhcmUgbG9hZGVkIGJ5IHR3aWdcblxuYW5ndWxhci5tb2R1bGUoJ2FkbWluJywgZGVwZW5kZW5jaWVzKS5jb25maWcoW1xuICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgJ1Jlc3Rhbmd1bGFyUHJvdmlkZXInLFxuICAgICckdHJhbnNsYXRlUHJvdmlkZXInLFxuICAgICckdHJhbnNsYXRlUGFydGlhbExvYWRlclByb3ZpZGVyJyxcbiAgICBmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCBSZXN0YW5ndWxhclByb3ZpZGVyLCAkdHJhbnNsYXRlUHJvdmlkZXIsICR0cmFuc2xhdGVQYXJ0aWFsTG9hZGVyUHJvdmlkZXIpIHtcbiAgICAgICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzLyc7XG5cbiAgICAgICAgLy8gRm9yIGFueSB1bm1hdGNoZWQgdXJsLCByZWRpcmVjdCB0byAvc3RhdGUxXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcblxuICAgICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnaG9tZS5odG1sJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgJHRyYW5zbGF0ZVByb3ZpZGVyLnVzZUxvYWRlcignJHRyYW5zbGF0ZVBhcnRpYWxMb2FkZXInLCB7XG4gICAgICAgICAgICB1cmxUZW1wbGF0ZTogJ2d6ZXJvL3twYXJ0fS9sYW5nL3tsYW5nfS5qc29uJ1xuICAgICAgICB9KTtcbiAgICAgICAgJHRyYW5zbGF0ZVBhcnRpYWxMb2FkZXJQcm92aWRlci5hZGRQYXJ0KCdhZG1pbicpO1xuXG4gICAgICAgIC8vJHRyYW5zbGF0ZVByb3ZpZGVyLnByZWZlcnJlZExhbmd1YWdlKCdwbF9QTCcpO1xuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIucHJlZmVycmVkTGFuZ3VhZ2UoJ2VuX1VTJyk7XG5cbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5zZXRCYXNlVXJsKENvbmZpZy5hcGlVcmwgKyAnL3YxJyk7XG5cbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5zZXREZWZhdWx0SHR0cEZpZWxkcyh7XG4gICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVuYW1lIFJlc3Rhbmd1bGFyIHJvdXRlIGZpZWxkIHRvIHVzZSBhICQgcHJlZml4IGZvciBlYXN5IGRpc3RpbmN0aW9uIGJldHdlZW4gZGF0YSBhbmQgbWV0YWRhdGFcbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5zZXRSZXN0YW5ndWxhckZpZWxkcyh7cm91dGU6ICckcm91dGUnfSk7XG5cbiAgICAgICAgLy8gYWRkIGEgcmVzcG9uc2UgaW50ZXJlY2VwdG9yXG4gICAgICAgIFJlc3Rhbmd1bGFyUHJvdmlkZXIuYWRkUmVzcG9uc2VJbnRlcmNlcHRvcihmdW5jdGlvbihkYXRhLCBvcGVyYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBleHRyYWN0ZWREYXRhO1xuICAgICAgICAgICAgLy8gLi4gdG8gbG9vayBmb3IgZ2V0TGlzdCBvcGVyYXRpb25zXG5cbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24gPT09ICdnZXRMaXN0Jykge1xuICAgICAgICAgICAgICAgIC8vIC4uIGFuZCBoYW5kbGUgdGhlIGRhdGEgYW5kIG1ldGEgZGF0YVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YS5kYXRhICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhLm1ldGEgPSBkYXRhLm1ldGE7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEucGFyYW1zID0gZGF0YS5wYXJhbXM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gb25seSBvbmUgaXRlbSBpbiBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGV4dHJhY3RlZERhdGE7XG4gICAgICAgIH0pO1xuICAgIH1cbl0pLnJ1bihbXG4gICAgJ05hdkJhcicsXG4gICAgJyRyb290U2NvcGUnLFxuICAgICdSZXN0YW5ndWxhcicsXG4gICAgJ05vdGlmaWNhdGlvbnMnLFxuICAgIGZ1bmN0aW9uKE5hdkJhciwgJHJvb3RTY29wZSwgUmVzdGFuZ3VsYXIsIE5vdGlmaWNhdGlvbnMpIHtcbiAgICAgICAgTmF2QmFyLmFkZEZpcnN0KHt0aXRsZTogJ0RBU0hCT0FSRCcsIGFjdGlvbjogJ2hvbWUnLCBpY29uOiAnZmEgZmEtaG9tZSd9KTtcbiAgICAgICAgJHJvb3RTY29wZS5iYXNlVXJsID0gQ29uZmlnLnVybDtcblxuICAgICAgICBSZXN0YW5ndWxhci5zZXRFcnJvckludGVyY2VwdG9yKGZ1bmN0aW9uKHJlc3BvbnNlLCBkZWZlcnJlZCwgcmVzcG9uc2VIYW5kbGVyKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgICAgICAgICBOb3RpZmljYXRpb25zLmFkZEVycm9yKCdDT01NT05fRVJST1InKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGVycm9yIGhhbmRsZWRcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA1MDApIHtcbiAgICAgICAgICAgICAgICBOb3RpZmljYXRpb25zLmFkZEVycm9yKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBOb3RpZmljYXRpb25zLmFkZEVycm9ycyhyZXNwb25zZS5kYXRhLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gZXJyb3Igbm90IGhhbmRsZWRcbiAgICAgICAgfSk7XG4gICAgfVxuXSk7XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXMtYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxudmFyIGtNYXhMZW5ndGggPSAweDNmZmZmZmZmXG52YXIgcm9vdFBhcmVudCA9IHt9XG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIE5vdGU6XG4gKlxuICogLSBJbXBsZW1lbnRhdGlvbiBtdXN0IHN1cHBvcnQgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMuXG4gKiAgIEZpcmVmb3ggNC0yOSBsYWNrZWQgc3VwcG9ydCwgZml4ZWQgaW4gRmlyZWZveCAzMCsuXG4gKiAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogIC0gSUUxMCBoYXMgYSBicm9rZW4gYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFycmF5cyBvZlxuICogICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG4gKlxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXkgd2lsbFxuICogZ2V0IHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24sIHdoaWNoIGlzIHNsb3dlciBidXQgd2lsbCB3b3JrIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSAoZnVuY3Rpb24gKCkge1xuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDIgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgbmV3IFVpbnQ4QXJyYXkoMSkuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgLy8gQXZvaWQgZ29pbmcgdGhyb3VnaCBhbiBBcmd1bWVudHNBZGFwdG9yVHJhbXBvbGluZSBpbiB0aGUgY29tbW9uIGNhc2UuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSByZXR1cm4gbmV3IEJ1ZmZlcihhcmcsIGFyZ3VtZW50c1sxXSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihhcmcpXG4gIH1cblxuICB0aGlzLmxlbmd0aCA9IDBcbiAgdGhpcy5wYXJlbnQgPSB1bmRlZmluZWRcblxuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIGZyb21OdW1iZXIodGhpcywgYXJnKVxuICB9XG5cbiAgLy8gU2xpZ2h0bHkgbGVzcyBjb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodGhpcywgYXJnLCBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6ICd1dGY4JylcbiAgfVxuXG4gIC8vIFVudXN1YWwuXG4gIHJldHVybiBmcm9tT2JqZWN0KHRoaXMsIGFyZylcbn1cblxuZnVuY3Rpb24gZnJvbU51bWJlciAodGhhdCwgbGVuZ3RoKSB7XG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGggPCAwID8gMCA6IGNoZWNrZWQobGVuZ3RoKSB8IDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGF0W2ldID0gMFxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nICh0aGF0LCBzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykgZW5jb2RpbmcgPSAndXRmOCdcblxuICAvLyBBc3N1bXB0aW9uOiBieXRlTGVuZ3RoKCkgcmV0dXJuIHZhbHVlIGlzIGFsd2F5cyA8IGtNYXhMZW5ndGguXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuXG4gIHRoYXQud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAodGhhdCwgb2JqZWN0KSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqZWN0KSkgcmV0dXJuIGZyb21CdWZmZXIodGhhdCwgb2JqZWN0KVxuXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHJldHVybiBmcm9tQXJyYXkodGhhdCwgb2JqZWN0KVxuXG4gIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcbiAgfVxuXG4gIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIG9iamVjdC5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgIHJldHVybiBmcm9tVHlwZWRBcnJheSh0aGF0LCBvYmplY3QpXG4gIH1cblxuICBpZiAob2JqZWN0Lmxlbmd0aCkgcmV0dXJuIGZyb21BcnJheUxpa2UodGhhdCwgb2JqZWN0KVxuXG4gIHJldHVybiBmcm9tSnNvbk9iamVjdCh0aGF0LCBvYmplY3QpXG59XG5cbmZ1bmN0aW9uIGZyb21CdWZmZXIgKHRoYXQsIGJ1ZmZlcikge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChidWZmZXIubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgYnVmZmVyLmNvcHkodGhhdCwgMCwgMCwgbGVuZ3RoKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEdXBsaWNhdGUgb2YgZnJvbUFycmF5KCkgdG8ga2VlcCBmcm9tQXJyYXkoKSBtb25vbW9ycGhpYy5cbmZ1bmN0aW9uIGZyb21UeXBlZEFycmF5ICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICAvLyBUcnVuY2F0aW5nIHRoZSBlbGVtZW50cyBpcyBwcm9iYWJseSBub3Qgd2hhdCBwZW9wbGUgZXhwZWN0IGZyb20gdHlwZWRcbiAgLy8gYXJyYXlzIHdpdGggQllURVNfUEVSX0VMRU1FTlQgPiAxIGJ1dCBpdCdzIGNvbXBhdGlibGUgd2l0aCB0aGUgYmVoYXZpb3JcbiAgLy8gb2YgdGhlIG9sZCBCdWZmZXIgY29uc3RydWN0b3IuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuLy8gRGVzZXJpYWxpemUgeyB0eXBlOiAnQnVmZmVyJywgZGF0YTogWzEsMiwzLC4uLl0gfSBpbnRvIGEgQnVmZmVyIG9iamVjdC5cbi8vIFJldHVybnMgYSB6ZXJvLWxlbmd0aCBidWZmZXIgZm9yIGlucHV0cyB0aGF0IGRvbid0IGNvbmZvcm0gdG8gdGhlIHNwZWMuXG5mdW5jdGlvbiBmcm9tSnNvbk9iamVjdCAodGhhdCwgb2JqZWN0KSB7XG4gIHZhciBhcnJheVxuICB2YXIgbGVuZ3RoID0gMFxuXG4gIGlmIChvYmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShvYmplY3QuZGF0YSkpIHtcbiAgICBhcnJheSA9IG9iamVjdC5kYXRhXG4gICAgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB9XG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGFsbG9jYXRlICh0aGF0LCBsZW5ndGgpIHtcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0Lmxlbmd0aCA9IGxlbmd0aFxuICAgIHRoYXQuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGZyb21Qb29sID0gbGVuZ3RoICE9PSAwICYmIGxlbmd0aCA8PSBCdWZmZXIucG9vbFNpemUgPj4+IDFcbiAgaWYgKGZyb21Qb29sKSB0aGF0LnBhcmVudCA9IHJvb3RQYXJlbnRcblxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwga01heExlbmd0aGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBrTWF4TGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNsb3dCdWZmZXIpKSByZXR1cm4gbmV3IFNsb3dCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcpXG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcpXG4gIGRlbGV0ZSBidWYucGFyZW50XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIHZhciBpID0gMFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkgYnJlYWtcblxuICAgICsraVxuICB9XG5cbiAgaWYgKGkgIT09IGxlbikge1xuICAgIHggPSBhW2ldXG4gICAgeSA9IGJbaV1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghaXNBcnJheShsaXN0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdCBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSBzdHJpbmcgPSBTdHJpbmcoc3RyaW5nKVxuXG4gIGlmIChzdHJpbmcubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoICogMlxuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXR1cm4gc3RyaW5nLmxlbmd0aCA+Pj4gMVxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuLy8gcHJlLXNldCBmb3IgdmFsdWVzIHRoYXQgbWF5IGV4aXN0IGluIHRoZSBmdXR1cmVcbkJ1ZmZlci5wcm90b3R5cGUubGVuZ3RoID0gdW5kZWZpbmVkXG5CdWZmZXIucHJvdG90eXBlLnBhcmVudCA9IHVuZGVmaW5lZFxuXG4vLyB0b1N0cmluZyhlbmNvZGluZywgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgc3RhcnQgPSBzdGFydCB8IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kIHwgMFxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG4gIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmIChlbmQgPD0gc3RhcnQpIHJldHVybiAnJ1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gMFxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYilcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0KSB7XG4gIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgYnl0ZU9mZnNldCA+Pj0gMFxuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG4gIGlmIChieXRlT2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm4gLTFcblxuICAvLyBOZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IE1hdGgubWF4KHRoaXMubGVuZ3RoICsgYnl0ZU9mZnNldCwgMClcblxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xIC8vIHNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nIGFsd2F5cyBmYWlsc1xuICAgIHJldHVybiBTdHJpbmcucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gIH1cbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gIH1cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIFsgdmFsIF0sIGJ5dGVPZmZzZXQpXG4gIH1cblxuICBmdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0KSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAodmFyIGkgPSAwOyBieXRlT2Zmc2V0ICsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFycltieXRlT2Zmc2V0ICsgaV0gPT09IHZhbFtmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleF0pIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWwubGVuZ3RoKSByZXR1cm4gYnl0ZU9mZnNldCArIGZvdW5kSW5kZXhcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTFcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldCAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQgKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAoaXNOYU4ocGFyc2VkKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggfCAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgLy8gbGVnYWN5IHdyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKSAtIHJlbW92ZSBpbiB2MC4xM1xuICB9IGVsc2Uge1xuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aCB8IDBcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBiaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgbmV3QnVmID0gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH1cblxuICBpZiAobmV3QnVmLmxlbmd0aCkgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldFN0YXJ0KVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiB0b0FycmF5QnVmZmVyICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICB9XG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiBfYXVnbWVudCAoYXJyKSB7XG4gIGFyci5jb25zdHJ1Y3RvciA9IEJ1ZmZlclxuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgc2V0IG1ldGhvZCBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIG5vZGUgMC4xMytcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuZXF1YWxzID0gQlAuZXF1YWxzXG4gIGFyci5jb21wYXJlID0gQlAuY29tcGFyZVxuICBhcnIuaW5kZXhPZiA9IEJQLmluZGV4T2ZcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludExFID0gQlAucmVhZFVJbnRMRVxuICBhcnIucmVhZFVJbnRCRSA9IEJQLnJlYWRVSW50QkVcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50TEUgPSBCUC5yZWFkSW50TEVcbiAgYXJyLnJlYWRJbnRCRSA9IEJQLnJlYWRJbnRCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnRMRSA9IEJQLndyaXRlVUludExFXG4gIGFyci53cml0ZVVJbnRCRSA9IEJQLndyaXRlVUludEJFXG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnRMRSA9IEJQLndyaXRlSW50TEVcbiAgYXJyLndyaXRlSW50QkUgPSBCUC53cml0ZUludEJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtelxcLV0vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG4gIHZhciBpID0gMFxuXG4gIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgICAgICBjb2RlUG9pbnQgPSBsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwIHwgMHgxMDAwMFxuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG5cbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICB9XG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDIwMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBkZWNvZGVVdGY4Q2hhciAoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCkgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cbiIsInZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cdHZhciBQTFVTX1VSTF9TQUZFID0gJy0nLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIX1VSTF9TQUZFID0gJ18nLmNoYXJDb2RlQXQoMClcblxuXHRmdW5jdGlvbiBkZWNvZGUgKGVsdCkge1xuXHRcdHZhciBjb2RlID0gZWx0LmNoYXJDb2RlQXQoMClcblx0XHRpZiAoY29kZSA9PT0gUExVUyB8fFxuXHRcdCAgICBjb2RlID09PSBQTFVTX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSCB8fFxuXHRcdCAgICBjb2RlID09PSBTTEFTSF9VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRleHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXlcblx0ZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NFxufSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyAodGhpcy5iYXNlNjRqcyA9IHt9KSA6IGV4cG9ydHMpKVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsIlxuLyoqXG4gKiBpc0FycmF5XG4gKi9cblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIHRvU3RyaW5nXG4gKi9cblxudmFyIHN0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogV2hldGhlciBvciBub3QgdGhlIGdpdmVuIGB2YWxgXG4gKiBpcyBhbiBhcnJheS5cbiAqXG4gKiBleGFtcGxlOlxuICpcbiAqICAgICAgICBpc0FycmF5KFtdKTtcbiAqICAgICAgICAvLyA+IHRydWVcbiAqICAgICAgICBpc0FycmF5KGFyZ3VtZW50cyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICogICAgICAgIGlzQXJyYXkoJycpO1xuICogICAgICAgIC8vID4gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge21peGVkfSB2YWxcbiAqIEByZXR1cm4ge2Jvb2x9XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5IHx8IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuICEhIHZhbCAmJiAnW29iamVjdCBBcnJheV0nID09IHN0ci5jYWxsKHZhbCk7XG59O1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRBZGRDdHJsKCRzY29wZSwgJHN0YXRlLCAkc3RhdGVQYXJhbXMsIGxpc3RQYXJlbnQsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgdmFyIHBhcmVudElkID0gbnVsbDtcbiAgICAkc2NvcGUuY29udGVudFR5cGUgPSAkc3RhdGVQYXJhbXMudHlwZTtcbiAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBsaXN0UGFyZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubGlzdFBhcmVudCA9IGxpc3RQYXJlbnQ7IC8vIHNlbGVjdGVkIGNhdGVnb3J5XG4gICAgICAgIHBhcmVudElkID0gbGlzdFBhcmVudC5pZDtcbiAgICB9XG4gICAgLy8gZGVmYXVsdCB0cmFuc2xhdGlvbnMgbGFuZyBjb2RlXG4gICAgJHNjb3BlLm5ld0NvbnRlbnQgPSB7XG4gICAgICAgIHR5cGU6ICRzdGF0ZVBhcmFtcy50eXBlLFxuICAgICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICBsYW5nQ29kZTogJHNjb3BlLmxpc3RMYW5nLmNvZGVcbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gY29udGVudHMgUE9TVCBhY3Rpb25cbiAgICAkc2NvcGUuYWRkTmV3Q29udGVudCA9IGZ1bmN0aW9uIGFkZE5ld0NvbnRlbnQobmV3Q29udGVudCkge1xuICAgICAgICBuZXdDb250ZW50LnBhcmVudElkID0gcGFyZW50SWQ7IC8vIHNldCBwYXJlbnQgY2F0ZWdvcnkgYXMgbnVsbFxuICAgICAgICBuZXdDb250ZW50LnB1Ymxpc2hlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDE5KS5yZXBsYWNlKCdUJywgJyAnKTsgLy8gc2V0IHB1Ymxpc2ggYXQgZGF0ZVxuICAgICAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLmxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBmb3Igcm91dGUgdHJhbnNsYXRpb24gaW4gc2VsZWN0ZWQgbGFuZ3VhZ2VcbiAgICAgICAgICAgIHZhciByb3V0ZSA9IF8ucGx1Y2soXy5maWx0ZXIoJHNjb3BlLmxpc3RQYXJlbnQucm91dGUudHJhbnNsYXRpb25zLCAnbGFuZycsIG5ld0NvbnRlbnQudHJhbnNsYXRpb25zLmxhbmdDb2RlKSwgJ3VybCcpO1xuICAgICAgICAgICAgaWYgKCFyb3V0ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBuZXdDb250ZW50LnBhcmVudElkID0gbnVsbDsgLy8gaWYgbm90IGZvdW5kIHNldCBhcyB1bmNhdGVnb3JpemVkXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgQ29udGVudFJlcG9zaXRvcnkubmV3Q29udGVudChuZXdDb250ZW50KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAoJHN0YXRlUGFyYW1zLnR5cGUgPT09ICdjYXRlZ29yeScpIHtcbiAgICAgICAgICAgICAgICAvLyB3aGVuIGNyZWF0ZSBhIGNhdGVnb3J5IHRoZW4gc2V0IGl0IGFzIGEgbmV3IGxpc3RQYXJlbnQgb24gY29udGVudCBsaXN0XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdjb250ZW50Lmxpc3QnLCB7Y29udGVudElkOiByZXNwb25zZS5pZH0sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGdvIHRvIGxpc3Qgd2l0aG91dCBuZXcgbGlzdFBhcmVudFxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnY29udGVudC5saXN0Jywge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbn1cbkNvbnRlbnRBZGRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgJ2xpc3RQYXJlbnQnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudEFkZEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRBZGRUcmFuc2xhdGlvbkN0cmwoJHNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcywgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAkc2NvcGUuc2hvd1RlYXNlciA9IGZhbHNlO1xuICAgIC8vIGRlZmF1bHQgdHJhbnNsYXRpb25zIGxhbmcgY29kZVxuICAgICRzY29wZS5uZXdDb250ZW50VHJhbnNsYXRpb24gPSB7XG4gICAgICAgIGNvbnRlbnRJZDogJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCxcbiAgICAgICAgbGFuZ0NvZGU6ICRzdGF0ZVBhcmFtcy5sYW5nQ29kZVxuICAgIH07XG4gICAgLy8gY29udGVudHMgUE9TVCBhY3Rpb25cbiAgICAkc2NvcGUuYWRkbmV3Q29udGVudFRyYW5zbGF0aW9uID0gZnVuY3Rpb24gYWRkTmV3Q29udGVudChuZXdDb250ZW50VHJhbnNsYXRpb24pIHtcbiAgICAgICAgQ29udGVudFJlcG9zaXRvcnkubmV3Q29udGVudFRyYW5zbGF0aW9uKCRzdGF0ZVBhcmFtcy5jb250ZW50SWQsIG5ld0NvbnRlbnRUcmFuc2xhdGlvbikudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdjb250ZW50Lmxpc3QnLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50Q2F0ZWdvcnlUcmVlQ3RybCgkc2NvcGUsIGNhdGVnb3JpZXMsIG9wZW5DYXRlZ29yaWVzLCBsaXN0UGFyZW50LCBTdG9yYWdlKSB7XG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gcmV0dXJucyByb290IGlkIGZyb20gcHJvdmlkZWQgcGF0aFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhdGggdG8gc2VhcmNoIG92ZXJcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtpbnR9IHJvb3QgaWRcbiAgICAgKiBAdGhyb3dzIEVycm9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Um9vdElkRnJvbVBhdGgocGF0aCkge1xuICAgICAgICBpZiAocGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aFswXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZSBwYXRoIGlzIHRvbyBzaG9ydCEnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHJldHVybnMgc3BlY2lmaWVkIG5vZGUgZm9ybSBwcm92aWRlZCBjb2xsZWN0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29sbGVjdGlvbiB0aGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXJcbiAgICAgKiBAcGFyYW0gaWQgIG5vZGUgaWRcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IHJldHVybnMgdGhlIGZvdW5kIGVsZW1lbnQsIGVsc2UgdW5kZWZpbmVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUJ5SWQoY29sbGVjdGlvbiwgaWQpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZChjb2xsZWN0aW9uLCBmdW5jdGlvbihjYXRlZ29yeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3J5LmlkID09PSBpZDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gaWYgdGhlcmUgYXJlIG9wZW4gY2F0ZWdvcmllcyBpbiB0aGUgU3RvcmFnZVxuICAgIGlmICh0eXBlb2Ygb3BlbkNhdGVnb3JpZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllcyA9IG9wZW5DYXRlZ29yaWVzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllcyA9IFtdO1xuICAgIH1cblxuICAgIC8vIGlmIGNhdGVnb3JpZXMgdHJlZSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGNhdGVnb3JpZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5jYXRlZ29yaWVzID0gY2F0ZWdvcmllcztcbiAgICB9XG5cbiAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBsaXN0UGFyZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUuYWN0aXZlTm9kZSA9IGxpc3RQYXJlbnQuaWQ7XG5cbiAgICAgICAgLy8gbWVyZ2Ugb3BlbiBjYXRlZ29yaWVzIHdpdGggYWN0aXZlIGNhdGVnb3J5IHBhdGhcbiAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzID0gXy51bmlvbigkc2NvcGUub3BlbkNhdGVnb3JpZXMsIGxpc3RQYXJlbnQucGF0aCk7XG4gICAgICAgICRzY29wZS5yb290ID0gZ2V0Tm9kZUJ5SWQoJHNjb3BlLmNhdGVnb3JpZXMsIGdldFJvb3RJZEZyb21QYXRoKGxpc3RQYXJlbnQucGF0aCkpO1xuICAgICAgICAvLyBzYXZlIG9wZW4gY2F0ZWdvcmllcyBpbiB0aGUgc3RvcmVcbiAgICAgICAgU3RvcmFnZS5zZXRTdG9yYWdlSXRlbSh7b3BlbkNhdGVnb3JpZXM6ICRzY29wZS5vcGVuQ2F0ZWdvcmllc30pO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZXMgbGlzdFBhcmVudCBpZCBmcm9tIHN0b3JhZ2VcbiAgICAkc2NvcGUudW5jYXRlZ29yaXplZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBTdG9yYWdlLnJlbW92ZVN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpO1xuICAgIH07XG5cbiAgICAvLyB0b2dnbGVzIE5vZGUgaW4gY2F0ZWdvcmllcyB0cmVlIGFuZCBtYW5hZ2UgU3RvcmFnZSBvcGVuIGNhdGVnb3JpZXMgb2JqZWN0XG4gICAgJHNjb3BlLnRvZ2dsZU5vZGUgPSBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBzY29wZS50b2dnbGUoKTtcbiAgICAgICAgdmFyIG5vZGVJZCA9IF8ucGFyc2VJbnQoc2NvcGUuJGVsZW1lbnRbMF0uaWQsIDEwKTtcbiAgICAgICAgLy8gaWYgbm9kZSBpcyBvcGVuXG4gICAgICAgIGlmICghc2NvcGUuY29sbGFwc2VkKSB7XG4gICAgICAgICAgICAvLyBhZGQgdG8gc2NvcGVcbiAgICAgICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllcy5wdXNoKG5vZGVJZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgZnJvbSBzY29wZVxuICAgICAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzID0gXy53aXRob3V0KCRzY29wZS5vcGVuQ2F0ZWdvcmllcywgbm9kZUlkKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzYXZlIGluIHRoZSBzdG9yZVxuICAgICAgICBTdG9yYWdlLnNldFN0b3JhZ2VJdGVtKHtvcGVuQ2F0ZWdvcmllczogJHNjb3BlLm9wZW5DYXRlZ29yaWVzfSk7XG4gICAgfTtcblxufVxuQ29udGVudENhdGVnb3J5VHJlZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2NhdGVnb3JpZXMnLCAnb3BlbkNhdGVnb3JpZXMnLCAnbGlzdFBhcmVudCcsICdTdG9yYWdlJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRDYXRlZ29yeVRyZWVDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGFzaGJvYXJkQ3RybCgkc2NvcGUpIHtcblxufVxuQ29udGVudERhc2hib2FyZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREYXNoYm9hcmRDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGVsZXRlQ3RybCgkc2NvcGUsICRzdGF0ZSwgJG1vZGFsLCBTdG9yYWdlLCBDb250ZW50UmVwb3NpdG9yeSwgTm90aWZpY2F0aW9ucykgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvJztcbiAgICAvLyBEZWxldGUgbW9kYWxcbiAgICB2bS5kZWxldGVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB2aWV3UGF0aCArICdjb250ZW50RGVsZXRlTW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50SWQgY29udGVudCBpZCB0byBiZSByZW1vdmVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRUeXBlIGNvbnRlbnQgdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihjb250ZW50SWQsIGNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICB2bS5jb250ZW50VHlwZSA9IGNvbnRlbnRUeXBlO1xuICAgICAgICAgICAgLy8gY2hlY2sgZm9yIGNoaWxkcmVuXG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5jaGlsZHJlbihjb250ZW50SWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoQ29udGVudFJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnREVMRVRFX0NPTlRFTlRfUVVFU1RJT04nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2bS5oaWRlU3VibWl0QnV0dG9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ0lORk9STUFUSU9OJywgJ0RFTEVURV9OT1RfRU1QVFlfQ0FURUdPUllfSU5GTycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIERFTEVURSBhY3Rpb24gZm9yIGNvbnRlbnQgaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGRlbGV0ZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkuZGVsZXRlQ29udGVudCh2bS5jb250ZW50SWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICAvLyByZWZyZXNoIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgICAgICAgICBpZiAodm0uY29udGVudFR5cGUgPT09ICdjYXRlZ29yeScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlZCBjYXRlZ29yeVxuICAgICAgICAgICAgICAgICAgICBTdG9yYWdlLnJlbW92ZVN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2NvbnRlbnQubGlzdCcsIHtjb250ZW50SWQ6IG51bGx9LCB7cmVsb2FkOiB0cnVlLCBpbmhlcml0OiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgICAgICBOb3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ0NBVEVHT1JZX0hBU19CRUVOX0RFTEVURUQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmVkIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzdGF0ZS4kY3VycmVudC5uYW1lID09PSAnY29udGVudC5zaG93Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdjb250ZW50Lmxpc3QnLCB7Y29udGVudElkOiBudWxsfSwge3JlbG9hZDogdHJ1ZSwgaW5oZXJpdDogZmFsc2V9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygkc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBOb3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ0NPTlRFTlRfSEFTX0JFRU5fREVMRVRFRCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuQ29udGVudERlbGV0ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsICckbW9kYWwnLCAnU3RvcmFnZScsICdDb250ZW50UmVwb3NpdG9yeScsICdOb3RpZmljYXRpb25zJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREZWxldGVDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGV0YWlsc0N0cmwoJHNjb3BlLCAkc3RhdGVQYXJhbXMsIENvbnRlbnRSZXBvc2l0b3J5LCBOb3RpZmljYXRpb25zKSB7XG4gICAgLy8gZ2V0IHNpbmdsZSBjb250ZW50XG4gICAgQ29udGVudFJlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5jb250ZW50SWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBDb250ZW50UmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2F2ZUNvbnRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgQ29udGVudFJlcG9zaXRvcnlcbiAgICAgICAgICAgIC51cGRhdGVDb250ZW50KCRzY29wZS5jb250ZW50LmlkLCAkc2NvcGUuY29udGVudClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnU0FWRUQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbn1cbkNvbnRlbnREZXRhaWxzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgJ05vdGlmaWNhdGlvbnMnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudERldGFpbHNDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50TGlzdEN0cmwoJHNjb3BlLCAkc3RhdGVQYXJhbXMsIGxpc3RQYXJlbnQsIENvbnRlbnRSZXBvc2l0b3J5LCBOZ1RhYmxlUGFyYW1zKSB7XG4gICAgLy8gaWYgcGFyZW50IGNhdGVnb3J5IGV4aXN0c1xuICAgIGlmICh0eXBlb2YgbGlzdFBhcmVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmxpc3RQYXJlbnQgPSBsaXN0UGFyZW50OyAvLyBzZWxlY3RlZCBjYXRlZ29yeVxuICAgIH1cblxuICAgIC8vICBuZ1RhYmxlIGNvbmZpZ3VyYXRpb25cbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ3RyYW5zbGF0aW9ucy50aXRsZSc6ICdhc2MnIC8vIGluaXRpYWwgc29ydGluZ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBsYW5nOiAkc2NvcGUubGlzdExhbmcuY29kZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnY29udGVudCdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KCRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mICRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKCRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyAkc3RhdGVQYXJhbXMgLSBmaWx0ZXJzIHdpdGhvdXQgY29udGVudElkXG4gICAgICAgICAgICB2YXIgZmlsdGVycyA9IF8ub21pdCgkc3RhdGVQYXJhbXMsICdjb250ZW50SWQnKTtcbiAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucyA9IF8ubWVyZ2UocXVlcnlPcHRpb25zLCBmaWx0ZXJzKTtcbiAgICAgICAgICAgICRzY29wZS5hY3RpdmVGaWx0ZXIgPSBmaWx0ZXJzO1xuXG4gICAgICAgICAgICAvLyBnZXQgbGlzdCBieSBkZWZhdWx0XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IENvbnRlbnRSZXBvc2l0b3J5Lmxpc3QocXVlcnlPcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gaWYgcGFyZW50IGNhdGVnb3J5IGlzIG5vdCBzZWxlY3RlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaXN0UGFyZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIC8vIGdldCB1bmNhdGVnb3JpemVkXG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLmxldmVsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IGNoaWxkcmVuJ3NcbiAgICAgICAgICAgICAgICBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkuY2hpbGRyZW4obGlzdFBhcmVudC5pZCwgcXVlcnlPcHRpb25zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ29udGVudHMgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKENvbnRlbnRSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbkNvbnRlbnRMaXN0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgJ2xpc3RQYXJlbnQnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnbmdUYWJsZVBhcmFtcyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50TGlzdEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRSb3V0ZUN0cmwoJHNjb3BlLCAkc3RhdGUsICRtb2RhbCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvJztcbiAgICAvLyBEZWxldGUgbW9kYWxcbiAgICB2bS5lZGl0Um91dGVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB2aWV3UGF0aCArICdjb250ZW50RWRpdFJvdXRlTW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50SWQgY29udGVudCBpZCB0byBiZSByZW1vdmVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRSb3V0ZSBjb250ZW50IHJvdXRlXG4gICAgICAgICAqIEBwYXJhbSBsYW5nQ29kZSByb3V0ZSB0cmFuc2xhdGlvbiBsYW5ndWFnZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihjb250ZW50SWQsIGNvbnRlbnRSb3V0ZSwgbGFuZ0NvZGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHZtLmNvbnRlbnRSb3V0ZSA9IGNvbnRlbnRSb3V0ZS5zdWJzdHIoY29udGVudFJvdXRlLmxhc3RJbmRleE9mKCcvJykgKyAxKTsgLy8gbGFzdCB1cmwgc2VnbWVudFxuICAgICAgICAgICAgdm0ubGFuZ0NvZGUgPSBsYW5nQ29kZTtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdFRElUJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgY29udGVudCBpZCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZUNvbnRlbnRSb3V0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgbmV3Um91dGUgPSB7XG4gICAgICAgICAgICAgICAgbGFuZ0NvZGU6IHZtLmxhbmdDb2RlLFxuICAgICAgICAgICAgICAgIHVybDogdm0uY29udGVudFJvdXRlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkubmV3Q29udGVudFJvdXRlKHZtLmNvbnRlbnRJZCwgbmV3Um91dGUpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9XG4gICAgfTtcbn1cbkNvbnRlbnRSb3V0ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsICckbW9kYWwnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFJvdXRlQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRUcmFzaGNhbkN0cmwoJHNjb3BlLCAkc3RhdGVQYXJhbXMsIENvbnRlbnRSZXBvc2l0b3J5LCBOZ1RhYmxlUGFyYW1zKSB7XG4gICAgJHNjb3BlLnRhYmxlUGFyYW1zID0gbmV3IE5nVGFibGVQYXJhbXMoe1xuICAgICAgICBjb3VudDogMjUsIC8vIGNvdW50IHBlciBwYWdlXG4gICAgICAgIHNvcnRpbmc6IHtcbiAgICAgICAgICAgICdpZCc6ICdkZXNjJyAvLyBpbml0aWFsIHNvcnRpbmdcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAgdG90YWw6IDAsIC8vIGxlbmd0aCBvZiBkYXRhXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCRkZWZlciwgcGFyYW1zKSB7XG4gICAgICAgICAgICAvLyBwcmVwYXJlIG9wdGlvbnMgdG8gYmUgc2VudCB0byBhcGlcbiAgICAgICAgICAgIHZhciBxdWVyeU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbGFuZzogJHNjb3BlLmxpc3RMYW5nLmNvZGVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KCRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mICRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKCRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQgbGlzdCBieSBkZWZhdWx0XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IENvbnRlbnRSZXBvc2l0b3J5LmRlbGV0ZWQocXVlcnlPcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gQ29udGVudHMgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKENvbnRlbnRSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuQ29udGVudFRyYXNoY2FuQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgJ25nVGFibGVQYXJhbXMnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFRyYXNoY2FuQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudERlbGV0ZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsLy8gYmVjYXVzZSB0aGUgc2NvcGUgaXMgaXNvbGF0ZWRcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBDb250ZW50RGVsZXRlQ3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgZGVsZXRlIG1vZGFsIGZyb20gYSBjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgQ29udGVudERlbGV0ZUN0cmwuZGVsZXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmlkLCBhdHRycy50eXBlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudERlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREZWxldGVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRFZGl0Um91dGVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRSb3V0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsLy8gYmVjYXVzZSB0aGUgc2NvcGUgaXMgaXNvbGF0ZWRcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBDb250ZW50Um91dGVDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgYSBkZWxldGUgbW9kYWwgZnJvbSBhIGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICBDb250ZW50Um91dGVDdHJsLmVkaXRSb3V0ZU1vZGFsLnNob3dNb2RhbChhdHRycy5pZCwgYXR0cnMucm91dGUsIGF0dHJzLmxhbmcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50RWRpdFJvdXRlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudEVkaXRSb3V0ZUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2FkbWluLmNvbnRlbnQnLCBbJ25nVGFibGUnLCAndWkudHJlZSddKVxuICAgIC5jb25maWcoW1xuICAgICAgICAnJHN0YXRlUHJvdmlkZXInLFxuICAgICAgICBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICAgICAgICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvJztcbiAgICAgICAgICAgIC8vIE5vdyBzZXQgdXAgdGhlIHN0YXRlc1xuICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9jb250ZW50JyxcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnREYXNoYm9hcmRDdHJsJyxcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnRSZXBvc2l0b3J5JywgZnVuY3Rpb24oQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IHRyZWUgb2YgYWxsIGNhdGVnb3JpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5LnRyZWUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NhdGVnb3J5J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5saXN0Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvbGlzdC97Y29udGVudElkfT9pc0FjdGl2ZSZwYWdlJnBlclBhZ2UnLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0UGFyZW50OiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsICdTdG9yYWdlJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBTdG9yYWdlLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdGF0ZSBwYXJhbSBoYXMgY2F0ZWdvcnkgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzdGF0ZVBhcmFtcy5jb250ZW50SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFN0b3JhZ2Uuc2V0U3RvcmFnZUl0ZW0oe2NvbnRlbnRMaXN0UGFyZW50OiAkc3RhdGVQYXJhbXMuY29udGVudElkfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5jb250ZW50SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgc3RvcmFnZSBoYXMgY2F0ZWdvcnkgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChTdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCA9IFN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZShTdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuQ2F0ZWdvcmllczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCBvcGVuIGNhdGVnb3JpZXMgZnJvbSBTdG9yYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1N0b3JhZ2UnLCBmdW5jdGlvbihTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBTdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdvcGVuQ2F0ZWdvcmllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdsaXN0Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50TGlzdEN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3F1aWNrU2lkZWJhckxlZnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2NhdGVnb3JpZXMuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQuc2hvdycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tjb250ZW50SWR9L3Nob3cnLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3Nob3cuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnREZXRhaWxzQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LnRyYXNoY2FuJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvdHJhc2hjYW4nLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3RyYXNoY2FuLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50VHJhc2hjYW5DdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQuYWRkJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvYWRkL3t0eXBlfScsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RQYXJlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU3RvcmFnZScsICdDb250ZW50UmVwb3NpdG9yeScsIGZ1bmN0aW9uKFN0b3JhZ2UsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHN0b3JhZ2UgaGFzIGNhdGVnb3J5IGlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChTdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkub25lKFN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2FkZC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudEFkZEN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5hZGRUcmFuc2xhdGlvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tjb250ZW50SWR9L2FkZC10cmFuc2xhdGlvbi97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdhZGRUcmFuc2xhdGlvbi5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSlcbiAgICAuY29udHJvbGxlcignQ29udGVudEFkZEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnRBZGRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnREZWxldGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50RGVsZXRlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50Q2F0ZWdvcnlUcmVlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudENhdGVnb3J5VHJlZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERhc2hib2FyZEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnREYXNoYm9hcmRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnREZXRhaWxzQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudERldGFpbHNDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRMaXN0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudExpc3RDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRUcmFzaGNhbkN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnRUcmFzaGNhbkN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50Um91dGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50Um91dGVDdHJsJykpXG4gICAgLmZhY3RvcnkoJ0NvbnRlbnRSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9Db250ZW50UmVwb3NpdG9yeS5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnREZWxldGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnRFZGl0Um91dGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudEVkaXRSb3V0ZUJ1dHRvbi5qcycpKVxuICAgIC5ydW4oW1xuICAgICAgICAnTmF2QmFyJyxcbiAgICAgICAgZnVuY3Rpb24oTmF2QmFyKSB7XG4gICAgICAgICAgICBOYXZCYXIuYWRkKFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdDT05URU5UJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnY29udGVudC5saXN0JyxcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWZpbGUtdGV4dC1vJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvL05hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgICAvLyAgICAnQ09OVEVOVCcsXG4gICAgICAgICAgICAvLyAgICB7XG4gICAgICAgICAgICAvLyAgICAgICAgdGl0bGU6ICdBTExfQ09OVEVOVFMnLFxuICAgICAgICAgICAgLy8gICAgICAgIGFjdGlvbjogJ2NvbnRlbnQubGlzdCcsXG4gICAgICAgICAgICAvLyAgICAgICAgaWNvbjogJ2ZhIGZhLXRoJ1xuICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgLy8pO1xuICAgICAgICAgICAgLy9OYXZCYXIuYWRkTGFzdENoaWxkKFxuICAgICAgICAgICAgLy8gICAgJ0NPTlRFTlQnLFxuICAgICAgICAgICAgLy8gICAge1xuICAgICAgICAgICAgLy8gICAgICAgIHRpdGxlOiAnQUREX0NPTlRFTlQnLFxuICAgICAgICAgICAgLy8gICAgICAgIGFjdGlvbjogJ2NvbnRlbnQuYWRkKHsgdHlwZTogXCJjb250ZW50XCIgfSknLFxuICAgICAgICAgICAgLy8gICAgICAgIGljb246ICdmYSBmYS1maWxlLXRleHQtbydcbiAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgIC8vKTtcbiAgICAgICAgICAgIC8vTmF2QmFyLmFkZExhc3RDaGlsZChcbiAgICAgICAgICAgIC8vICAgICdDT05URU5UJyxcbiAgICAgICAgICAgIC8vICAgIHtcbiAgICAgICAgICAgIC8vICAgICAgICB0aXRsZTogJ0FERF9DQVRFR09SWScsXG4gICAgICAgICAgICAvLyAgICAgICAgYWN0aW9uOiAnY29udGVudC5hZGQoeyB0eXBlOiBcImNhdGVnb3J5XCIgfSknLFxuICAgICAgICAgICAgLy8gICAgICAgIGljb246ICdmYSBmYS1maWxlLXRleHQnXG4gICAgICAgICAgICAvLyAgICB9XG4gICAgICAgICAgICAvLyk7XG4gICAgICAgIH1cbiAgICBdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFJlcG9zaXRvcnkoUmVzdGFuZ3VsYXIpIHtcbiAgICB2YXIgYXBpID0gJ2FkbWluL2NvbnRlbnRzJztcbiAgICB2YXIgY29udGVudHMgPSBSZXN0YW5ndWxhci5hbGwoYXBpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvbmU6IGZ1bmN0aW9uKGlkLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuZ2V0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHRyZWU6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGkpLmdldExpc3QoJ3RyZWUnLCBwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0OiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250ZW50cy5nZXRMaXN0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGV0ZWQ6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGkpLmdldExpc3QoJ2RlbGV0ZWQnLCBwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogZnVuY3Rpb24oaWQsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5nZXRMaXN0KCdjaGlsZHJlbicsIHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIG5ld0NvbnRlbnQ6IGZ1bmN0aW9uKG5ld0NvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250ZW50cy5wb3N0KG5ld0NvbnRlbnQpO1xuICAgICAgICB9LFxuICAgICAgICB1cGRhdGVDb250ZW50OiBmdW5jdGlvbihpZCwgY29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5jdXN0b21QVVQoY29udGVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIG5ld0NvbnRlbnRUcmFuc2xhdGlvbjogZnVuY3Rpb24oaWQsIG5ld1RyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmFsbCgndHJhbnNsYXRpb25zJykucG9zdChuZXdUcmFuc2xhdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIG5ld0NvbnRlbnRSb3V0ZTogZnVuY3Rpb24oaWQsIG5ld1JvdXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmFsbCgncm91dGUnKS5wb3N0KG5ld1JvdXRlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlQ29udGVudDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkucmVtb3ZlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuc3RyaXBSZXN0YW5ndWxhcihlbGVtKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnRSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRSZXBvc2l0b3J5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb3JlQ3RybCgkc2NvcGUsICRzdGF0ZSwgVHJhbnNsYXRpb25zLCBOYXZCYXIsIFRvcE5hdkJhcikge1xuICAgIC8vIGdldCB0cmFuc2xhdGlvbnMgbGFuZ3VhZ2VzXG4gICAgVHJhbnNsYXRpb25zLmdldFRyYW5zbGF0aW9ucygpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgJHNjb3BlLmxhbmdzID0gcmVzcG9uc2UubGFuZ3M7XG4gICAgICAgICRzY29wZS5jdXJyZW50TGFuZyA9ICRzY29wZS5saXN0TGFuZyA9IHJlc3BvbnNlLmN1cnJlbnRMYW5nO1xuICAgIH0pO1xuXG4gICAgLy8gYWRtaW4gcGFuZWwgbGFuZ3VhZ2VcbiAgICAkc2NvcGUuc2VsZWN0QWRtaW5MYW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIFRyYW5zbGF0aW9ucy5zZWxlY3RBZG1pbkxhbmcoJHNjb3BlLmN1cnJlbnRMYW5nKTtcbiAgICB9O1xuXG4gICAgLy8gdHJhbnNsYXRpb25zIGxhbmd1YWdlXG4gICAgJHNjb3BlLnNlbGVjdExhbmd1YWdlID0gZnVuY3Rpb24obGFuZykge1xuICAgICAgICAkc2NvcGUubGlzdExhbmcgPSBsYW5nO1xuICAgIH07XG5cbiAgICAvLyByZWZyZXNoIGN1cnJlbnQgc3RhdGVcbiAgICRzY29wZS5yZWZyZXNoQ3VycmVudFN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgJHN0YXRlLmdvKCRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUubmF2QmFyID0gTmF2QmFyLmdldEl0ZW1zKCk7XG4gICAgJHNjb3BlLnRvcE5hdkJhciA9IFRvcE5hdkJhci5nZXRJdGVtcygpO1xuXG4gICAgLy9PZmYgY2FudmFzIHNpZGViYXJcbiAgICAkc2NvcGUuc2hvd1NpZGViYXIgPSBmYWxzZTtcblxuICAgIC8vIHRvZ2dsZSBzaWRlYmFyXG4gICAgJHNjb3BlLiRzdGF0ZSA9ICRzdGF0ZTtcbn1cblxuQ29yZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsICdUcmFuc2xhdGlvbnMnLCAnTmF2QmFyJywgJ1RvcE5hdkJhcicsICckc3RhdGUnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29yZUN0cmw7XG4iLCJhbmd1bGFyLm1vZHVsZSgnQ29yZUZpbHRlcnMnLCBbXSlcbi8qKlxuICogRmlsdGVyIHJldHVybnMgdHJhbnNsYXRhYmxlIHN0cmluZyBiYXNlZCBvbiBwcm92aWRlZCBsYW5ndWFnZSBjb2RlXG4gKlxuICogQHBhcmFtIGxhbmdDb2RlICBsYW5ndWFnZSBjb2RlXG4gKlxuICogQHJldHVybnMge3N0cmluZ30gdHJhbnNsYXRhYmxlIHN0cmluZ1xuICovXG4gICAgLmZpbHRlcignbGFuZ05hbWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24obGFuZ0NvZGUpIHtcbiAgICAgICAgICAgIHJldHVybiAnTEFOR19OQU1FXycgKyBhbmd1bGFyLnVwcGVyY2FzZShsYW5nQ29kZSk7XG4gICAgICAgIH07XG4gICAgfSlcbi8qKlxuICogRmlsdGVyIHJldHVybnMgdGhlIHRyYW5zbGF0aW9uIGluIHByb3ZpZGVkIGxhbmd1YWdlXG4gKlxuICogQHBhcmFtIHRyYW5zbGF0aW9ucyB0aGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXJcbiAqIEBwYXJhbSBsYW5nQ29kZSAgbGFuZ3VhZ2UgY29kZVxuICogQHBhcmFtIGZpZWxkICBmaWVsZCBuYW1lXG4gKlxuICogQHJldHVybnMge29iamVjdH0gdHJhbnNsYXRpb24gZmllbGRcbiAqL1xuICAgIC5maWx0ZXIoJ2dldFRyYW5zbGF0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRyYW5zbGF0aW9ucywgbGFuZ0NvZGUsIGZpZWxkKSB7XG4gICAgICAgICAgICB2YXIgY3VycmVudFRyYW5zbGF0aW9uID0gXy5maWx0ZXIodHJhbnNsYXRpb25zLCBmdW5jdGlvbih0cmFuc2xhdGlvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFuc2xhdGlvbi5sYW5nID09PSBsYW5nQ29kZTtcbiAgICAgICAgICAgIH0pLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAoXy5oYXMoY3VycmVudFRyYW5zbGF0aW9uLCBmaWVsZCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFRyYW5zbGF0aW9uW2ZpZWxkXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSlcbi8qKlxuICogRmlsdGVyIGNoZWNrcyBpZiBzcGVjaWZpZWQgbm9kZSBleGlzdHMgaW4gcHJvdmlkZWQgcGF0aFxuICpcbiAqIEBwYXJhbSBwYXRoIHRoZSBub2RlIHBhdGggdG8gaXRlcmF0ZSBvdmVyXG4gKiBAcGFyYW0gaWQgIG5vZGUgaWRcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbH0gdHJ1ZSBvciBmYWxzZVxuICovXG4gICAgLmZpbHRlcignbm9kZUluUGF0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihwYXRoLCBpZCkge1xuICAgICAgICAgICAgLy8gaWYgcGF0aCBleGlzdHMgYW5kIG5vdCBlbXB0eVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXRoICE9PSAndW5kZWZpbmVkJyAmJiBwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aC5pbmRleE9mKGlkKSA+IC0xO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSlcblxuICAgIC5maWx0ZXIoJ3RydXN0QXNIdG1sJywgZnVuY3Rpb24oJHNjZSkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiAkc2NlLnRydXN0QXNIdG1sO1xuICAgIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCcuL2ZpbHRlcnMvQ29yZUZpbHRlcnMuanMnKTtcblxuYW5ndWxhci5tb2R1bGUoJ2FkbWluLmNvcmUnLCBbJ0NvcmVGaWx0ZXJzJ10pXG4gICAgLmNvbnRyb2xsZXIoJ0NvcmVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db3JlQ3RybC5qcycpKVxuICAgIC5mYWN0b3J5KCdMYW5nUmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvTGFuZ1JlcG9zaXRvcnkuanMnKSlcbiAgICAuZmFjdG9yeSgnTmF2QmFyJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9OYXZCYXIuanMnKSlcbiAgICAuZmFjdG9yeSgnVG9wTmF2QmFyJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9Ub3BOYXZCYXIuanMnKSlcbiAgICAuZmFjdG9yeSgnTm90aWZpY2F0aW9ucycsIHJlcXVpcmUoJy4vc2VydmljZXMvTm90aWZpY2F0aW9ucy5qcycpKVxuICAgIC5mYWN0b3J5KCdUcmFuc2xhdGlvbnMnLCByZXF1aXJlKCcuL3NlcnZpY2VzL1RyYW5zbGF0aW9ucy5qcycpKVxuICAgIC5mYWN0b3J5KCdTdG9yYWdlJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9TdG9yYWdlLmpzJykpXG4gICAgLnJ1bihbXG4gICAgICAgICdUb3BOYXZCYXInLFxuICAgICAgICBmdW5jdGlvbihUb3BOYXZCYXIpIHtcbiAgICAgICAgICAgIFRvcE5hdkJhci5hZGQoXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0RBU0hCT0FSRCcsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2hvbWUnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFRvcE5hdkJhci5hZGQoXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1NFVFRJTkdTJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnY29udGVudC5saXN0J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBUb3BOYXZCYXIuYWRkTGFzdENoaWxkKFxuICAgICAgICAgICAgICAgICdTRVRUSU5HUycsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FMTF9DT05URU5UUycsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2NvbnRlbnQubGlzdCdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgVG9wTmF2QmFyLmFkZExhc3RDaGlsZChcbiAgICAgICAgICAgICAgICAnU0VUVElOR1MnLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdBRERfTkVXJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnY29udGVudC5hZGQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIF0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBMYW5nUmVwb3NpdG9yeShSZXN0YW5ndWxhcikge1xuICAgIC8qKlxuICAgICAqIEN1c3RvbSBtZXRob2RzXG4gICAgICovXG4gICAgUmVzdGFuZ3VsYXIuZXh0ZW5kTW9kZWwoJ2xhbmdzJywgZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgbW9kZWwudGVzdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICd0ZXN0JztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH0pO1xuXG4gICAgdmFyIGFwaSA9IFJlc3Rhbmd1bGFyLmFsbCgnYWRtaW4vbGFuZ3MnKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvbmU6IGZ1bmN0aW9uKGNvZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBhcGkuZ2V0KGNvZGUpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBhcGkuZ2V0TGlzdCgpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuTGFuZ1JlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gTGFuZ1JlcG9zaXRvcnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE5hdkJhcigpIHtcbiAgICAvKiogQHZhciBOYXZpZ2F0aW9uICovXG4gICAgcmV0dXJuIHJlcXVpcmUoJy4uLy4uL2xpYi9uYXZpZ2F0aW9uLmpzJykoKTtcbn1cblxubW9kdWxlLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gTmF2QmFyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBOb3RpZmljYXRpb25zKCRhbGVydCwgJHRyYW5zbGF0ZSkge1xuICAgIHZhciBjb250YWluZXIgPSAnYm9keSc7XG4gICAgdmFyIHBsYWNlbWVudCA9ICd0b3AtcmlnaHQnO1xuICAgIHZhciB0eXBlID0gNTtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB3aGljaCBzaG93cyBtZXNzYWdlcyBvZiBnaXZlbiB0eXBlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb24gdXNlZCB0byBzaG93IGVhY2ggbWVzc2FnZVxuICAgICAqIEBwYXJhbSBtZXNzYWdlcyBtZXNzYWdlcyB0byBzaG93XG4gICAgICovXG4gICAgdmFyIGFkZE1lc3NhZ2VzID0gZnVuY3Rpb24oY2FsbGJhY2ssIG1lc3NhZ2VzKSB7XG4gICAgICAgIF8uZm9yRWFjaChtZXNzYWdlcywgZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG1lc3NhZ2VzWzBdKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgbXVsdGlwbGUgQW5ndWxhclN0cmFwIGluZm8gdHlwZSBhbGVydHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2VzIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyB0byBzaG93XG4gICAgICAgICAqL1xuICAgICAgICBhZGRJbmZvczogZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGFkZE1lc3NhZ2VzKHNlbGYuYWRkSW5mbywgbWVzc2FnZXMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgbXVsdGlwbGUgQW5ndWxhclN0cmFwIGRhbmdlciB0eXBlIGFsZXJ0c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZXMgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIHRvIHNob3dcbiAgICAgICAgICovXG4gICAgICAgIGFkZEVycm9yczogZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGFkZE1lc3NhZ2VzKHNlbGYuYWRkRXJyb3IsIG1lc3NhZ2VzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIG11bHRpcGxlIEFuZ3VsYXJTdHJhcCB3YXJuaW5nIHR5cGUgYWxlcnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlcyB0cmFuc2xhdGFibGUgbWVzc2FnZXMgdG8gc2hvd1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkV2FybmluZ3M6IGZ1bmN0aW9uKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBhZGRNZXNzYWdlcyhzZWxmLmFkZFdhcm5pbmcsIG1lc3NhZ2VzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIG11bHRpcGxlIEFuZ3VsYXJTdHJhcCBzdWNjZXNzIHR5cGUgYWxlcnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlcyB0cmFuc2xhdGFibGUgbWVzc2FnZXMgdG8gc2hvd1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkU3VjY2Vzc2VzOiBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgYWRkTWVzc2FnZXMoc2VsZi5hZGRTdWNjZXNzLCBtZXNzYWdlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIGluZm8gdHlwZSBhbGVydFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZSBzdHJpbmcgZWcuICdDT01NT05fRVJST1InXG4gICAgICAgICAqL1xuICAgICAgICBhZGRJbmZvOiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICAkYWxlcnQoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAkdHJhbnNsYXRlLmluc3RhbnQoJ0lORk9STUFUSU9OJykgKyAnOicsXG4gICAgICAgICAgICAgICAgY29udGVudDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UpLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogcGxhY2VtZW50LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiB0eXBlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdpbmZvJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIGRhbmdlciB0eXBlIGFsZXJ0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlIHN0cmluZyBlZy4gJ0NPTU1PTl9FUlJPUidcbiAgICAgICAgICovXG4gICAgICAgIGFkZEVycm9yOiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICAkYWxlcnQoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAkdHJhbnNsYXRlLmluc3RhbnQoJ0VSUk9SJykgKyAnOicsXG4gICAgICAgICAgICAgICAgY29udGVudDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UpLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogcGxhY2VtZW50LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiB0eXBlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgd2FybmluZyB0eXBlIGFsZXJ0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlIHN0cmluZyBlZy4gJ0NPTU1PTl9FUlJPUidcbiAgICAgICAgICovXG4gICAgICAgIGFkZFdhcm5pbmc6IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICR0cmFuc2xhdGUuaW5zdGFudCgnV0FSTklORycpICsgJzonLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICR0cmFuc2xhdGUuaW5zdGFudChtZXNzYWdlKSxcbiAgICAgICAgICAgICAgICBjb250YWluZXI6IGNvbnRhaW5lcixcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6IHBsYWNlbWVudCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogdHlwZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnd2FybmluZydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBzdWNjZXNzIHR5cGUgYWxlcnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2Ugc3RyaW5nIGVnLiAnQ09NTU9OX0VSUk9SJ1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkU3VjY2VzczogZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAgICAgJGFsZXJ0KHtcbiAgICAgICAgICAgICAgICB0aXRsZTogJHRyYW5zbGF0ZS5pbnN0YW50KCdTVUNDRVNTJykgKyAnOicsXG4gICAgICAgICAgICAgICAgY29udGVudDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UpLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogcGxhY2VtZW50LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiB0eXBlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5tb2R1bGUuJGluamVjdCA9IFsnJGFsZXJ0JywgJyR0cmFuc2xhdGUnXTtcbm1vZHVsZS5leHBvcnRzID0gTm90aWZpY2F0aW9ucztcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3RvcmFnZSgpIHtcbiAgICB2YXIgc3RvcmFnZUl0ZW1zID0ge307XG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgc3BlY2lmaWVkIG9iamVjdCB0byB0aGUgc3RvcmFnZUl0ZW1zXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIHNldFN0b3JhZ2VJdGVtOiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJdGVtcyA9ICAgXy5tZXJnZShzdG9yYWdlSXRlbXMsIG9iamVjdCwgZnVuY3Rpb24ob2JqZWN0VmFsdWUsIHNvdXJjZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheShvYmplY3RWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICBzb3VyY2VWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJldHVybnMgdGhlIHNwZWNpZmllZCBvYmplY3QgZnJvbSB0aGUgc3RvcmFnZUl0ZW1zXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0U3RvcmFnZUl0ZW06IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gc3RvcmFnZUl0ZW1zW2luZGV4XTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJlbW92ZXMgc3BlY2lmaWVkIG9iamVjdCBmcm9tIHRoZSBzdG9yYWdlSXRlbXNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGluZGV4XG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVTdG9yYWdlSXRlbTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJdGVtcyA9IF8ub21pdChzdG9yYWdlSXRlbXMsIGluZGV4KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblN0b3JhZ2UuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb3BOYXZCYXIoKSB7XG4gICAgLyoqIEB2YXIgTmF2aWdhdGlvbiAqL1xuICAgIHJldHVybiByZXF1aXJlKCcuLi8uLi9saWIvbmF2aWdhdGlvbi5qcycpKCk7XG59XG5cbm1vZHVsZS4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFRvcE5hdkJhcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVHJhbnNsYXRpb25zKCRxLCAkdHJhbnNsYXRlLCBMYW5nUmVwb3NpdG9yeSkge1xuICAgIC8vY3JlYXRlIGRlZmVycmVkIHByb21pc2VcbiAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgLy9nZXQgbGFuZ3VhZ2VzXG4gICAgTGFuZ1JlcG9zaXRvcnkubGlzdCgpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgdmFyIGxhbmd1YWdlcyA9IHt9O1xuICAgICAgICBsYW5ndWFnZXMubGFuZ3MgPSByZXNwb25zZTtcbiAgICAgICAgbGFuZ3VhZ2VzLmN1cnJlbnRMYW5nID0gbGFuZ3VhZ2VzLmxpc3RMYW5nID0gcmVzcG9uc2VbMF07XG5cbiAgICAgICAgLy8gcmVzb2x2ZSB0aHIgcHJvbWlzZVxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGxhbmd1YWdlcyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcmV0dXJucyB0aGUgb2JqZWN0IG9mIGxhbmd1YWdlc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0VHJhbnNsYXRpb25zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2V0cyB0aGUgbGFuZ3VhZ2Ugb2YgdGhlIHRyYW5zbGF0aW9uIGZvciB0aGUgYW5ndWxhci10cmFuc2xhdGUgbW9kdWxlXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBsYW5nIG9iamVjdCB0aGF0IHdpbGwgYmUgdXNlZCB0byB0cmFuc2xhdGVcbiAgICAgICAgICovXG4gICAgICAgIHNlbGVjdEFkbWluTGFuZzogZnVuY3Rpb24obGFuZykge1xuICAgICAgICAgICAgJHRyYW5zbGF0ZS5mYWxsYmFja0xhbmd1YWdlKFsnZW5fVVMnXSk7XG4gICAgICAgICAgICAkdHJhbnNsYXRlLnVzZShsYW5nLmkxOG4pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblRyYW5zbGF0aW9ucy4kaW5qZWN0ID0gWyckcScsICckdHJhbnNsYXRlJywgJ0xhbmdSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zbGF0aW9ucztcblxuIiwiZnVuY3Rpb24gTmF2aWdhdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIGNoZWNrcyBpZiAnaXRlbScgc3RydWN0dXJlIGlzIHZhbGlkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB2YXIgY2hlY2tTdHJ1Y3R1cmUgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGlmIChfLmhhcyhpdGVtLCAnZGl2aWRlcicpKSB7XG4gICAgICAgICAgICBpZiAoaXRlbS5kaXZpZGVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9wZXJ0eTogJyArICdcXCdkaXZpZGVyXFwnJyArICcgbXVzdCBiZSBzZXQgdG8gXFwndHJ1ZVxcJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFfLmhhcyhpdGVtLCAndGl0bGUnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9wZXJ0eTogJyArICd0aXRsZScgKyAnIGlzIG1pc3NpbmcnKTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5oYXMoaXRlbSwgJ2FjdGlvbicpICYmICFfLmhhcyhpdGVtLCAnaHJlZicpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb3BlcnR5OiAnICsgJ1xcJ2FjdGlvblxcJyBvciBcXCdocmVmXFwnJyArICcgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiByZXR1cm5zIGNoaWxkcmVuIG9mIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgdmFyIGdldENoaWxkcmVuID0gZnVuY3Rpb24odGl0bGUpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW10sXG4gICAgICAgICAgICBmb3VuZEZsYWcgPSBmYWxzZTtcbiAgICAgICAgXy5mb3JFYWNoKGl0ZW1zLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS50aXRsZSA9PT0gdGl0bGUpIHtcbiAgICAgICAgICAgICAgICBmb3VuZEZsYWcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChfLmhhcyh2YWx1ZSwgJ2NoaWxkcmVuJykgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZS5jaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW4gPSB2YWx1ZS5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGZvdW5kRmxhZyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGFyZW50OiBcXCcnICsgdGl0bGUgKyAnXFwnIGhhdmUgbm8gY2hpbGRyZW4sIGJlY2F1c2UgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiBhZGRzIGVsZW1lbnQgYWNjb3JkaW5nIHRvICdwb3NpdGlvbicgYXJndW1lbnRcbiAgICAgKiBwb3NpdGlvbiA9ICdiZWZvcmUnIC0gZWxlbWVudCB3aWxsIGJlIGFkZGVkIGJlZm9yZSBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICogcG9zaXRpb24gPSAnYWZ0ZXInIC0gZWxlbWVudCB3aWxsIGJlIGFkZGVkIGFmdGVyIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgKiBAcGFyYW0gcG9zaXRpb24gc3RyaW5nXG4gICAgICovXG4gICAgdmFyIGFkZEJlZm9yZUFmdGVyID0gZnVuY3Rpb24odGl0bGUsIGl0ZW0sIHBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcG9zaXRpb24gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIGlzIHJlcXVpcmVkLCB2YWx1ZXM6IFxcJ2JlZm9yZVxcJyBvciBcXCdhZnRlclxcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwb3NpdGlvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgbXVzdCBiZSBvZiBzdHJpbmcgdHlwZSwgdmFsdWVzOiBcXCdiZWZvcmVcXCcgb3IgXFwnYWZ0ZXJcXCcnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgIHZhciBmb3VuZEZsYWcgPSBmYWxzZTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChpdGVtcywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnRpdGxlID09PSB0aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZEZsYWcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT09ICdiZWZvcmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnYWZ0ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXggKyAxLCAwLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZm91bmRGbGFnID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRWxlbWVudDogXFwnJyArIHRpdGxlICsgJ1xcJyBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiBhZGRzIGNoaWxkIGxpbmsgYWNjb3JkaW5nIHRvICdwb3NpdGlvbicgYXJndW1lbnRcbiAgICAgKiBwb3NpdGlvbiA9IHRydWUgLSBjaGlsZCB3aWxsIGJlIGFkZGVkIGFzIGZpcnN0IGVsZW1lbnRcbiAgICAgKiBwb3NpdGlvbiA9IGZhbHNlIC0gY2hpbGQgd2lsbCBiZSBhZGRlZCBhcyBsYXN0IGVsZW1lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICogQHBhcmFtIHBvc2l0aW9uIGJvb2xlYW5cbiAgICAgKi9cbiAgICB2YXIgYWRkQ2hpbGQgPSBmdW5jdGlvbihwYXJlbnQsIGl0ZW0sIHBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcG9zaXRpb24gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwb3NpdGlvbiAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIG11c3QgYmUgb2YgYm9vbGVhbiB0eXBlJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoZWNrU3RydWN0dXJlKGl0ZW0pKSB7XG4gICAgICAgICAgICB2YXIgZm91bmRGbGFnID0gZmFsc2U7XG4gICAgICAgICAgICBfLmZvckVhY2goaXRlbXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS50aXRsZSA9PT0gcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghXy5oYXModmFsdWUsICdjaGlsZHJlbicpIHx8ICFBcnJheS5pc0FycmF5KHZhbHVlLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUuY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmNoaWxkcmVuLnVuc2hpZnQoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5jaGlsZHJlbi5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kRmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChmb3VuZEZsYWcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJlbnQ6IFxcJycgKyBwYXJlbnQgKyAnXFwnIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIGFkZHMgY2hpbGQgbGluayBhY2NvcmRpbmcgdG8gJ3Bvc2l0aW9uJyBhcmd1bWVudFxuICAgICAqIHBvc2l0aW9uID0gJ2JlZm9yZScgLSBjaGlsZCB3aWxsIGJlIGFkZGVkIGJlZm9yZSBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICogcG9zaXRpb24gPSAnYWZ0ZXInIC0gY2hpbGQgd2lsbCBiZSBhZGRlZCBhZnRlciBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyZW50IHN0cmluZ1xuICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgKiBAcGFyYW0gcG9zaXRpb24gc3RyaW5nXG4gICAgICovXG4gICAgdmFyIGFkZEJlZm9yZUFmdGVyQ2hpbGQgPSBmdW5jdGlvbihwYXJlbnQsIHRpdGxlLCBpdGVtLCBwb3NpdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIHBvc2l0aW9uID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBcXCdwb3NpdGlvblxcJyBpcyByZXF1aXJlZCwgdmFsdWVzOiBcXCdiZWZvcmVcXCcgb3IgXFwnYWZ0ZXJcXCcnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcG9zaXRpb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIG11c3QgYmUgb2Ygc3RyaW5nIHR5cGUsIHZhbHVlczogXFwnYmVmb3JlXFwnIG9yIFxcJ2FmdGVyXFwnJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoZWNrU3RydWN0dXJlKGl0ZW0pKSB7XG4gICAgICAgICAgICB2YXIgZm91bmRGbGFnID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgY2hpbGRyZW4gPSBnZXRDaGlsZHJlbihwYXJlbnQpO1xuXG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJlbnQ6IFxcJycgKyBwYXJlbnQgKyAnXFwnIGhhdmUgbm8gY2hpbGRyZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF8uZm9yRWFjaChjaGlsZHJlbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnRpdGxlID09PSB0aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZEZsYWcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT09ICdiZWZvcmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnYWZ0ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbi5zcGxpY2UoaW5kZXggKyAxLCAwLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZm91bmRGbGFnID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2hpbGQ6IFxcJycgKyB0aXRsZSArICdcXCcgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50IHRvIHRoZSBlbmQgb2YgbWVudVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZDogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgaWYgKGNoZWNrU3RydWN0dXJlKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgZWxlbWVudCB0byB0aGUgbWVudSBhcyBmaXJzdFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZEZpcnN0OiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50ICdpdGVtJyB0byB0aGUgbWVudSBiZWZvcmUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQmVmb3JlOiBmdW5jdGlvbih0aXRsZSwgaXRlbSkge1xuICAgICAgICAgICAgYWRkQmVmb3JlQWZ0ZXIodGl0bGUsIGl0ZW0sICdiZWZvcmUnKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgZWxlbWVudCAnaXRlbScgdG8gdGhlIG1lbnUgYWZ0ZXIgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBuZXdJdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQWZ0ZXI6IGZ1bmN0aW9uKHRpdGxlLCBuZXdJdGVtKSB7XG4gICAgICAgICAgICBhZGRCZWZvcmVBZnRlcih0aXRsZSwgbmV3SXRlbSwgJ2FmdGVyJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGNoaWxkIGxpbmsgYXMgZmlyc3QgdG8gdGhlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICdwYXJlbnQnIGFyZ3VtZW50XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkRmlyc3RDaGlsZDogZnVuY3Rpb24ocGFyZW50LCBpdGVtKSB7XG4gICAgICAgICAgICBhZGRDaGlsZChwYXJlbnQsIGl0ZW0sIHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBjaGlsZCBsaW5rIGFzIGxhc3QgdG8gdGhlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICdwYXJlbnQnIGFyZ3VtZW50XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkTGFzdENoaWxkOiBmdW5jdGlvbihwYXJlbnQsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZENoaWxkKHBhcmVudCwgaXRlbSwgZmFsc2UpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBsaW5rIHRvIHRoZSBlbGVtZW50IHNwZWNpZmllZCBieSAncGFyZW50JyBiZWZvcmUgY2hpbGQgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gcGFyZW50IHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQmVmb3JlQ2hpbGQ6IGZ1bmN0aW9uKHBhcmVudCwgdGl0bGUsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZEJlZm9yZUFmdGVyQ2hpbGQocGFyZW50LCB0aXRsZSwgaXRlbSwgJ2JlZm9yZScpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBsaW5rIHRvIHRoZSBlbGVtZW50IHNwZWNpZmllZCBieSAncGFyZW50JyBhZnRlciBjaGlsZCBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRBZnRlckNoaWxkOiBmdW5jdGlvbihwYXJlbnQsIHRpdGxlLCBpdGVtKSB7XG4gICAgICAgICAgICBhZGRCZWZvcmVBZnRlckNoaWxkKHBhcmVudCwgdGl0bGUsIGl0ZW0sICdhZnRlcicpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcmV0dXJuIGl0ZW1zIGZyb20gbWVudVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICAgICAqL1xuICAgICAgICBnZXRJdGVtczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBleHBvcnRzIGxpbmtzIHRvICdkcm9wZG93bicgbWVudVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICAgICAqL1xuICAgICAgICBleHBvcnRUb0Ryb3Bkb3duTWVudTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgdmFyIG5ld0l0ZW0gPSB7fTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChpdGVtcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBfLmZvckluKHZhbHVlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09ICd0aXRsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0udGV4dCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gobmV3SXRlbSk7XG4gICAgICAgICAgICAgICAgbmV3SXRlbSA9IHt9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgfVxuICAgIH07XG59XG5tb2R1bGUuZXhwb3J0cyA9IE5hdmlnYXRpb247XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyTGlzdEN0cmwoJHNjb3BlLCAkc3RhdGUsIFVzZXJSZXBvc2l0b3J5LCAkbW9kYWwpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy91c2VyL2RpcmVjdGl2ZXMvJztcbiAgICAvLyBEZWxldGUgbW9kYWxcbiAgICB2bS5kZWxldGVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB2aWV3UGF0aCArICd1c2VyRGVsZXRlTW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHVzZXJJZCB1c2VyIGlkIHRvIGJlIHJlbW92ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbih1c2VySWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLnVzZXJJZCA9IHVzZXJJZDtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdERUxFVEVfVVNFUl9RVUVTVElPTicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBERUxFVEUgYWN0aW9uIGZvciB1c2VyIGlkIGluIHNjb3BlXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBkZWxldGVVc2VyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIFVzZXJSZXBvc2l0b3J5LmRlbGV0ZSh2bS51c2VySWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfTtcbn1cblxuVXNlckxpc3RDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCAnVXNlclJlcG9zaXRvcnknLCAnJG1vZGFsJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJMaXN0Q3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJEZXRhaWxzQ3RybCgkc2NvcGUsICRzdGF0ZVBhcmFtcywgVXNlclJlcG9zaXRvcnkpIHtcbiAgICAvLyBnZXQgc2luZ2xlIHVzZXJcbiAgICBVc2VyUmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLnVzZXJJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAkc2NvcGUudXNlciA9IFVzZXJSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKTtcbiAgICB9KTtcbn1cblVzZXJEZXRhaWxzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgJ1VzZXJSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJEZXRhaWxzQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJEZXRhaWxzQ3RybCgkc2NvcGUsICRzdGF0ZSwgJHN0YXRlUGFyYW1zLCBVc2VyUmVwb3NpdG9yeSwgTm90aWZpY2F0aW9ucykge1xuICAgIC8vIGdldCBzaW5nbGUgdXNlclxuICAgIFVzZXJSZXBvc2l0b3J5Lm9uZSgkc3RhdGVQYXJhbXMudXNlcklkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICRzY29wZS51c2VyID0gVXNlclJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnNhdmVVc2VyID0gZnVuY3Rpb24oKXtcbiAgICAgICAgVXNlclJlcG9zaXRvcnkudXBkYXRlKCRzY29wZS51c2VyLmlkLCAkc2NvcGUudXNlcikudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ3VzZXIubGlzdCcpO1xuICAgICAgICAgICAgTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufVxuVXNlckRldGFpbHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCckc3RhdGVQYXJhbXMnLCAnVXNlclJlcG9zaXRvcnknLCAnTm90aWZpY2F0aW9ucyddO1xubW9kdWxlLmV4cG9ydHMgPSBVc2VyRGV0YWlsc0N0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyTGlzdEN0cmwoJHNjb3BlLCAkc3RhdGVQYXJhbXMsICRyb290U2NvcGUsIFVzZXJSZXBvc2l0b3J5LCBOZ1RhYmxlUGFyYW1zKSB7XG4gICAgJHNjb3BlLnRhYmxlUGFyYW1zID0gbmV3IE5nVGFibGVQYXJhbXMoe1xuICAgICAgICBjb3VudDogMjUsIC8vIGNvdW50IHBlciBwYWdlXG4gICAgICAgIHNvcnRpbmc6IHtcbiAgICAgICAgICAgICdpZCc6ICdkZXNjJyAvLyBpbml0aWFsIHNvcnRpbmdcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAgdG90YWw6IDAsIC8vIGxlbmd0aCBvZiBkYXRhXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCRkZWZlciwgcGFyYW1zKSB7XG4gICAgICAgICAgICAvLyBwcmVwYXJlIG9wdGlvbnMgdG8gYmUgc2VudCB0byBhcGlcbiAgICAgICAgICAgIHZhciBxdWVyeU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbGFuZzogJHNjb3BlLmxpc3RMYW5nLmNvZGUsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3VzZXInXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBwYXJhbXMuY291bnQoKSAtIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSBkZWNsYXJlZCBpbiB2aWV3XG4gICAgICAgICAgICBpZiAodHlwZW9mICRzdGF0ZVBhcmFtcy5wZXJQYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5jb3VudCgkc3RhdGVQYXJhbXMucGVyUGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBlclBhZ2UgPSBwYXJhbXMuY291bnQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyYW1zLnBhZ2UoKSAtIGN1cnJlbnQgcGFnZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiAkc3RhdGVQYXJhbXMucGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucGFnZSgkc3RhdGVQYXJhbXMucGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBhZ2UgPSBwYXJhbXMucGFnZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0YWJsZVBhcmFtcy5vcmRlckJ5KCkgLSBhbiBhcnJheSBvZiBzdHJpbmcgaW5kaWNhdGluZyBib3RoIHRoZSBzb3J0aW5nIGNvbHVtbiBhbmQgZGlyZWN0aW9uIChlLmcuIFtcIituYW1lXCIsIFwiLWVtYWlsXCJdKVxuICAgICAgICAgICAgaWYgKHBhcmFtcy5zb3J0aW5nKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IGludGVyZXN0ZWQgaW4gZmlyc3Qgc29ydCBjb2x1bW4gZm9yIG5vd1xuICAgICAgICAgICAgICAgIHZhciBvcmRlckJ5ID0gcGFyYW1zLm9yZGVyQnkoKVswXTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMuc29ydCA9IG9yZGVyQnlbMF0gPT09ICcrJyA/IG9yZGVyQnkuc3Vic3RyaW5nKDEpIDogb3JkZXJCeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZ2V0IGxpc3QgYnkgZGVmYXVsdFxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBVc2VyUmVwb3NpdG9yeS5saXN0KHF1ZXJ5T3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIENvbnRlbnRzIGlzIGEgUkVTVCBBbmd1bGFySlMgc2VydmljZSB0aGF0IHRhbGtzIHRvIGFwaSBhbmQgcmV0dXJuIHByb21pc2VcbiAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy50b3RhbChyZXNwb25zZS5tZXRhLnRvdGFsKTtcbiAgICAgICAgICAgICAgICAkZGVmZXIucmVzb2x2ZShVc2VyUmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5tZXRhID0gcmVzcG9uc2UubWV0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblVzZXJMaXN0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgJyRyb290U2NvcGUnLCAnVXNlclJlcG9zaXRvcnknLCAnbmdUYWJsZVBhcmFtcyddO1xubW9kdWxlLmV4cG9ydHMgPSBVc2VyTGlzdEN0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyRGVsZXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyRGVsZXRlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIFVzZXJEZWxldGVDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgYSBkZWxldGUgbW9kYWwgZnJvbSBhIGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICBVc2VyRGVsZXRlQ29udHJvbGxlci5kZWxldGVNb2RhbC5zaG93TW9kYWwoYXR0cnMudXNlcklkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuVXNlckRlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJEZWxldGVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhZG1pbi51c2VyJywgWyduZ1RhYmxlJ10pXG4gICAgLmNvbmZpZyhbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgICckdXJsUm91dGVyUHJvdmlkZXInLFxuICAgICAgICAnUmVzdGFuZ3VsYXJQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsIFJlc3Rhbmd1bGFyUHJvdmlkZXIpIHtcblxuICAgICAgICAgICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL3VzZXIvJztcblxuICAgICAgICAgICAgLy8gTm93IHNldCB1cCB0aGUgc3RhdGVzXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgIC5zdGF0ZSgndXNlcicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3VzZXInLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnaW5kZXguaHRtbCdcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgndXNlci5zaG93Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve3VzZXJJZH0vc2hvdycsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVXNlckRldGFpbHNDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuc3RhdGUoJ3VzZXIuZWRpdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3t1c2VySWR9L2VkaXQnLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2VkaXQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1VzZXJFZGl0Q3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCd1c2VyLmxpc3QnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9saXN0L3t1c2VySWR9P3BhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnbGlzdC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5jb250cm9sbGVyKCdVc2VyTGlzdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL1VzZXJMaXN0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdVc2VyRGVsZXRlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvVXNlckRlbGV0ZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignVXNlckVkaXRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Vc2VyRWRpdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignVXNlckRldGFpbHNDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Vc2VyRGV0YWlsc0N0cmwnKSlcbiAgICAuZmFjdG9yeSgnVXNlclJlcG9zaXRvcnknLCByZXF1aXJlKCcuL3NlcnZpY2VzL1VzZXJSZXBvc2l0b3J5LmpzJykpXG4gICAgLmRpcmVjdGl2ZSgndXNlckRlbGV0ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Vc2VyRGVsZXRlQnV0dG9uLmpzJykpXG4gICAgLnJ1bihbXG4gICAgICAgICdOYXZCYXInLFxuICAgICAgICBmdW5jdGlvbihOYXZCYXIpIHtcbiAgICAgICAgICAgIE5hdkJhci5hZGQoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAnVVNFUicsIGFjdGlvbjogJ3VzZXIubGlzdCcsIGljb246ICdmYSBmYS11c2VyJ1xuICAgICAgICAgICAgICAgIC8vY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAgICAvLyAgICB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgIHRpdGxlOiAnVVNFUl9MSVNUJyxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgYWN0aW9uOiAndXNlci5saXN0JyxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgaWNvbjogJ2ZhIGZhLXRoJ1xuICAgICAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgICAgICAvL11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyUmVwb3NpdG9yeShSZXN0YW5ndWxhcikge1xuICAgIHZhciBhcGkgPSAnYWRtaW4vdXNlcnMnO1xuICAgIHZhciB1c2VycyA9IFJlc3Rhbmd1bGFyLmFsbChhcGkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG9uZTogZnVuY3Rpb24oaWQsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5nZXQocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgdHJlZTogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSkuZ2V0TGlzdCgndHJlZScsIHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGxpc3Q6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIHVzZXJzLmdldExpc3QocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYW46IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5zdHJpcFJlc3Rhbmd1bGFyKGVsZW0pO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGU6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLnJlbW92ZSgpO1xuICAgICAgICB9LFxuICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uKGlkLCB1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmN1c3RvbVBVVCh1c2VyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblVzZXJSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJSZXBvc2l0b3J5O1xuIl19
