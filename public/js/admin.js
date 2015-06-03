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

            // $stateParams filters
            queryOptions = _.merge(queryOptions, $stateParams);
            $scope.activeFilter = $stateParams;

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
                    url: '/trashcan?isActive&type&page&perPage',
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2lzLWFycmF5L2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRBZGRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudERhc2hib2FyZEN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50RGVsZXRlQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnREZXRhaWxzQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRMaXN0Q3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRSb3V0ZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50VHJhc2hjYW5DdHJsLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50RGVsZXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50RWRpdFJvdXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvbW9kdWxlLmpzIiwic3JjL2NvbnRlbnQvc2VydmljZXMvQ29udGVudFJlcG9zaXRvcnkuanMiLCJzcmMvY29yZS9jb250cm9sbGVycy9Db3JlQ3RybC5qcyIsInNyYy9jb3JlL2ZpbHRlcnMvQ29yZUZpbHRlcnMuanMiLCJzcmMvY29yZS9tb2R1bGUuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9MYW5nUmVwb3NpdG9yeS5qcyIsInNyYy9jb3JlL3NlcnZpY2VzL05hdkJhci5qcyIsInNyYy9jb3JlL3NlcnZpY2VzL05vdGlmaWNhdGlvbnMuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9TdG9yYWdlLmpzIiwic3JjL2NvcmUvc2VydmljZXMvVG9wTmF2QmFyLmpzIiwic3JjL2NvcmUvc2VydmljZXMvVHJhbnNsYXRpb25zLmpzIiwic3JjL2xpYi9uYXZpZ2F0aW9uLmpzIiwic3JjL3VzZXIvY29udHJvbGxlcnMvVXNlckRlbGV0ZUN0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyRGV0YWlsc0N0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyRWRpdEN0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyTGlzdEN0cmwuanMiLCJzcmMvdXNlci9kaXJlY3RpdmVzL1VzZXJEZWxldGVCdXR0b24uanMiLCJzcmMvdXNlci9tb2R1bGUuanMiLCJzcmMvdXNlci9zZXJ2aWNlcy9Vc2VyUmVwb3NpdG9yeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3Q0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9jb3JlL21vZHVsZS5qcycpO1xucmVxdWlyZSgnLi9jb250ZW50L21vZHVsZS5qcycpO1xucmVxdWlyZSgnLi91c2VyL21vZHVsZS5qcycpO1xuXG52YXIgZGVwZW5kZW5jaWVzID0gW1xuICAgICdyZXN0YW5ndWxhcicsXG4gICAgJ3VpLnJvdXRlcicsXG4gICAgJ25nQW5pbWF0ZScsXG4gICAgJ21nY3JlYS5uZ1N0cmFwJyxcbiAgICAncGFzY2FscHJlY2h0LnRyYW5zbGF0ZScsXG4gICAgJ2FkbWluLmNvcmUnLFxuICAgICdhZG1pbi5jb250ZW50JyxcbiAgICAnYWRtaW4udXNlcidcbl07XG5kZXBlbmRlbmNpZXMucHVzaC5hcHBseShkZXBlbmRlbmNpZXMsIG1vZHVsZXMpOyAvLyBPdGhlciBtb2R1bGVzIGFyZSBsb2FkZWQgYnkgdHdpZ1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4nLCBkZXBlbmRlbmNpZXMpLmNvbmZpZyhbXG4gICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAnJHVybFJvdXRlclByb3ZpZGVyJyxcbiAgICAnUmVzdGFuZ3VsYXJQcm92aWRlcicsXG4gICAgJyR0cmFuc2xhdGVQcm92aWRlcicsXG4gICAgJyR0cmFuc2xhdGVQYXJ0aWFsTG9hZGVyUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsIFJlc3Rhbmd1bGFyUHJvdmlkZXIsICR0cmFuc2xhdGVQcm92aWRlciwgJHRyYW5zbGF0ZVBhcnRpYWxMb2FkZXJQcm92aWRlcikge1xuICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvJztcblxuICAgICAgICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9zdGF0ZTFcbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICAgICAgIC8vIE5vdyBzZXQgdXAgdGhlIHN0YXRlc1xuICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKCdob21lJywge1xuICAgICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdob21lLmh0bWwnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIudXNlTG9hZGVyKCckdHJhbnNsYXRlUGFydGlhbExvYWRlcicsIHtcbiAgICAgICAgICAgIHVybFRlbXBsYXRlOiAnZ3plcm8ve3BhcnR9L2xhbmcve2xhbmd9Lmpzb24nXG4gICAgICAgIH0pO1xuICAgICAgICAkdHJhbnNsYXRlUGFydGlhbExvYWRlclByb3ZpZGVyLmFkZFBhcnQoJ2FkbWluJyk7XG5cbiAgICAgICAgLy8kdHJhbnNsYXRlUHJvdmlkZXIucHJlZmVycmVkTGFuZ3VhZ2UoJ3BsX1BMJyk7XG4gICAgICAgICR0cmFuc2xhdGVQcm92aWRlci5wcmVmZXJyZWRMYW5ndWFnZSgnZW5fVVMnKTtcblxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldEJhc2VVcmwoQ29uZmlnLmFwaVVybCArICcvdjEnKTtcblxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldERlZmF1bHRIdHRwRmllbGRzKHtcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZW5hbWUgUmVzdGFuZ3VsYXIgcm91dGUgZmllbGQgdG8gdXNlIGEgJCBwcmVmaXggZm9yIGVhc3kgZGlzdGluY3Rpb24gYmV0d2VlbiBkYXRhIGFuZCBtZXRhZGF0YVxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldFJlc3Rhbmd1bGFyRmllbGRzKHtyb3V0ZTogJyRyb3V0ZSd9KTtcblxuICAgICAgICAvLyBhZGQgYSByZXNwb25zZSBpbnRlcmVjZXB0b3JcbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5hZGRSZXNwb25zZUludGVyY2VwdG9yKGZ1bmN0aW9uKGRhdGEsIG9wZXJhdGlvbikge1xuICAgICAgICAgICAgdmFyIGV4dHJhY3RlZERhdGE7XG4gICAgICAgICAgICAvLyAuLiB0byBsb29rIGZvciBnZXRMaXN0IG9wZXJhdGlvbnNcblxuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJ2dldExpc3QnKSB7XG4gICAgICAgICAgICAgICAgLy8gLi4gYW5kIGhhbmRsZSB0aGUgZGF0YSBhbmQgbWV0YSBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhLmRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEubWV0YSA9IGRhdGEubWV0YTtcbiAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkRGF0YS5wYXJhbXMgPSBkYXRhLnBhcmFtcztcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyBvbmx5IG9uZSBpdGVtIGluIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkRGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEgPSBkYXRhO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZXh0cmFjdGVkRGF0YTtcbiAgICAgICAgfSk7XG4gICAgfVxuXSkucnVuKFtcbiAgICAnTmF2QmFyJyxcbiAgICAnJHJvb3RTY29wZScsXG4gICAgJ1Jlc3Rhbmd1bGFyJyxcbiAgICAnTm90aWZpY2F0aW9ucycsXG4gICAgZnVuY3Rpb24oTmF2QmFyLCAkcm9vdFNjb3BlLCBSZXN0YW5ndWxhciwgTm90aWZpY2F0aW9ucykge1xuICAgICAgICBOYXZCYXIuYWRkRmlyc3Qoe3RpdGxlOiAnREFTSEJPQVJEJywgYWN0aW9uOiAnaG9tZScsIGljb246ICdmYSBmYS1ob21lJ30pO1xuICAgICAgICAkcm9vdFNjb3BlLmJhc2VVcmwgPSBDb25maWcudXJsO1xuXG4gICAgICAgIFJlc3Rhbmd1bGFyLnNldEVycm9ySW50ZXJjZXB0b3IoZnVuY3Rpb24ocmVzcG9uc2UsIGRlZmVycmVkLCByZXNwb25zZUhhbmRsZXIpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ0NPTU1PTl9FUlJPUicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gZXJyb3IgaGFuZGxlZFxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDUwMCkge1xuICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkRXJyb3IocmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkRXJyb3JzKHJlc3BvbnNlLmRhdGEubWVzc2FnZXMpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBlcnJvciBub3QgaGFuZGxlZFxuICAgICAgICB9KTtcbiAgICB9XG5dKTtcbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpcy1hcnJheScpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG52YXIga01heExlbmd0aCA9IDB4M2ZmZmZmZmZcbnZhciByb290UGFyZW50ID0ge31cblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAtIEltcGxlbWVudGF0aW9uIG11c3Qgc3VwcG9ydCBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcy5cbiAqICAgRmlyZWZveCA0LTI5IGxhY2tlZCBzdXBwb3J0LCBmaXhlZCBpbiBGaXJlZm94IDMwKy5cbiAqICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cbiAqXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleSB3aWxsXG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCB3aWxsIHdvcmsgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IChmdW5jdGlvbiAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBuZXcgVWludDhBcnJheSgxKS5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChhcmcpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICAvLyBBdm9pZCBnb2luZyB0aHJvdWdoIGFuIEFyZ3VtZW50c0FkYXB0b3JUcmFtcG9saW5lIGluIHRoZSBjb21tb24gY2FzZS5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHJldHVybiBuZXcgQnVmZmVyKGFyZywgYXJndW1lbnRzWzFdKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKGFyZylcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gMFxuICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZFxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gZnJvbU51bWJlcih0aGlzLCBhcmcpXG4gIH1cblxuICAvLyBTbGlnaHRseSBsZXNzIGNvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGlzLCBhcmcsIGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogJ3V0ZjgnKVxuICB9XG5cbiAgLy8gVW51c3VhbC5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhpcywgYXJnKVxufVxuXG5mdW5jdGlvbiBmcm9tTnVtYmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChsZW5ndGgpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIC8vIEFzc3VtcHRpb246IGJ5dGVMZW5ndGgoKSByZXR1cm4gdmFsdWUgaXMgYWx3YXlzIDwga01heExlbmd0aC5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgdGhhdC53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpKSByZXR1cm4gZnJvbUJ1ZmZlcih0aGF0LCBvYmplY3QpXG5cbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkgcmV0dXJuIGZyb21BcnJheSh0aGF0LCBvYmplY3QpXG5cbiAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzdGFydCB3aXRoIG51bWJlciwgYnVmZmVyLCBhcnJheSBvciBzdHJpbmcnKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgb2JqZWN0LmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIGZyb21UeXBlZEFycmF5KHRoYXQsIG9iamVjdClcbiAgfVxuXG4gIGlmIChvYmplY3QubGVuZ3RoKSByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmplY3QpXG5cbiAgcmV0dXJuIGZyb21Kc29uT2JqZWN0KHRoYXQsIG9iamVjdClcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlciAodGhhdCwgYnVmZmVyKSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGJ1ZmZlci5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBidWZmZXIuY29weSh0aGF0LCAwLCAwLCBsZW5ndGgpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIER1cGxpY2F0ZSBvZiBmcm9tQXJyYXkoKSB0byBrZWVwIGZyb21BcnJheSgpIG1vbm9tb3JwaGljLlxuZnVuY3Rpb24gZnJvbVR5cGVkQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIC8vIFRydW5jYXRpbmcgdGhlIGVsZW1lbnRzIGlzIHByb2JhYmx5IG5vdCB3aGF0IHBlb3BsZSBleHBlY3QgZnJvbSB0eXBlZFxuICAvLyBhcnJheXMgd2l0aCBCWVRFU19QRVJfRUxFTUVOVCA+IDEgYnV0IGl0J3MgY29tcGF0aWJsZSB3aXRoIHRoZSBiZWhhdmlvclxuICAvLyBvZiB0aGUgb2xkIEJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEZXNlcmlhbGl6ZSB7IHR5cGU6ICdCdWZmZXInLCBkYXRhOiBbMSwyLDMsLi4uXSB9IGludG8gYSBCdWZmZXIgb2JqZWN0LlxuLy8gUmV0dXJucyBhIHplcm8tbGVuZ3RoIGJ1ZmZlciBmb3IgaW5wdXRzIHRoYXQgZG9uJ3QgY29uZm9ybSB0byB0aGUgc3BlYy5cbmZ1bmN0aW9uIGZyb21Kc29uT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgdmFyIGFycmF5XG4gIHZhciBsZW5ndGggPSAwXG5cbiAgaWYgKG9iamVjdC50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iamVjdC5kYXRhKSkge1xuICAgIGFycmF5ID0gb2JqZWN0LmRhdGFcbiAgICBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIH1cbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gYWxsb2NhdGUgKHRoYXQsIGxlbmd0aCkge1xuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIHRoYXQubGVuZ3RoID0gbGVuZ3RoXG4gICAgdGhhdC5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgZnJvbVBvb2wgPSBsZW5ndGggIT09IDAgJiYgbGVuZ3RoIDw9IEJ1ZmZlci5wb29sU2l6ZSA+Pj4gMVxuICBpZiAoZnJvbVBvb2wpIHRoYXQucGFyZW50ID0gcm9vdFBhcmVudFxuXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBrTWF4TGVuZ3RoYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IGtNYXhMZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xvd0J1ZmZlcikpIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcbiAgZGVsZXRlIGJ1Zi5wYXJlbnRcbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgdmFyIGkgPSAwXG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSBicmVha1xuXG4gICAgKytpXG4gIH1cblxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0IGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycy4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHN0cmluZyA9IFN0cmluZyhzdHJpbmcpXG5cbiAgaWYgKHN0cmluZy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHN0cmluZy5sZW5ndGggKiAyXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoID4+PiAxXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG4vLyBwcmUtc2V0IGZvciB2YWx1ZXMgdGhhdCBtYXkgZXhpc3QgaW4gdGhlIGZ1dHVyZVxuQnVmZmVyLnByb3RvdHlwZS5sZW5ndGggPSB1bmRlZmluZWRcbkJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG5cbi8vIHRvU3RyaW5nKGVuY29kaW5nLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICBzdGFydCA9IHN0YXJ0IHwgMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPT09IEluZmluaXR5ID8gdGhpcy5sZW5ndGggOiBlbmQgfCAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiAwXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSByZXR1cm4gLTEgLy8gc3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcgYWx3YXlzIGZhaWxzXG4gICAgcmV0dXJuIFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldClcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yICh2YXIgaSA9IDA7IGJ5dGVPZmZzZXQgKyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyW2J5dGVPZmZzZXQgKyBpXSA9PT0gdmFsW2ZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4XSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbC5sZW5ndGgpIHJldHVybiBieXRlT2Zmc2V0ICsgZm91bmRJbmRleFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0IChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoIHwgMFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIGlmIChuZXdCdWYubGVuZ3RoKSBuZXdCdWYucGFyZW50ID0gdGhpcy5wYXJlbnQgfHwgdGhpc1xuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYnVmZmVyIG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmIChsZW4gPCAxMDAwIHx8ICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0U3RhcnQpXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uIHRvQXJyYXlCdWZmZXIgKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIF9hdWdtZW50IChhcnIpIHtcbiAgYXJyLmNvbnN0cnVjdG9yID0gQnVmZmVyXG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBzZXQgbWV0aG9kIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5lcXVhbHMgPSBCUC5lcXVhbHNcbiAgYXJyLmNvbXBhcmUgPSBCUC5jb21wYXJlXG4gIGFyci5pbmRleE9mID0gQlAuaW5kZXhPZlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50TEUgPSBCUC5yZWFkVUludExFXG4gIGFyci5yZWFkVUludEJFID0gQlAucmVhZFVJbnRCRVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnRMRSA9IEJQLnJlYWRJbnRMRVxuICBhcnIucmVhZEludEJFID0gQlAucmVhZEludEJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludExFID0gQlAud3JpdGVVSW50TEVcbiAgYXJyLndyaXRlVUludEJFID0gQlAud3JpdGVVSW50QkVcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludExFID0gQlAud3JpdGVJbnRMRVxuICBhcnIud3JpdGVJbnRCRSA9IEJQLndyaXRlSW50QkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS16XFwtXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cbiAgdmFyIGkgPSAwXG5cbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgICAgIGNvZGVQb2ludCA9IGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDAgfCAweDEwMDAwXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcblxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICAgIH1cblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MjAwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBuQml0cyA9IC03LFxuICAgICAgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwLFxuICAgICAgZCA9IGlzTEUgPyAtMSA6IDEsXG4gICAgICBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKSxcbiAgICAgIGQgPSBpc0xFID8gMSA6IC0xLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEFkZEN0cmwoJHNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcywgbGlzdFBhcmVudCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgcGFyZW50SWQgPSBudWxsO1xuICAgICRzY29wZS5jb250ZW50VHlwZSA9ICRzdGF0ZVBhcmFtcy50eXBlO1xuICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5saXN0UGFyZW50ID0gbGlzdFBhcmVudDsgLy8gc2VsZWN0ZWQgY2F0ZWdvcnlcbiAgICAgICAgcGFyZW50SWQgPSBsaXN0UGFyZW50LmlkO1xuICAgIH1cbiAgICAvLyBkZWZhdWx0IHRyYW5zbGF0aW9ucyBsYW5nIGNvZGVcbiAgICAkc2NvcGUubmV3Q29udGVudCA9IHtcbiAgICAgICAgdHlwZTogJHN0YXRlUGFyYW1zLnR5cGUsXG4gICAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgICAgICB0cmFuc2xhdGlvbnM6IHtcbiAgICAgICAgICAgIGxhbmdDb2RlOiAkc2NvcGUubGlzdExhbmcuY29kZVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvLyBjb250ZW50cyBQT1NUIGFjdGlvblxuICAgICRzY29wZS5hZGROZXdDb250ZW50ID0gZnVuY3Rpb24gYWRkTmV3Q29udGVudChuZXdDb250ZW50KSB7XG4gICAgICAgIG5ld0NvbnRlbnQucGFyZW50SWQgPSBwYXJlbnRJZDsgLy8gc2V0IHBhcmVudCBjYXRlZ29yeSBhcyBudWxsXG4gICAgICAgIG5ld0NvbnRlbnQucHVibGlzaGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTkpLnJlcGxhY2UoJ1QnLCAnICcpOyAvLyBzZXQgcHVibGlzaCBhdCBkYXRlXG4gICAgICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICAgICAgaWYgKHR5cGVvZiAkc2NvcGUubGlzdFBhcmVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGZvciByb3V0ZSB0cmFuc2xhdGlvbiBpbiBzZWxlY3RlZCBsYW5ndWFnZVxuICAgICAgICAgICAgdmFyIHJvdXRlID0gXy5wbHVjayhfLmZpbHRlcigkc2NvcGUubGlzdFBhcmVudC5yb3V0ZS50cmFuc2xhdGlvbnMsICdsYW5nJywgbmV3Q29udGVudC50cmFuc2xhdGlvbnMubGFuZ0NvZGUpLCAndXJsJyk7XG4gICAgICAgICAgICBpZiAoIXJvdXRlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG5ld0NvbnRlbnQucGFyZW50SWQgPSBudWxsOyAvLyBpZiBub3QgZm91bmQgc2V0IGFzIHVuY2F0ZWdvcml6ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5uZXdDb250ZW50KG5ld0NvbnRlbnQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmICgkc3RhdGVQYXJhbXMudHlwZSA9PT0gJ2NhdGVnb3J5Jykge1xuICAgICAgICAgICAgICAgIC8vIHdoZW4gY3JlYXRlIGEgY2F0ZWdvcnkgdGhlbiBzZXQgaXQgYXMgYSBuZXcgbGlzdFBhcmVudCBvbiBjb250ZW50IGxpc3RcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2NvbnRlbnQubGlzdCcsIHtjb250ZW50SWQ6IHJlc3BvbnNlLmlkfSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgZ28gdG8gbGlzdCB3aXRob3V0IG5ldyBsaXN0UGFyZW50XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdjb250ZW50Lmxpc3QnLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xufVxuQ29udGVudEFkZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsICckc3RhdGVQYXJhbXMnLCAnbGlzdFBhcmVudCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50QWRkQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybCgkc2NvcGUsICRzdGF0ZSwgJHN0YXRlUGFyYW1zLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICRzY29wZS5zaG93VGVhc2VyID0gZmFsc2U7XG4gICAgLy8gZGVmYXVsdCB0cmFuc2xhdGlvbnMgbGFuZyBjb2RlXG4gICAgJHNjb3BlLm5ld0NvbnRlbnRUcmFuc2xhdGlvbiA9IHtcbiAgICAgICAgY29udGVudElkOiAkc3RhdGVQYXJhbXMuY29udGVudElkLFxuICAgICAgICBsYW5nQ29kZTogJHN0YXRlUGFyYW1zLmxhbmdDb2RlXG4gICAgfTtcbiAgICAvLyBjb250ZW50cyBQT1NUIGFjdGlvblxuICAgICRzY29wZS5hZGRuZXdDb250ZW50VHJhbnNsYXRpb24gPSBmdW5jdGlvbiBhZGROZXdDb250ZW50KG5ld0NvbnRlbnRUcmFuc2xhdGlvbikge1xuICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5uZXdDb250ZW50VHJhbnNsYXRpb24oJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCwgbmV3Q29udGVudFRyYW5zbGF0aW9uKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2NvbnRlbnQubGlzdCcsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5Db250ZW50QWRkVHJhbnNsYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRBZGRUcmFuc2xhdGlvbkN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRDYXRlZ29yeVRyZWVDdHJsKCRzY29wZSwgY2F0ZWdvcmllcywgb3BlbkNhdGVnb3JpZXMsIGxpc3RQYXJlbnQsIFN0b3JhZ2UpIHtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiByZXR1cm5zIHJvb3QgaWQgZnJvbSBwcm92aWRlZCBwYXRoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGF0aCB0byBzZWFyY2ggb3ZlclxuICAgICAqXG4gICAgICogQHJldHVybnMge2ludH0gcm9vdCBpZFxuICAgICAqIEB0aHJvd3MgRXJyb3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRSb290SWRGcm9tUGF0aChwYXRoKSB7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBwYXRoWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlIHBhdGggaXMgdG9vIHNob3J0IScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gcmV0dXJucyBzcGVjaWZpZWQgbm9kZSBmb3JtIHByb3ZpZGVkIGNvbGxlY3Rpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb2xsZWN0aW9uIHRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3ZlclxuICAgICAqIEBwYXJhbSBpZCAgbm9kZSBpZFxuICAgICAqXG4gICAgICogQHJldHVybnMge29iamVjdH0gcmV0dXJucyB0aGUgZm91bmQgZWxlbWVudCwgZWxzZSB1bmRlZmluZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXROb2RlQnlJZChjb2xsZWN0aW9uLCBpZCkge1xuICAgICAgICByZXR1cm4gXy5maW5kKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcnkuaWQgPT09IGlkO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBpZiB0aGVyZSBhcmUgb3BlbiBjYXRlZ29yaWVzIGluIHRoZSBTdG9yYWdlXG4gICAgaWYgKHR5cGVvZiBvcGVuQ2F0ZWdvcmllcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzID0gb3BlbkNhdGVnb3JpZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzID0gW107XG4gICAgfVxuXG4gICAgLy8gaWYgY2F0ZWdvcmllcyB0cmVlIGV4aXN0c1xuICAgIGlmICh0eXBlb2YgY2F0ZWdvcmllcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzO1xuICAgIH1cblxuICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5hY3RpdmVOb2RlID0gbGlzdFBhcmVudC5pZDtcblxuICAgICAgICAvLyBtZXJnZSBvcGVuIGNhdGVnb3JpZXMgd2l0aCBhY3RpdmUgY2F0ZWdvcnkgcGF0aFxuICAgICAgICAkc2NvcGUub3BlbkNhdGVnb3JpZXMgPSBfLnVuaW9uKCRzY29wZS5vcGVuQ2F0ZWdvcmllcywgbGlzdFBhcmVudC5wYXRoKTtcbiAgICAgICAgJHNjb3BlLnJvb3QgPSBnZXROb2RlQnlJZCgkc2NvcGUuY2F0ZWdvcmllcywgZ2V0Um9vdElkRnJvbVBhdGgobGlzdFBhcmVudC5wYXRoKSk7XG4gICAgICAgIC8vIHNhdmUgb3BlbiBjYXRlZ29yaWVzIGluIHRoZSBzdG9yZVxuICAgICAgICBTdG9yYWdlLnNldFN0b3JhZ2VJdGVtKHtvcGVuQ2F0ZWdvcmllczogJHNjb3BlLm9wZW5DYXRlZ29yaWVzfSk7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlcyBsaXN0UGFyZW50IGlkIGZyb20gc3RvcmFnZVxuICAgICRzY29wZS51bmNhdGVnb3JpemVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIFN0b3JhZ2UucmVtb3ZlU3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50Jyk7XG4gICAgfTtcblxuICAgIC8vIHRvZ2dsZXMgTm9kZSBpbiBjYXRlZ29yaWVzIHRyZWUgYW5kIG1hbmFnZSBTdG9yYWdlIG9wZW4gY2F0ZWdvcmllcyBvYmplY3RcbiAgICAkc2NvcGUudG9nZ2xlTm9kZSA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLnRvZ2dsZSgpO1xuICAgICAgICB2YXIgbm9kZUlkID0gXy5wYXJzZUludChzY29wZS4kZWxlbWVudFswXS5pZCwgMTApO1xuICAgICAgICAvLyBpZiBub2RlIGlzIG9wZW5cbiAgICAgICAgaWYgKCFzY29wZS5jb2xsYXBzZWQpIHtcbiAgICAgICAgICAgIC8vIGFkZCB0byBzY29wZVxuICAgICAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzLnB1c2gobm9kZUlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBmcm9tIHNjb3BlXG4gICAgICAgICAgICAkc2NvcGUub3BlbkNhdGVnb3JpZXMgPSBfLndpdGhvdXQoJHNjb3BlLm9wZW5DYXRlZ29yaWVzLCBub2RlSWQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNhdmUgaW4gdGhlIHN0b3JlXG4gICAgICAgIFN0b3JhZ2Uuc2V0U3RvcmFnZUl0ZW0oe29wZW5DYXRlZ29yaWVzOiAkc2NvcGUub3BlbkNhdGVnb3JpZXN9KTtcbiAgICB9O1xuXG59XG5Db250ZW50Q2F0ZWdvcnlUcmVlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnY2F0ZWdvcmllcycsICdvcGVuQ2F0ZWdvcmllcycsICdsaXN0UGFyZW50JywgJ1N0b3JhZ2UnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudENhdGVnb3J5VHJlZUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnREYXNoYm9hcmRDdHJsKCRzY29wZSkge1xuXG59XG5Db250ZW50RGFzaGJvYXJkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudERhc2hib2FyZEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnREZWxldGVDdHJsKCRzY29wZSwgJHN0YXRlLCAkbW9kYWwsIFN0b3JhZ2UsIENvbnRlbnRSZXBvc2l0b3J5LCBOb3RpZmljYXRpb25zKSB7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIERlbGV0ZSBtb2RhbFxuICAgIHZtLmRlbGV0ZU1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZXMgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHZpZXdQYXRoICsgJ2NvbnRlbnREZWxldGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRJZCBjb250ZW50IGlkIHRvIGJlIHJlbW92ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKiBAcGFyYW0gY29udGVudFR5cGUgY29udGVudCB0eXBlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKGNvbnRlbnRJZCwgY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHZtLmNvbnRlbnRUeXBlID0gY29udGVudFR5cGU7XG4gICAgICAgICAgICAvLyBjaGVjayBmb3IgY2hpbGRyZW5cbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5LmNoaWxkcmVuKGNvbnRlbnRJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChDb250ZW50UmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdERUxFVEVfQ09OVEVOVF9RVUVTVElPTicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZtLmhpZGVTdWJtaXRCdXR0b24gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnSU5GT1JNQVRJT04nLCAnREVMRVRFX05PVF9FTVBUWV9DQVRFR09SWV9JTkZPJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgY29udGVudCBpZCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgZGVsZXRlQ29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5kZWxldGVDb250ZW50KHZtLmNvbnRlbnRJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgICAgIC8vIHJlZnJlc2ggY3VycmVudCBzdGF0ZVxuICAgICAgICAgICAgICAgIGlmICh2bS5jb250ZW50VHlwZSA9PT0gJ2NhdGVnb3J5Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmVkIGNhdGVnb3J5XG4gICAgICAgICAgICAgICAgICAgIFN0b3JhZ2UucmVtb3ZlU3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnY29udGVudC5saXN0Jywge2NvbnRlbnRJZDogbnVsbH0sIHtyZWxvYWQ6IHRydWUsIGluaGVyaXQ6IGZhbHNlfSk7XG4gICAgICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnQ0FURUdPUllfSEFTX0JFRU5fREVMRVRFRCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZWQgY29udGVudFxuICAgICAgICAgICAgICAgICAgICBpZiAoJHN0YXRlLiRjdXJyZW50Lm5hbWUgPT09ICdjb250ZW50LnNob3cnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2NvbnRlbnQubGlzdCcsIHtjb250ZW50SWQ6IG51bGx9LCB7cmVsb2FkOiB0cnVlLCBpbmhlcml0OiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnQ09OVEVOVF9IQVNfQkVFTl9ERUxFVEVEJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5Db250ZW50RGVsZXRlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlJywgJyRtb2RhbCcsICdTdG9yYWdlJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgJ05vdGlmaWNhdGlvbnMnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudERlbGV0ZUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnREZXRhaWxzQ3RybCgkc2NvcGUsICRzdGF0ZVBhcmFtcywgQ29udGVudFJlcG9zaXRvcnksIE5vdGlmaWNhdGlvbnMpIHtcbiAgICAvLyBnZXQgc2luZ2xlIGNvbnRlbnRcbiAgICBDb250ZW50UmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAkc2NvcGUuY29udGVudCA9IENvbnRlbnRSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zYXZlQ29udGVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBDb250ZW50UmVwb3NpdG9yeVxuICAgICAgICAgICAgLnVwZGF0ZUNvbnRlbnQoJHNjb3BlLmNvbnRlbnQuaWQsICRzY29wZS5jb250ZW50KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdTQVZFRCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxufVxuQ29udGVudERldGFpbHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnTm90aWZpY2F0aW9ucyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RGV0YWlsc0N0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRMaXN0Q3RybCgkc2NvcGUsICRzdGF0ZVBhcmFtcywgbGlzdFBhcmVudCwgQ29udGVudFJlcG9zaXRvcnksIE5nVGFibGVQYXJhbXMpIHtcbiAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBsaXN0UGFyZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubGlzdFBhcmVudCA9IGxpc3RQYXJlbnQ7IC8vIHNlbGVjdGVkIGNhdGVnb3J5XG4gICAgfVxuXG4gICAgLy8gIG5nVGFibGUgY29uZmlndXJhdGlvblxuICAgICRzY29wZS50YWJsZVBhcmFtcyA9IG5ldyBOZ1RhYmxlUGFyYW1zKHtcbiAgICAgICAgY291bnQ6IDI1LCAvLyBjb3VudCBwZXIgcGFnZVxuICAgICAgICBzb3J0aW5nOiB7XG4gICAgICAgICAgICAndHJhbnNsYXRpb25zLnRpdGxlJzogJ2FzYycgLy8gaW5pdGlhbCBzb3J0aW5nXG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIHRvdGFsOiAwLCAvLyBsZW5ndGggb2YgZGF0YVxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigkZGVmZXIsIHBhcmFtcykge1xuICAgICAgICAgICAgLy8gcHJlcGFyZSBvcHRpb25zIHRvIGJlIHNlbnQgdG8gYXBpXG4gICAgICAgICAgICB2YXIgcXVlcnlPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGxhbmc6ICRzY29wZS5saXN0TGFuZy5jb2RlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdjb250ZW50J1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gcGFyYW1zLmNvdW50KCkgLSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgZGVjbGFyZWQgaW4gdmlld1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAkc3RhdGVQYXJhbXMucGVyUGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuY291bnQoJHN0YXRlUGFyYW1zLnBlclBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wZXJQYWdlID0gcGFyYW1zLmNvdW50KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5wYWdlKCkgLSBjdXJyZW50IHBhZ2VcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJHN0YXRlUGFyYW1zLnBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnBhZ2UoJHN0YXRlUGFyYW1zLnBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wYWdlID0gcGFyYW1zLnBhZ2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGFibGVQYXJhbXMub3JkZXJCeSgpIC0gYW4gYXJyYXkgb2Ygc3RyaW5nIGluZGljYXRpbmcgYm90aCB0aGUgc29ydGluZyBjb2x1bW4gYW5kIGRpcmVjdGlvbiAoZS5nLiBbXCIrbmFtZVwiLCBcIi1lbWFpbFwiXSlcbiAgICAgICAgICAgIGlmIChwYXJhbXMuc29ydGluZygpKSB7XG4gICAgICAgICAgICAgICAgLy8gb25seSBpbnRlcmVzdGVkIGluIGZpcnN0IHNvcnQgY29sdW1uIGZvciBub3dcbiAgICAgICAgICAgICAgICB2YXIgb3JkZXJCeSA9IHBhcmFtcy5vcmRlckJ5KClbMF07XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnNvcnQgPSBvcmRlckJ5WzBdID09PSAnKycgPyBvcmRlckJ5LnN1YnN0cmluZygxKSA6IG9yZGVyQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vICRzdGF0ZVBhcmFtcyAtIGZpbHRlcnMgd2l0aG91dCBjb250ZW50SWRcbiAgICAgICAgICAgIHZhciBmaWx0ZXJzID0gXy5vbWl0KCRzdGF0ZVBhcmFtcywgJ2NvbnRlbnRJZCcpO1xuICAgICAgICAgICAgcXVlcnlPcHRpb25zID0gXy5tZXJnZShxdWVyeU9wdGlvbnMsIGZpbHRlcnMpO1xuICAgICAgICAgICAgJHNjb3BlLmFjdGl2ZUZpbHRlciA9IGZpbHRlcnM7XG5cbiAgICAgICAgICAgIC8vIGdldCBsaXN0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkubGlzdChxdWVyeU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgaXMgbm90IHNlbGVjdGVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpc3RQYXJlbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IHVuY2F0ZWdvcml6ZWRcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMubGV2ZWwgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgY2hpbGRyZW4nc1xuICAgICAgICAgICAgICAgIHByb21pc2UgPSBDb250ZW50UmVwb3NpdG9yeS5jaGlsZHJlbihsaXN0UGFyZW50LmlkLCBxdWVyeU9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDb250ZW50cyBpcyBhIFJFU1QgQW5ndWxhckpTIHNlcnZpY2UgdGhhdCB0YWxrcyB0byBhcGkgYW5kIHJldHVybiBwcm9taXNlXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMudG90YWwocmVzcG9uc2UubWV0YS50b3RhbCk7XG4gICAgICAgICAgICAgICAgJGRlZmVyLnJlc29sdmUoQ29udGVudFJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuQ29udGVudExpc3RDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCAnbGlzdFBhcmVudCcsICdDb250ZW50UmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRMaXN0Q3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFJvdXRlQ3RybCgkc2NvcGUsICRzdGF0ZSwgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIERlbGV0ZSBtb2RhbFxuICAgIHZtLmVkaXRSb3V0ZU1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHZpZXdQYXRoICsgJ2NvbnRlbnRFZGl0Um91dGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRJZCBjb250ZW50IGlkIHRvIGJlIHJlbW92ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKiBAcGFyYW0gY29udGVudFJvdXRlIGNvbnRlbnQgcm91dGVcbiAgICAgICAgICogQHBhcmFtIGxhbmdDb2RlIHJvdXRlIHRyYW5zbGF0aW9uIGxhbmd1YWdlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKGNvbnRlbnRJZCwgY29udGVudFJvdXRlLCBsYW5nQ29kZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0uY29udGVudElkID0gY29udGVudElkO1xuICAgICAgICAgICAgdm0uY29udGVudFJvdXRlID0gY29udGVudFJvdXRlLnN1YnN0cihjb250ZW50Um91dGUubGFzdEluZGV4T2YoJy8nKSArIDEpOyAvLyBsYXN0IHVybCBzZWdtZW50XG4gICAgICAgICAgICB2bS5sYW5nQ29kZSA9IGxhbmdDb2RlO1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ0VESVQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBERUxFVEUgYWN0aW9uIGZvciBjb250ZW50IGlkIGluIHNjb3BlXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBzYXZlQ29udGVudFJvdXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhciBuZXdSb3V0ZSA9IHtcbiAgICAgICAgICAgICAgICBsYW5nQ29kZTogdm0ubGFuZ0NvZGUsXG4gICAgICAgICAgICAgICAgdXJsOiB2bS5jb250ZW50Um91dGVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5uZXdDb250ZW50Um91dGUodm0uY29udGVudElkLCBuZXdSb3V0ZSkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygkc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICB9O1xufVxuQ29udGVudFJvdXRlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlJywgJyRtb2RhbCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50Um91dGVDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFRyYXNoY2FuQ3RybCgkc2NvcGUsICRzdGF0ZVBhcmFtcywgQ29udGVudFJlcG9zaXRvcnksIE5nVGFibGVQYXJhbXMpIHtcbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ2lkJzogJ2Rlc2MnIC8vIGluaXRpYWwgc29ydGluZ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBsYW5nOiAkc2NvcGUubGlzdExhbmcuY29kZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gcGFyYW1zLmNvdW50KCkgLSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgZGVjbGFyZWQgaW4gdmlld1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAkc3RhdGVQYXJhbXMucGVyUGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuY291bnQoJHN0YXRlUGFyYW1zLnBlclBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wZXJQYWdlID0gcGFyYW1zLmNvdW50KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5wYWdlKCkgLSBjdXJyZW50IHBhZ2VcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJHN0YXRlUGFyYW1zLnBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnBhZ2UoJHN0YXRlUGFyYW1zLnBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wYWdlID0gcGFyYW1zLnBhZ2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGFibGVQYXJhbXMub3JkZXJCeSgpIC0gYW4gYXJyYXkgb2Ygc3RyaW5nIGluZGljYXRpbmcgYm90aCB0aGUgc29ydGluZyBjb2x1bW4gYW5kIGRpcmVjdGlvbiAoZS5nLiBbXCIrbmFtZVwiLCBcIi1lbWFpbFwiXSlcbiAgICAgICAgICAgIGlmIChwYXJhbXMuc29ydGluZygpKSB7XG4gICAgICAgICAgICAgICAgLy8gb25seSBpbnRlcmVzdGVkIGluIGZpcnN0IHNvcnQgY29sdW1uIGZvciBub3dcbiAgICAgICAgICAgICAgICB2YXIgb3JkZXJCeSA9IHBhcmFtcy5vcmRlckJ5KClbMF07XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnNvcnQgPSBvcmRlckJ5WzBdID09PSAnKycgPyBvcmRlckJ5LnN1YnN0cmluZygxKSA6IG9yZGVyQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vICRzdGF0ZVBhcmFtcyBmaWx0ZXJzXG4gICAgICAgICAgICBxdWVyeU9wdGlvbnMgPSBfLm1lcmdlKHF1ZXJ5T3B0aW9ucywgJHN0YXRlUGFyYW1zKTtcbiAgICAgICAgICAgICRzY29wZS5hY3RpdmVGaWx0ZXIgPSAkc3RhdGVQYXJhbXM7XG5cbiAgICAgICAgICAgIC8vIGdldCBsaXN0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkuZGVsZXRlZChxdWVyeU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAvLyBDb250ZW50cyBpcyBhIFJFU1QgQW5ndWxhckpTIHNlcnZpY2UgdGhhdCB0YWxrcyB0byBhcGkgYW5kIHJldHVybiBwcm9taXNlXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMudG90YWwocmVzcG9uc2UubWV0YS50b3RhbCk7XG4gICAgICAgICAgICAgICAgJGRlZmVyLnJlc29sdmUoQ29udGVudFJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5Db250ZW50VHJhc2hjYW5DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnbmdUYWJsZVBhcmFtcyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50VHJhc2hjYW5DdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGVsZXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50RGVsZXRlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIENvbnRlbnREZWxldGVDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgYSBkZWxldGUgbW9kYWwgZnJvbSBhIGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICBDb250ZW50RGVsZXRlQ3RybC5kZWxldGVNb2RhbC5zaG93TW9kYWwoYXR0cnMuaWQsIGF0dHJzLnR5cGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50RGVsZXRlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudERlbGV0ZUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEVkaXRSb3V0ZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudFJvdXRlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIENvbnRlbnRSb3V0ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIENvbnRlbnRSb3V0ZUN0cmwuZWRpdFJvdXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmlkLCBhdHRycy5yb3V0ZSwgYXR0cnMubGFuZyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnRFZGl0Um91dGVCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RWRpdFJvdXRlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4uY29udGVudCcsIFsnbmdUYWJsZScsICd1aS50cmVlJ10pXG4gICAgLmNvbmZpZyhbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC8nO1xuICAgICAgICAgICAgLy8gTm93IHNldCB1cCB0aGUgc3RhdGVzXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2NvbnRlbnQnLFxuICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERhc2hib2FyZEN0cmwnLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ29udGVudFJlcG9zaXRvcnknLCBmdW5jdGlvbihDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgdHJlZSBvZiBhbGwgY2F0ZWdvcmllc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkudHJlZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2F0ZWdvcnknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50Lmxpc3QnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9saXN0L3tjb250ZW50SWR9P2lzQWN0aXZlJnBhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RQYXJlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJywgJ1N0b3JhZ2UnLCAnQ29udGVudFJlcG9zaXRvcnknLCBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIFN0b3JhZ2UsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHN0YXRlIHBhcmFtIGhhcyBjYXRlZ29yeSBpZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU3RvcmFnZS5zZXRTdG9yYWdlSXRlbSh7Y29udGVudExpc3RQYXJlbnQ6ICRzdGF0ZVBhcmFtcy5jb250ZW50SWR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdG9yYWdlIGhhcyBjYXRlZ29yeSBpZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMuY29udGVudElkID0gU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkub25lKFN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5DYXRlZ29yaWVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IG9wZW4gY2F0ZWdvcmllcyBmcm9tIFN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU3RvcmFnZScsIGZ1bmN0aW9uKFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ29wZW5DYXRlZ29yaWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2xpc3QuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRMaXN0Q3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAncXVpY2tTaWRlYmFyTGVmdCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY2F0ZWdvcmllcy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudENhdGVnb3J5VHJlZUN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5zaG93Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2NvbnRlbnRJZH0vc2hvdycsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERldGFpbHNDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQudHJhc2hjYW4nLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy90cmFzaGNhbj9pc0FjdGl2ZSZ0eXBlJnBhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAndHJhc2hjYW4uaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRUcmFzaGNhbkN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5hZGQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9hZGQve3R5cGV9JyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdFBhcmVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTdG9yYWdlJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgZnVuY3Rpb24oU3RvcmFnZSwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgc3RvcmFnZSBoYXMgY2F0ZWdvcnkgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS5vbmUoU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnYWRkLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50QWRkQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LmFkZFRyYW5zbGF0aW9uJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2NvbnRlbnRJZH0vYWRkLXRyYW5zbGF0aW9uL3tsYW5nQ29kZX0nLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2FkZFRyYW5zbGF0aW9uLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50QWRkQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudEFkZEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERlbGV0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnREZWxldGVDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50Q2F0ZWdvcnlUcmVlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50RGFzaGJvYXJkQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudERhc2hib2FyZEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERldGFpbHNDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50RGV0YWlsc0N0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudExpc3RDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50TGlzdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudFRyYXNoY2FuQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudFRyYXNoY2FuQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50QWRkVHJhbnNsYXRpb25DdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRSb3V0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnRSb3V0ZUN0cmwnKSlcbiAgICAuZmFjdG9yeSgnQ29udGVudFJlcG9zaXRvcnknLCByZXF1aXJlKCcuL3NlcnZpY2VzL0NvbnRlbnRSZXBvc2l0b3J5LmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudERlbGV0ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Db250ZW50RGVsZXRlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudEVkaXRSb3V0ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Db250ZW50RWRpdFJvdXRlQnV0dG9uLmpzJykpXG4gICAgLnJ1bihbXG4gICAgICAgICdOYXZCYXInLFxuICAgICAgICBmdW5jdGlvbihOYXZCYXIpIHtcbiAgICAgICAgICAgIE5hdkJhci5hZGQoXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0NPTlRFTlQnLFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdjb250ZW50Lmxpc3QnLFxuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEgZmEtZmlsZS10ZXh0LW8nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vTmF2QmFyLmFkZExhc3RDaGlsZChcbiAgICAgICAgICAgIC8vICAgICdDT05URU5UJyxcbiAgICAgICAgICAgIC8vICAgIHtcbiAgICAgICAgICAgIC8vICAgICAgICB0aXRsZTogJ0FMTF9DT05URU5UUycsXG4gICAgICAgICAgICAvLyAgICAgICAgYWN0aW9uOiAnY29udGVudC5saXN0JyxcbiAgICAgICAgICAgIC8vICAgICAgICBpY29uOiAnZmEgZmEtdGgnXG4gICAgICAgICAgICAvLyAgICB9XG4gICAgICAgICAgICAvLyk7XG4gICAgICAgICAgICAvL05hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgICAvLyAgICAnQ09OVEVOVCcsXG4gICAgICAgICAgICAvLyAgICB7XG4gICAgICAgICAgICAvLyAgICAgICAgdGl0bGU6ICdBRERfQ09OVEVOVCcsXG4gICAgICAgICAgICAvLyAgICAgICAgYWN0aW9uOiAnY29udGVudC5hZGQoeyB0eXBlOiBcImNvbnRlbnRcIiB9KScsXG4gICAgICAgICAgICAvLyAgICAgICAgaWNvbjogJ2ZhIGZhLWZpbGUtdGV4dC1vJ1xuICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgLy8pO1xuICAgICAgICAgICAgLy9OYXZCYXIuYWRkTGFzdENoaWxkKFxuICAgICAgICAgICAgLy8gICAgJ0NPTlRFTlQnLFxuICAgICAgICAgICAgLy8gICAge1xuICAgICAgICAgICAgLy8gICAgICAgIHRpdGxlOiAnQUREX0NBVEVHT1JZJyxcbiAgICAgICAgICAgIC8vICAgICAgICBhY3Rpb246ICdjb250ZW50LmFkZCh7IHR5cGU6IFwiY2F0ZWdvcnlcIiB9KScsXG4gICAgICAgICAgICAvLyAgICAgICAgaWNvbjogJ2ZhIGZhLWZpbGUtdGV4dCdcbiAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgIC8vKTtcbiAgICAgICAgfVxuICAgIF0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50UmVwb3NpdG9yeShSZXN0YW5ndWxhcikge1xuICAgIHZhciBhcGkgPSAnYWRtaW4vY29udGVudHMnO1xuICAgIHZhciBjb250ZW50cyA9IFJlc3Rhbmd1bGFyLmFsbChhcGkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG9uZTogZnVuY3Rpb24oaWQsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5nZXQocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgdHJlZTogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSkuZ2V0TGlzdCgndHJlZScsIHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGxpc3Q6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnRzLmdldExpc3QocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlZDogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSkuZ2V0TGlzdCgnZGVsZXRlZCcsIHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmdldExpc3QoJ2NoaWxkcmVuJywgcGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV3Q29udGVudDogZnVuY3Rpb24obmV3Q29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnRzLnBvc3QobmV3Q29udGVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZUNvbnRlbnQ6IGZ1bmN0aW9uKGlkLCBjb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmN1c3RvbVBVVChjb250ZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV3Q29udGVudFRyYW5zbGF0aW9uOiBmdW5jdGlvbihpZCwgbmV3VHJhbnNsYXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuYWxsKCd0cmFuc2xhdGlvbnMnKS5wb3N0KG5ld1RyYW5zbGF0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV3Q29udGVudFJvdXRlOiBmdW5jdGlvbihpZCwgbmV3Um91dGUpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuYWxsKCdyb3V0ZScpLnBvc3QobmV3Um91dGUpO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGVDb250ZW50OiBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5yZW1vdmUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYW46IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5zdHJpcFJlc3Rhbmd1bGFyKGVsZW0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudFJlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFJlcG9zaXRvcnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvcmVDdHJsKCRzY29wZSwgJHN0YXRlLCBUcmFuc2xhdGlvbnMsIE5hdkJhciwgVG9wTmF2QmFyKSB7XG4gICAgLy8gZ2V0IHRyYW5zbGF0aW9ucyBsYW5ndWFnZXNcbiAgICBUcmFuc2xhdGlvbnMuZ2V0VHJhbnNsYXRpb25zKCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAkc2NvcGUubGFuZ3MgPSByZXNwb25zZS5sYW5ncztcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRMYW5nID0gJHNjb3BlLmxpc3RMYW5nID0gcmVzcG9uc2UuY3VycmVudExhbmc7XG4gICAgfSk7XG5cbiAgICAvLyBhZG1pbiBwYW5lbCBsYW5ndWFnZVxuICAgICRzY29wZS5zZWxlY3RBZG1pbkxhbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgVHJhbnNsYXRpb25zLnNlbGVjdEFkbWluTGFuZygkc2NvcGUuY3VycmVudExhbmcpO1xuICAgIH07XG5cbiAgICAvLyB0cmFuc2xhdGlvbnMgbGFuZ3VhZ2VcbiAgICAkc2NvcGUuc2VsZWN0TGFuZ3VhZ2UgPSBmdW5jdGlvbihsYW5nKSB7XG4gICAgICAgICRzY29wZS5saXN0TGFuZyA9IGxhbmc7XG4gICAgfTtcblxuICAgIC8vIHJlZnJlc2ggY3VycmVudCBzdGF0ZVxuICAgJHNjb3BlLnJlZnJlc2hDdXJyZW50U3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAkc3RhdGUuZ28oJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5uYXZCYXIgPSBOYXZCYXIuZ2V0SXRlbXMoKTtcbiAgICAkc2NvcGUudG9wTmF2QmFyID0gVG9wTmF2QmFyLmdldEl0ZW1zKCk7XG5cbiAgICAvL09mZiBjYW52YXMgc2lkZWJhclxuICAgICRzY29wZS5zaG93U2lkZWJhciA9IGZhbHNlO1xuXG4gICAgLy8gdG9nZ2xlIHNpZGViYXJcbiAgICAkc2NvcGUuJHN0YXRlID0gJHN0YXRlO1xufVxuXG5Db3JlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlJywgJ1RyYW5zbGF0aW9ucycsICdOYXZCYXInLCAnVG9wTmF2QmFyJywgJyRzdGF0ZSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb3JlQ3RybDtcbiIsImFuZ3VsYXIubW9kdWxlKCdDb3JlRmlsdGVycycsIFtdKVxuLyoqXG4gKiBGaWx0ZXIgcmV0dXJucyB0cmFuc2xhdGFibGUgc3RyaW5nIGJhc2VkIG9uIHByb3ZpZGVkIGxhbmd1YWdlIGNvZGVcbiAqXG4gKiBAcGFyYW0gbGFuZ0NvZGUgIGxhbmd1YWdlIGNvZGVcbiAqXG4gKiBAcmV0dXJucyB7c3RyaW5nfSB0cmFuc2xhdGFibGUgc3RyaW5nXG4gKi9cbiAgICAuZmlsdGVyKCdsYW5nTmFtZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihsYW5nQ29kZSkge1xuICAgICAgICAgICAgcmV0dXJuICdMQU5HX05BTUVfJyArIGFuZ3VsYXIudXBwZXJjYXNlKGxhbmdDb2RlKTtcbiAgICAgICAgfTtcbiAgICB9KVxuLyoqXG4gKiBGaWx0ZXIgcmV0dXJucyB0aGUgdHJhbnNsYXRpb24gaW4gcHJvdmlkZWQgbGFuZ3VhZ2VcbiAqXG4gKiBAcGFyYW0gdHJhbnNsYXRpb25zIHRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3ZlclxuICogQHBhcmFtIGxhbmdDb2RlICBsYW5ndWFnZSBjb2RlXG4gKiBAcGFyYW0gZmllbGQgIGZpZWxkIG5hbWVcbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSB0cmFuc2xhdGlvbiBmaWVsZFxuICovXG4gICAgLmZpbHRlcignZ2V0VHJhbnNsYXRpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24odHJhbnNsYXRpb25zLCBsYW5nQ29kZSwgZmllbGQpIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50VHJhbnNsYXRpb24gPSBfLmZpbHRlcih0cmFuc2xhdGlvbnMsIGZ1bmN0aW9uKHRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uLmxhbmcgPT09IGxhbmdDb2RlO1xuICAgICAgICAgICAgfSkuc2hpZnQoKTtcbiAgICAgICAgICAgIGlmIChfLmhhcyhjdXJyZW50VHJhbnNsYXRpb24sIGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50VHJhbnNsYXRpb25bZmllbGRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KVxuLyoqXG4gKiBGaWx0ZXIgY2hlY2tzIGlmIHNwZWNpZmllZCBub2RlIGV4aXN0cyBpbiBwcm92aWRlZCBwYXRoXG4gKlxuICogQHBhcmFtIHBhdGggdGhlIG5vZGUgcGF0aCB0byBpdGVyYXRlIG92ZXJcbiAqIEBwYXJhbSBpZCAgbm9kZSBpZFxuICpcbiAqIEByZXR1cm5zIHtib29sfSB0cnVlIG9yIGZhbHNlXG4gKi9cbiAgICAuZmlsdGVyKCdub2RlSW5QYXRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHBhdGgsIGlkKSB7XG4gICAgICAgICAgICAvLyBpZiBwYXRoIGV4aXN0cyBhbmQgbm90IGVtcHR5XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhdGggIT09ICd1bmRlZmluZWQnICYmIHBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoLmluZGV4T2YoaWQpID4gLTE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KVxuXG4gICAgLmZpbHRlcigndHJ1c3RBc0h0bWwnLCBmdW5jdGlvbigkc2NlKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuICRzY2UudHJ1c3RBc0h0bWw7XG4gICAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJy4vZmlsdGVycy9Db3JlRmlsdGVycy5qcycpO1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4uY29yZScsIFsnQ29yZUZpbHRlcnMnXSlcbiAgICAuY29udHJvbGxlcignQ29yZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvcmVDdHJsLmpzJykpXG4gICAgLmZhY3RvcnkoJ0xhbmdSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9MYW5nUmVwb3NpdG9yeS5qcycpKVxuICAgIC5mYWN0b3J5KCdOYXZCYXInLCByZXF1aXJlKCcuL3NlcnZpY2VzL05hdkJhci5qcycpKVxuICAgIC5mYWN0b3J5KCdUb3BOYXZCYXInLCByZXF1aXJlKCcuL3NlcnZpY2VzL1RvcE5hdkJhci5qcycpKVxuICAgIC5mYWN0b3J5KCdOb3RpZmljYXRpb25zJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9Ob3RpZmljYXRpb25zLmpzJykpXG4gICAgLmZhY3RvcnkoJ1RyYW5zbGF0aW9ucycsIHJlcXVpcmUoJy4vc2VydmljZXMvVHJhbnNsYXRpb25zLmpzJykpXG4gICAgLmZhY3RvcnkoJ1N0b3JhZ2UnLCByZXF1aXJlKCcuL3NlcnZpY2VzL1N0b3JhZ2UuanMnKSlcbiAgICAucnVuKFtcbiAgICAgICAgJ1RvcE5hdkJhcicsXG4gICAgICAgIGZ1bmN0aW9uKFRvcE5hdkJhcikge1xuICAgICAgICAgICAgVG9wTmF2QmFyLmFkZChcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnREFTSEJPQVJEJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnaG9tZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgVG9wTmF2QmFyLmFkZChcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnU0VUVElOR1MnLFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdjb250ZW50Lmxpc3QnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFRvcE5hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgICAgICAgJ1NFVFRJTkdTJyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQUxMX0NPTlRFTlRTJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnY29udGVudC5saXN0J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBUb3BOYXZCYXIuYWRkTGFzdENoaWxkKFxuICAgICAgICAgICAgICAgICdTRVRUSU5HUycsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FERF9ORVcnLFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdjb250ZW50LmFkZCdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIExhbmdSZXBvc2l0b3J5KFJlc3Rhbmd1bGFyKSB7XG4gICAgLyoqXG4gICAgICogQ3VzdG9tIG1ldGhvZHNcbiAgICAgKi9cbiAgICBSZXN0YW5ndWxhci5leHRlbmRNb2RlbCgnbGFuZ3MnLCBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICBtb2RlbC50ZXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3Rlc3QnO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgfSk7XG5cbiAgICB2YXIgYXBpID0gUmVzdGFuZ3VsYXIuYWxsKCdhZG1pbi9sYW5ncycpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG9uZTogZnVuY3Rpb24oY29kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGFwaS5nZXQoY29kZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGxpc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFwaS5nZXRMaXN0KCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5MYW5nUmVwb3NpdG9yeS4kaW5qZWN0ID0gWydSZXN0YW5ndWxhciddO1xubW9kdWxlLmV4cG9ydHMgPSBMYW5nUmVwb3NpdG9yeTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTmF2QmFyKCkge1xuICAgIC8qKiBAdmFyIE5hdmlnYXRpb24gKi9cbiAgICByZXR1cm4gcmVxdWlyZSgnLi4vLi4vbGliL25hdmlnYXRpb24uanMnKSgpO1xufVxuXG5tb2R1bGUuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBOYXZCYXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE5vdGlmaWNhdGlvbnMoJGFsZXJ0LCAkdHJhbnNsYXRlKSB7XG4gICAgdmFyIGNvbnRhaW5lciA9ICdib2R5JztcbiAgICB2YXIgcGxhY2VtZW50ID0gJ3RvcC1yaWdodCc7XG4gICAgdmFyIHR5cGUgPSA1O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHdoaWNoIHNob3dzIG1lc3NhZ2VzIG9mIGdpdmVuIHR5cGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvbiB1c2VkIHRvIHNob3cgZWFjaCBtZXNzYWdlXG4gICAgICogQHBhcmFtIG1lc3NhZ2VzIG1lc3NhZ2VzIHRvIHNob3dcbiAgICAgKi9cbiAgICB2YXIgYWRkTWVzc2FnZXMgPSBmdW5jdGlvbihjYWxsYmFjaywgbWVzc2FnZXMpIHtcbiAgICAgICAgXy5mb3JFYWNoKG1lc3NhZ2VzLCBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgY2FsbGJhY2sobWVzc2FnZXNbMF0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyBtdWx0aXBsZSBBbmd1bGFyU3RyYXAgaW5mbyB0eXBlIGFsZXJ0c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZXMgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIHRvIHNob3dcbiAgICAgICAgICovXG4gICAgICAgIGFkZEluZm9zOiBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgYWRkTWVzc2FnZXMoc2VsZi5hZGRJbmZvLCBtZXNzYWdlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyBtdWx0aXBsZSBBbmd1bGFyU3RyYXAgZGFuZ2VyIHR5cGUgYWxlcnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlcyB0cmFuc2xhdGFibGUgbWVzc2FnZXMgdG8gc2hvd1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkRXJyb3JzOiBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgYWRkTWVzc2FnZXMoc2VsZi5hZGRFcnJvciwgbWVzc2FnZXMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgbXVsdGlwbGUgQW5ndWxhclN0cmFwIHdhcm5pbmcgdHlwZSBhbGVydHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2VzIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyB0byBzaG93XG4gICAgICAgICAqL1xuICAgICAgICBhZGRXYXJuaW5nczogZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGFkZE1lc3NhZ2VzKHNlbGYuYWRkV2FybmluZywgbWVzc2FnZXMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgbXVsdGlwbGUgQW5ndWxhclN0cmFwIHN1Y2Nlc3MgdHlwZSBhbGVydHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2VzIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyB0byBzaG93XG4gICAgICAgICAqL1xuICAgICAgICBhZGRTdWNjZXNzZXM6IGZ1bmN0aW9uKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBhZGRNZXNzYWdlcyhzZWxmLmFkZFN1Y2Nlc3MsIG1lc3NhZ2VzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgaW5mbyB0eXBlIGFsZXJ0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlIHN0cmluZyBlZy4gJ0NPTU1PTl9FUlJPUidcbiAgICAgICAgICovXG4gICAgICAgIGFkZEluZm86IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICR0cmFuc2xhdGUuaW5zdGFudCgnSU5GT1JNQVRJT04nKSArICc6JyxcbiAgICAgICAgICAgICAgICBjb250ZW50OiAkdHJhbnNsYXRlLmluc3RhbnQobWVzc2FnZSksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyOiBjb250YWluZXIsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiBwbGFjZW1lbnQsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IHR5cGUsXG4gICAgICAgICAgICAgICAgdHlwZTogJ2luZm8nXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgZGFuZ2VyIHR5cGUgYWxlcnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2Ugc3RyaW5nIGVnLiAnQ09NTU9OX0VSUk9SJ1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkRXJyb3I6IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICRhbGVydCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICR0cmFuc2xhdGUuaW5zdGFudCgnRVJST1InKSArICc6JyxcbiAgICAgICAgICAgICAgICBjb250ZW50OiAkdHJhbnNsYXRlLmluc3RhbnQobWVzc2FnZSksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyOiBjb250YWluZXIsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiBwbGFjZW1lbnQsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IHR5cGUsXG4gICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCB3YXJuaW5nIHR5cGUgYWxlcnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2Ugc3RyaW5nIGVnLiAnQ09NTU9OX0VSUk9SJ1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkV2FybmluZzogZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAgICAgJGFsZXJ0KHtcbiAgICAgICAgICAgICAgICB0aXRsZTogJHRyYW5zbGF0ZS5pbnN0YW50KCdXQVJOSU5HJykgKyAnOicsXG4gICAgICAgICAgICAgICAgY29udGVudDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UpLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogcGxhY2VtZW50LFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiB0eXBlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICd3YXJuaW5nJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIHN1Y2Nlc3MgdHlwZSBhbGVydFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZSBzdHJpbmcgZWcuICdDT01NT05fRVJST1InXG4gICAgICAgICAqL1xuICAgICAgICBhZGRTdWNjZXNzOiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICAkYWxlcnQoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAkdHJhbnNsYXRlLmluc3RhbnQoJ1NVQ0NFU1MnKSArICc6JyxcbiAgICAgICAgICAgICAgICBjb250ZW50OiAkdHJhbnNsYXRlLmluc3RhbnQobWVzc2FnZSksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyOiBjb250YWluZXIsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiBwbGFjZW1lbnQsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IHR5cGUsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbm1vZHVsZS4kaW5qZWN0ID0gWyckYWxlcnQnLCAnJHRyYW5zbGF0ZSddO1xubW9kdWxlLmV4cG9ydHMgPSBOb3RpZmljYXRpb25zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTdG9yYWdlKCkge1xuICAgIHZhciBzdG9yYWdlSXRlbXMgPSB7fTtcbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBzcGVjaWZpZWQgb2JqZWN0IHRvIHRoZSBzdG9yYWdlSXRlbXNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgc2V0U3RvcmFnZUl0ZW06IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgICAgICAgc3RvcmFnZUl0ZW1zID0gICBfLm1lcmdlKHN0b3JhZ2VJdGVtcywgb2JqZWN0LCBmdW5jdGlvbihvYmplY3RWYWx1ZSwgc291cmNlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KG9iamVjdFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIHNvdXJjZVZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcmV0dXJucyB0aGUgc3BlY2lmaWVkIG9iamVjdCBmcm9tIHRoZSBzdG9yYWdlSXRlbXNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGluZGV4XG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBnZXRTdG9yYWdlSXRlbTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBzdG9yYWdlSXRlbXNbaW5kZXhdO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcmVtb3ZlcyBzcGVjaWZpZWQgb2JqZWN0IGZyb20gdGhlIHN0b3JhZ2VJdGVtc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHJlbW92ZVN0b3JhZ2VJdGVtOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgc3RvcmFnZUl0ZW1zID0gXy5vbWl0KHN0b3JhZ2VJdGVtcywgaW5kZXgpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuU3RvcmFnZS4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRvcE5hdkJhcigpIHtcbiAgICAvKiogQHZhciBOYXZpZ2F0aW9uICovXG4gICAgcmV0dXJuIHJlcXVpcmUoJy4uLy4uL2xpYi9uYXZpZ2F0aW9uLmpzJykoKTtcbn1cblxubW9kdWxlLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gVG9wTmF2QmFyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUcmFuc2xhdGlvbnMoJHEsICR0cmFuc2xhdGUsIExhbmdSZXBvc2l0b3J5KSB7XG4gICAgLy9jcmVhdGUgZGVmZXJyZWQgcHJvbWlzZVxuICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAvL2dldCBsYW5ndWFnZXNcbiAgICBMYW5nUmVwb3NpdG9yeS5saXN0KCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICB2YXIgbGFuZ3VhZ2VzID0ge307XG4gICAgICAgIGxhbmd1YWdlcy5sYW5ncyA9IHJlc3BvbnNlO1xuICAgICAgICBsYW5ndWFnZXMuY3VycmVudExhbmcgPSBsYW5ndWFnZXMubGlzdExhbmcgPSByZXNwb25zZVswXTtcblxuICAgICAgICAvLyByZXNvbHZlIHRociBwcm9taXNlXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUobGFuZ3VhZ2VzKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiByZXR1cm5zIHRoZSBvYmplY3Qgb2YgbGFuZ3VhZ2VzXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBnZXRUcmFuc2xhdGlvbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzZXRzIHRoZSBsYW5ndWFnZSBvZiB0aGUgdHJhbnNsYXRpb24gZm9yIHRoZSBhbmd1bGFyLXRyYW5zbGF0ZSBtb2R1bGVcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGxhbmcgb2JqZWN0IHRoYXQgd2lsbCBiZSB1c2VkIHRvIHRyYW5zbGF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgc2VsZWN0QWRtaW5MYW5nOiBmdW5jdGlvbihsYW5nKSB7XG4gICAgICAgICAgICAkdHJhbnNsYXRlLmZhbGxiYWNrTGFuZ3VhZ2UoWydlbl9VUyddKTtcbiAgICAgICAgICAgICR0cmFuc2xhdGUudXNlKGxhbmcuaTE4bik7XG4gICAgICAgIH1cbiAgICB9O1xufVxuVHJhbnNsYXRpb25zLiRpbmplY3QgPSBbJyRxJywgJyR0cmFuc2xhdGUnLCAnTGFuZ1JlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gVHJhbnNsYXRpb25zO1xuXG4iLCJmdW5jdGlvbiBOYXZpZ2F0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gY2hlY2tzIGlmICdpdGVtJyBzdHJ1Y3R1cmUgaXMgdmFsaWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIHZhciBjaGVja1N0cnVjdHVyZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgaWYgKF8uaGFzKGl0ZW0sICdkaXZpZGVyJykpIHtcbiAgICAgICAgICAgIGlmIChpdGVtLmRpdmlkZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb3BlcnR5OiAnICsgJ1xcJ2RpdmlkZXJcXCcnICsgJyBtdXN0IGJlIHNldCB0byBcXCd0cnVlXFwnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIV8uaGFzKGl0ZW0sICd0aXRsZScpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb3BlcnR5OiAnICsgJ3RpdGxlJyArICcgaXMgbWlzc2luZycpO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmhhcyhpdGVtLCAnYWN0aW9uJykgJiYgIV8uaGFzKGl0ZW0sICdocmVmJykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvcGVydHk6ICcgKyAnXFwnYWN0aW9uXFwnIG9yIFxcJ2hyZWZcXCcnICsgJyBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHJldHVybnMgY2hpbGRyZW4gb2YgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAqXG4gICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICB2YXIgZ2V0Q2hpbGRyZW4gPSBmdW5jdGlvbih0aXRsZSkge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXSxcbiAgICAgICAgICAgIGZvdW5kRmxhZyA9IGZhbHNlO1xuICAgICAgICBfLmZvckVhY2goaXRlbXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnRpdGxlID09PSB0aXRsZSkge1xuICAgICAgICAgICAgICAgIGZvdW5kRmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzKHZhbHVlLCAnY2hpbGRyZW4nKSAmJiBBcnJheS5pc0FycmF5KHZhbHVlLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbiA9IHZhbHVlLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZm91bmRGbGFnID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJlbnQ6IFxcJycgKyB0aXRsZSArICdcXCcgaGF2ZSBubyBjaGlsZHJlbiwgYmVjYXVzZSBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIGFkZHMgZWxlbWVudCBhY2NvcmRpbmcgdG8gJ3Bvc2l0aW9uJyBhcmd1bWVudFxuICAgICAqIHBvc2l0aW9uID0gJ2JlZm9yZScgLSBlbGVtZW50IHdpbGwgYmUgYWRkZWQgYmVmb3JlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKiBwb3NpdGlvbiA9ICdhZnRlcicgLSBlbGVtZW50IHdpbGwgYmUgYWRkZWQgYWZ0ZXIgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAqXG4gICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiBzdHJpbmdcbiAgICAgKi9cbiAgICB2YXIgYWRkQmVmb3JlQWZ0ZXIgPSBmdW5jdGlvbih0aXRsZSwgaXRlbSwgcG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwb3NpdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgaXMgcmVxdWlyZWQsIHZhbHVlczogXFwnYmVmb3JlXFwnIG9yIFxcJ2FmdGVyXFwnJyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBvc2l0aW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBcXCdwb3NpdGlvblxcJyBtdXN0IGJlIG9mIHN0cmluZyB0eXBlLCB2YWx1ZXM6IFxcJ2JlZm9yZVxcJyBvciBcXCdhZnRlclxcJycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGVja1N0cnVjdHVyZShpdGVtKSkge1xuICAgICAgICAgICAgdmFyIGZvdW5kRmxhZyA9IGZhbHNlO1xuICAgICAgICAgICAgXy5mb3JFYWNoKGl0ZW1zLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUudGl0bGUgPT09IHRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kRmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gJ2JlZm9yZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnNwbGljZShpbmRleCwgMCwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdhZnRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnNwbGljZShpbmRleCArIDEsIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChmb3VuZEZsYWcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbGVtZW50OiBcXCcnICsgdGl0bGUgKyAnXFwnIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIGFkZHMgY2hpbGQgbGluayBhY2NvcmRpbmcgdG8gJ3Bvc2l0aW9uJyBhcmd1bWVudFxuICAgICAqIHBvc2l0aW9uID0gdHJ1ZSAtIGNoaWxkIHdpbGwgYmUgYWRkZWQgYXMgZmlyc3QgZWxlbWVudFxuICAgICAqIHBvc2l0aW9uID0gZmFsc2UgLSBjaGlsZCB3aWxsIGJlIGFkZGVkIGFzIGxhc3QgZWxlbWVudFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgKiBAcGFyYW0gcG9zaXRpb24gYm9vbGVhblxuICAgICAqL1xuICAgIHZhciBhZGRDaGlsZCA9IGZ1bmN0aW9uKHBhcmVudCwgaXRlbSwgcG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwb3NpdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBvc2l0aW9uICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgbXVzdCBiZSBvZiBib29sZWFuIHR5cGUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgIHZhciBmb3VuZEZsYWcgPSBmYWxzZTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChpdGVtcywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnRpdGxlID09PSBwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmhhcyh2YWx1ZSwgJ2NoaWxkcmVuJykgfHwgIUFycmF5LmlzQXJyYXkodmFsdWUuY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUuY2hpbGRyZW4udW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmNoaWxkcmVuLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm91bmRGbGFnID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGZvdW5kRmxhZyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BhcmVudDogXFwnJyArIHBhcmVudCArICdcXCcgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gYWRkcyBjaGlsZCBsaW5rIGFjY29yZGluZyB0byAncG9zaXRpb24nIGFyZ3VtZW50XG4gICAgICogcG9zaXRpb24gPSAnYmVmb3JlJyAtIGNoaWxkIHdpbGwgYmUgYWRkZWQgYmVmb3JlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKiBwb3NpdGlvbiA9ICdhZnRlcicgLSBjaGlsZCB3aWxsIGJlIGFkZGVkIGFmdGVyIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiBzdHJpbmdcbiAgICAgKi9cbiAgICB2YXIgYWRkQmVmb3JlQWZ0ZXJDaGlsZCA9IGZ1bmN0aW9uKHBhcmVudCwgdGl0bGUsIGl0ZW0sIHBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcG9zaXRpb24gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIGlzIHJlcXVpcmVkLCB2YWx1ZXM6IFxcJ2JlZm9yZVxcJyBvciBcXCdhZnRlclxcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwb3NpdGlvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgbXVzdCBiZSBvZiBzdHJpbmcgdHlwZSwgdmFsdWVzOiBcXCdiZWZvcmVcXCcgb3IgXFwnYWZ0ZXJcXCcnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgIHZhciBmb3VuZEZsYWcgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBjaGlsZHJlbiA9IGdldENoaWxkcmVuKHBhcmVudCk7XG5cbiAgICAgICAgICAgIGlmIChjaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BhcmVudDogXFwnJyArIHBhcmVudCArICdcXCcgaGF2ZSBubyBjaGlsZHJlbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXy5mb3JFYWNoKGNoaWxkcmVuLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUudGl0bGUgPT09IHRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kRmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gJ2JlZm9yZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLnNwbGljZShpbmRleCwgMCwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdhZnRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLnNwbGljZShpbmRleCArIDEsIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChmb3VuZEZsYWcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaGlsZDogXFwnJyArIHRpdGxlICsgJ1xcJyBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGVsZW1lbnQgdG8gdGhlIGVuZCBvZiBtZW51XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50IHRvIHRoZSBtZW51IGFzIGZpcnN0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkRmlyc3Q6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChjaGVja1N0cnVjdHVyZShpdGVtKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zLnVuc2hpZnQoaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGVsZW1lbnQgJ2l0ZW0nIHRvIHRoZSBtZW51IGJlZm9yZSBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRCZWZvcmU6IGZ1bmN0aW9uKHRpdGxlLCBpdGVtKSB7XG4gICAgICAgICAgICBhZGRCZWZvcmVBZnRlcih0aXRsZSwgaXRlbSwgJ2JlZm9yZScpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50ICdpdGVtJyB0byB0aGUgbWVudSBhZnRlciBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIG5ld0l0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRBZnRlcjogZnVuY3Rpb24odGl0bGUsIG5ld0l0ZW0pIHtcbiAgICAgICAgICAgIGFkZEJlZm9yZUFmdGVyKHRpdGxlLCBuZXdJdGVtLCAnYWZ0ZXInKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgY2hpbGQgbGluayBhcyBmaXJzdCB0byB0aGUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3BhcmVudCcgYXJndW1lbnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRGaXJzdENoaWxkOiBmdW5jdGlvbihwYXJlbnQsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZENoaWxkKHBhcmVudCwgaXRlbSwgdHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGNoaWxkIGxpbmsgYXMgbGFzdCB0byB0aGUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3BhcmVudCcgYXJndW1lbnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRMYXN0Q2hpbGQ6IGZ1bmN0aW9uKHBhcmVudCwgaXRlbSkge1xuICAgICAgICAgICAgYWRkQ2hpbGQocGFyZW50LCBpdGVtLCBmYWxzZSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGxpbmsgdG8gdGhlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICdwYXJlbnQnIGJlZm9yZSBjaGlsZCBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRCZWZvcmVDaGlsZDogZnVuY3Rpb24ocGFyZW50LCB0aXRsZSwgaXRlbSkge1xuICAgICAgICAgICAgYWRkQmVmb3JlQWZ0ZXJDaGlsZChwYXJlbnQsIHRpdGxlLCBpdGVtLCAnYmVmb3JlJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGxpbmsgdG8gdGhlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICdwYXJlbnQnIGFmdGVyIGNoaWxkIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZEFmdGVyQ2hpbGQ6IGZ1bmN0aW9uKHBhcmVudCwgdGl0bGUsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZEJlZm9yZUFmdGVyQ2hpbGQocGFyZW50LCB0aXRsZSwgaXRlbSwgJ2FmdGVyJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiByZXR1cm4gaXRlbXMgZnJvbSBtZW51XG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgICAgICovXG4gICAgICAgIGdldEl0ZW1zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGV4cG9ydHMgbGlua3MgdG8gJ2Ryb3Bkb3duJyBtZW51XG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgICAgICovXG4gICAgICAgIGV4cG9ydFRvRHJvcGRvd25NZW51OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgICAgICB2YXIgbmV3SXRlbSA9IHt9O1xuICAgICAgICAgICAgXy5mb3JFYWNoKGl0ZW1zLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIF8uZm9ySW4odmFsdWUsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gJ3RpdGxlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS50ZXh0ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChuZXdJdGVtKTtcbiAgICAgICAgICAgICAgICBuZXdJdGVtID0ge307XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICB9XG4gICAgfTtcbn1cbm1vZHVsZS5leHBvcnRzID0gTmF2aWdhdGlvbjtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJMaXN0Q3RybCgkc2NvcGUsICRzdGF0ZSwgVXNlclJlcG9zaXRvcnksICRtb2RhbCkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL3VzZXIvZGlyZWN0aXZlcy8nO1xuICAgIC8vIERlbGV0ZSBtb2RhbFxuICAgIHZtLmRlbGV0ZU1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZXMgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHZpZXdQYXRoICsgJ3VzZXJEZWxldGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdXNlcklkIHVzZXIgaWQgdG8gYmUgcmVtb3ZlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKHVzZXJJZCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0udXNlcklkID0gdXNlcklkO1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ0RFTEVURV9VU0VSX1FVRVNUSU9OJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIERFTEVURSBhY3Rpb24gZm9yIHVzZXIgaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGRlbGV0ZVVzZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgVXNlclJlcG9zaXRvcnkuZGVsZXRlKHZtLnVzZXJJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygkc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9O1xufVxuXG5Vc2VyTGlzdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsICdVc2VyUmVwb3NpdG9yeScsICckbW9kYWwnXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlckxpc3RDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlckRldGFpbHNDdHJsKCRzY29wZSwgJHN0YXRlUGFyYW1zLCBVc2VyUmVwb3NpdG9yeSkge1xuICAgIC8vIGdldCBzaW5nbGUgdXNlclxuICAgIFVzZXJSZXBvc2l0b3J5Lm9uZSgkc3RhdGVQYXJhbXMudXNlcklkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICRzY29wZS51c2VyID0gVXNlclJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpO1xuICAgIH0pO1xufVxuVXNlckRldGFpbHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCAnVXNlclJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlckRldGFpbHNDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlckRldGFpbHNDdHJsKCRzY29wZSwgJHN0YXRlLCAkc3RhdGVQYXJhbXMsIFVzZXJSZXBvc2l0b3J5LCBOb3RpZmljYXRpb25zKSB7XG4gICAgLy8gZ2V0IHNpbmdsZSB1c2VyXG4gICAgVXNlclJlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy51c2VySWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBVc2VyUmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2F2ZVVzZXIgPSBmdW5jdGlvbigpe1xuICAgICAgICBVc2VyUmVwb3NpdG9yeS51cGRhdGUoJHNjb3BlLnVzZXIuaWQsICRzY29wZS51c2VyKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgICRzdGF0ZS5nbygndXNlci5saXN0Jyk7XG4gICAgICAgICAgICBOb3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ1RIRV9DSEFOR0VTX0hBVkVfQkVFTl9TQVZFRCcpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG59XG5Vc2VyRGV0YWlsc0N0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRzdGF0ZScsJyRzdGF0ZVBhcmFtcycsICdVc2VyUmVwb3NpdG9yeScsICdOb3RpZmljYXRpb25zJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJEZXRhaWxzQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJMaXN0Q3RybCgkc2NvcGUsICRzdGF0ZVBhcmFtcywgJHJvb3RTY29wZSwgVXNlclJlcG9zaXRvcnksIE5nVGFibGVQYXJhbXMpIHtcbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ2lkJzogJ2Rlc2MnIC8vIGluaXRpYWwgc29ydGluZ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBsYW5nOiAkc2NvcGUubGlzdExhbmcuY29kZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAndXNlcidcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KCRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mICRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKCRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQgbGlzdCBieSBkZWZhdWx0XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IFVzZXJSZXBvc2l0b3J5Lmxpc3QocXVlcnlPcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gQ29udGVudHMgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKFVzZXJSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuVXNlckxpc3RDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCAnJHJvb3RTY29wZScsICdVc2VyUmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJMaXN0Q3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJEZWxldGVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJEZWxldGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLC8vIGJlY2F1c2UgdGhlIHNjb3BlIGlzIGlzb2xhdGVkXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgVXNlckRlbGV0ZUNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIFVzZXJEZWxldGVDb250cm9sbGVyLmRlbGV0ZU1vZGFsLnNob3dNb2RhbChhdHRycy51c2VySWQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Vc2VyRGVsZXRlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlckRlbGV0ZUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2FkbWluLnVzZXInLCBbJ25nVGFibGUnXSlcbiAgICAuY29uZmlnKFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgICAgICdSZXN0YW5ndWxhclByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgUmVzdGFuZ3VsYXJQcm92aWRlcikge1xuXG4gICAgICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvdXNlci8nO1xuXG4gICAgICAgICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgLnN0YXRlKCd1c2VyJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvdXNlcicsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdpbmRleC5odG1sJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCd1c2VyLnNob3cnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy97dXNlcklkfS9zaG93JyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdzaG93Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyRGV0YWlsc0N0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5zdGF0ZSgndXNlci5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve3VzZXJJZH0vZWRpdCcsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVXNlckVkaXRDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ3VzZXIubGlzdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2xpc3Qve3VzZXJJZH0/cGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdsaXN0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmNvbnRyb2xsZXIoJ1VzZXJMaXN0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvVXNlckxpc3RDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ1VzZXJEZWxldGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Vc2VyRGVsZXRlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdVc2VyRWRpdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL1VzZXJFZGl0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdVc2VyRGV0YWlsc0N0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL1VzZXJEZXRhaWxzQ3RybCcpKVxuICAgIC5mYWN0b3J5KCdVc2VyUmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvVXNlclJlcG9zaXRvcnkuanMnKSlcbiAgICAuZGlyZWN0aXZlKCd1c2VyRGVsZXRlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL1VzZXJEZWxldGVCdXR0b24uanMnKSlcbiAgICAucnVuKFtcbiAgICAgICAgJ05hdkJhcicsXG4gICAgICAgIGZ1bmN0aW9uKE5hdkJhcikge1xuICAgICAgICAgICAgTmF2QmFyLmFkZCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICdVU0VSJywgYWN0aW9uOiAndXNlci5saXN0JywgaWNvbjogJ2ZhIGZhLXVzZXInXG4gICAgICAgICAgICAgICAgLy9jaGlsZHJlbjogW1xuICAgICAgICAgICAgICAgIC8vICAgIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgdGl0bGU6ICdVU0VSX0xJU1QnLFxuICAgICAgICAgICAgICAgIC8vICAgICAgICBhY3Rpb246ICd1c2VyLmxpc3QnLFxuICAgICAgICAgICAgICAgIC8vICAgICAgICBpY29uOiAnZmEgZmEtdGgnXG4gICAgICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgICAgIC8vXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJSZXBvc2l0b3J5KFJlc3Rhbmd1bGFyKSB7XG4gICAgdmFyIGFwaSA9ICdhZG1pbi91c2Vycyc7XG4gICAgdmFyIHVzZXJzID0gUmVzdGFuZ3VsYXIuYWxsKGFwaSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmdldChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICB0cmVlOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpKS5nZXRMaXN0KCd0cmVlJywgcGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGlzdDogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gdXNlcnMuZ2V0TGlzdChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBjbGVhbjogZnVuY3Rpb24oZWxlbSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLnN0cmlwUmVzdGFuZ3VsYXIoZWxlbSk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGV0ZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkucmVtb3ZlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24oaWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuY3VzdG9tUFVUKHVzZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuVXNlclJlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlclJlcG9zaXRvcnk7XG4iXX0=
