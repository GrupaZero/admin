(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i]
    revLookup[code.charCodeAt(i)] = i
  }

  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/base64-js/lib/b64.js","/../../node_modules/base64-js/lib")

},{"_process":5,"buffer":2}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  that.write(string, encoding)
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
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

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
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
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

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

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
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

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

function arrayIndexOf (arr, val, byteOffset, encoding) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var foundIndex = -1
  for (var i = byteOffset; i < arrLength; ++i) {
    if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
      if (foundIndex === -1) foundIndex = i
      if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
    } else {
      if (foundIndex !== -1) i -= i - foundIndex
      foundIndex = -1
    }
  }

  return -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  if (Buffer.isBuffer(val)) {
    // special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(this, val, byteOffset, encoding)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset, encoding)
  }

  throw new TypeError('val must be string, number or Buffer')
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
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
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
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
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
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
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
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
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

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
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

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
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

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
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
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
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
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
    this[offset] = (value & 0xff)
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
    this[offset + 3] = (value & 0xff)
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
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
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
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
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
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
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
    this[offset + 1] = (value & 0xff)
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
    this[offset] = (value & 0xff)
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
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
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
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

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

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

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
    } else if (codePoint < 0x110000) {
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
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
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
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/buffer/index.js","/../../node_modules/buffer")

},{"_process":5,"base64-js":1,"buffer":2,"ieee754":3,"isarray":4}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

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
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/ieee754/index.js","/../../node_modules/ieee754")

},{"_process":5,"buffer":2}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/isarray/index.js","/../../node_modules/isarray")

},{"_process":5,"buffer":2}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
    try {
        cachedSetTimeout = setTimeout;
    } catch (e) {
        cachedSetTimeout = function () {
            throw new Error('setTimeout is not defined');
        }
    }
    try {
        cachedClearTimeout = clearTimeout;
    } catch (e) {
        cachedClearTimeout = function () {
            throw new Error('clearTimeout is not defined');
        }
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        return setTimeout(fun, 0);
    } else {
        return cachedSetTimeout.call(null, fun, 0);
    }
}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        clearTimeout(marker);
    } else {
        cachedClearTimeout.call(null, marker);
    }
}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
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
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
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
        runTimeout(drainQueue);
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

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/process/browser.js","/../../node_modules/process")

},{"_process":5,"buffer":2}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

require('./core/module.js');
require('./content/module.js');
require('./blocks/module.js');
require('./user/module.js');
require('./files/module.js');
require('./settings/module.js');

var dependencies = [
    'restangular',
    'ui.router',
    'ui.router.default',
    'ct.ui.router.extras',
    'ngAnimate',
    'mgcrea.ngStrap',
    'pascalprecht.translate',
    'ckeditor',
    'angular-loading-bar',
    'ng.httpLoader',
    'cfp.hotkeys',
    'admin.core',
    'admin.content',
    'admin.blocks',
    'admin.files',
    'admin.user',
    'admin.settings',
    'ngFileUpload',
    'ngMessages'
];
dependencies.push.apply(dependencies, modules); // Other modules are loaded by twig

angular.module('admin', dependencies).config([
    '$stateProvider',
    '$urlRouterProvider',
    'RestangularProvider',
    '$translateProvider',
    '$translatePartialLoaderProvider',
    'httpMethodInterceptorProvider',
    function($stateProvider, $urlRouterProvider, RestangularProvider, $translateProvider, $translatePartialLoaderProvider, httpMethodInterceptorProvider) {
        var viewPath = 'gzero/admin/views/';

        // For any unmatched url, redirect to /state1
        $urlRouterProvider.otherwise('/');
        // Whitelist the domains that the loader wil show for
        httpMethodInterceptorProvider.whitelistDomain(Config.domain);
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
        $translateProvider.preferredLanguage('en_US');

        // User more secure variant sanitize strategy for escaping;
        $translateProvider.useSanitizeValueStrategy('escape');

        RestangularProvider.setBaseUrl(Config.apiUrl + '/v1');

        RestangularProvider.setDefaultHttpFields({
            cache: false,
            withCredentials: true
        });

        // Set default request headers
        RestangularProvider.setDefaultHeaders({
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('gzero_api_token')
        });

        // Rename Restangular route field to use a $ prefix for easy distinction between data and metadata
        RestangularProvider.setRestangularFields({route: '$route'});
        // Add a response interceptor
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
    'Utils',
    function(NavBar, $rootScope, Restangular, Utils) {
        NavBar.addFirst({title: 'DASHBOARD', action: 'home', icon: 'fa fa-home'});
        $rootScope.baseUrl = Utils.Config.url;

        Restangular.setErrorInterceptor(function(response, deferred, responseHandler) {
            if (response.status === 404) {
                Utils.Notifications.addError('COMMON_ERROR');
                return false; // error handled
            } else if (response.status === 500) {
                Utils.Notifications.addError(response.data.message);
            } else if (response.status === 403) {
                localStorage.removeItem('gzero_api_token');
                window.location.reload();
            }
            Utils.Notifications.addError(response.data.message);
            return false; // error not handled
        });
    }
]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/app.js","/src")

},{"./blocks/module.js":12,"./content/module.js":45,"./core/module.js":50,"./files/module.js":68,"./settings/module.js":78,"./user/module.js":86,"_process":5,"buffer":2}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function BlocksAddCtrl($scope, Utils, langCode, BlocksRepository, BlockService) {
    $scope.ckOptions = Utils.ckOptions;
    $scope.isEdited = false;
    // default values
    $scope.newBlock = {
        isActive: true,
        weight: 0,
        translations: {
            langCode: langCode
        }
    };

    // if block types are set
    if (typeof $scope.blockTypes !== 'undefined') {
        $scope.newBlock.type = $scope.blockTypes[0];
    }

    // if block regions are set
    if (typeof $scope.blockRegions !== 'undefined') {
        $scope.newBlock.region = $scope.blockRegions[0];
    }

    // block POST action
    $scope.save = function(newBlock) {
        newBlock = BlockService.prepareRequestData(newBlock);
        BlocksRepository.create(newBlock).then(function(response) {
            Utils.Notifications.addSuccess('BLOCK_CREATED');
            Utils.$state.go('blocks.list', {}, {reload: true});
        }, function(response) {
            Utils.Notifications.addError(response.data.message);
        });
    };
}

BlocksAddCtrl.$inject = ['$scope', 'Utils', 'langCode', 'BlocksRepository', 'BlockService'];
module.exports = BlocksAddCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/blocks/controllers/BlocksAddCtrl.js","/src/blocks/controllers")

},{"_process":5,"buffer":2}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function BlocksEditCtrl($scope, Utils, langCode, block, BlocksRepository, BlockService) {
    $scope.ckOptions = Utils.ckOptions;
    $scope.isEdited = true;
    // if block types are set
    if (typeof block !== 'undefined') {
        $scope.newBlock = BlocksRepository.clean(block);
        // set active translation
        if (typeof $scope.newBlock.translations !== 'undefined') {
            $scope.newBlock.translations = _.find($scope.newBlock.translations, {'langCode': langCode});
            // if not found, set as new
            if (typeof $scope.newBlock.translations === 'undefined') {
                $scope.newBlock.translations = {'langCode': langCode};
            }
        }
    }

    // check for translations update @TODO use translations history
    $scope.$watchCollection('newBlock.translations', function(newValue, oldValue) {
        if (newValue !== oldValue) {
            $scope.isTranslationChanged = true;
        }
    });

    // block PUT action
    $scope.save = function(newBlock) {
        newBlock = BlockService.prepareRequestData(newBlock);
        // update block
        BlocksRepository.update(Utils.$stateParams.blockId, newBlock).then(function(response) {
            // add new translation @TODO use translations history
            if ($scope.isTranslationChanged) {
                BlocksRepository.createTranslation(Utils.$stateParams.blockId, newBlock.translations).then(function(response) {
                    Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
                    Utils.redirectBack('blocks.list');
                }, function(response) {
                    Utils.Notifications.addErrors(response.data.message);
                });
            } else {
                Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
                Utils.redirectBack('blocks.list');
            }

        }, function(response) {
            Utils.Notifications.addError(response.data.message);
        });
    };
}

BlocksEditCtrl.$inject = ['$scope', 'Utils', 'langCode', 'block', 'BlocksRepository', 'BlockService'];
module.exports = BlocksEditCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/blocks/controllers/BlocksEditCtrl.js","/src/blocks/controllers")

},{"_process":5,"buffer":2}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function BlocksListCtrl($scope, Utils, NgTableParams, BlocksRepository) {
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'region': 'desc', // initial sorting
            'weight': 'asc'
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            $scope.requestPending = true;
            // prepare options to be sent to api
            var queryOptions = {
                lang: Utils.Config.defaultLangCodee
            };

            // lang sort options
            if (typeof $scope.transLang !== 'undefined') {
                queryOptions.lang = $scope.transLang.code;
            }

            // params.count() - number of items per page declared in view
            if (typeof Utils.$stateParams.perPage !== 'undefined') {
                params.count(Utils.$stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof Utils.$stateParams.page !== 'undefined') {
                params.page(Utils.$stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting() && typeof $scope.transLang !== 'undefined') {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // get list by default
            var promise = BlocksRepository.list(queryOptions);

            // Promise is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                $scope.requestPending = false;
                params.total(response.meta.total);
                $defer.resolve(BlocksRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

BlocksListCtrl.$inject = ['$scope', 'Utils', 'NgTableParams', 'BlocksRepository'];
module.exports = BlocksListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/blocks/controllers/BlocksListCtrl.js","/src/blocks/controllers")

},{"_process":5,"buffer":2}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function BlocksDeleteCtrl($scope, Utils, BlocksRepository, $modal) {
    var vm = this;
    var viewPath = 'gzero/admin/views/blocks/directives/';
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
                templateUrl: viewPath + 'blockDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });

            // Bind hotkeys
            Utils.hotkeys.add({
                combo: 'enter',
                description: Utils.$filter('translate')(
                    vm.forceDelete ? 'CONFIRM_DELETE' : 'CONFIRM_MOVE_TO_TRASH'
                ),
                callback: function() {
                    self.deleteContent();
                }
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param blockId block id to be removed, it is saved in the scope
         * @param forceDelete use forceDelete
         */
        showModal: function(blockId, forceDelete) {
            var self = this;
            vm.blockId = blockId;
            vm.forceDelete = forceDelete;
            if (vm.forceDelete === true) {
                self.initModal('PLEASE_CONFIRM', 'DELETE_BLOCK_QUESTION');
            } else {
                self.initModal('PLEASE_CONFIRM', 'MOVE_BLOCK_TO_TRASH_QUESTION');
            }
            Utils.hotkeys.del('enter');
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
         * Function performs the RestAngular DELETE action for block id in scope
         *
         */
        deleteBlock: function() {
            var self = this;
            // Soft and force delete block @TODO handle soft delete
            BlocksRepository.delete(vm.blockId).then(function(response) {
                BlocksRepository.delete(vm.blockId, vm.forceDelete).then(function(response) {
                    self.closeModal();
                    Utils.$state.go(Utils.$state.current, {}, {reload: true});
                    Utils.Notifications.addSuccess(
                        vm.forceDelete ? 'BLOCK_HAS_BEEN_DELETED' : 'BLOCK_HAS_BEEN_MOVED_TO_TRASH'
                    );
                });
            });
        }
    };
}

BlocksDeleteCtrl.$inject = ['$scope', 'Utils', 'BlocksRepository', '$modal'];
module.exports = BlocksDeleteCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/blocks/controllers/directives/BlocksDeleteCtrl.js","/src/blocks/controllers/directives")

},{"_process":5,"buffer":2}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function BlockDeleteButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'BlocksDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, BlocksDeleteCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                BlocksDeleteCtrl.deleteModal.showModal(attrs.blockId, attrs.force === 'true');
            });
        }
    };
}

BlockDeleteButton.$inject = [];
module.exports = BlockDeleteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/blocks/directives/BlockDeleteButton.js","/src/blocks/directives")

},{"_process":5,"buffer":2}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

angular.module('admin.blocks', [])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'gzero/admin/views/blocks/';

            // Now set up the states
            $stateProvider
                .state('blocks', {
                    url: '/blocks',
                    templateUrl: viewPath + 'index.html',
                    abstract: true
                })
                // BLOCK LIST
                .state('blocks.list', {
                    url: '/list?page&perPage',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'list.html',
                            controller: 'BlocksListCtrl'
                        }
                    }

                })
                // BLOCK ADD
                .state('blocks.add', {
                    url: '/add/{langCode}',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'form.html',
                            controller: 'BlocksAddCtrl'
                        }
                    },
                    resolve: {
                        langCode: [
                            '$state', '$stateParams', function($state, $stateParams) {
                                return $stateParams.langCode;
                            }
                        ]
                    }
                })
                // BLOCK EDIT
                .state('blocks.edit', {
                    url: '/{blockId}/edit/{langCode}',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'form.html',
                            controller: 'BlocksEditCtrl'
                        }
                    },
                    resolve: {
                        langCode: [
                            '$state', '$stateParams', function($state, $stateParams) {
                                return $stateParams.langCode;
                            }
                        ],
                        block: [
                            '$stateParams', 'BlocksRepository', function($stateParams, BlocksRepository) {
                                return BlocksRepository.one($stateParams.blockId);
                            }
                        ]
                    }
                });
        }
    ])
    .controller('BlocksListCtrl', require('./controllers/BlocksListCtrl'))
    .controller('BlocksAddCtrl', require('./controllers/BlocksAddCtrl'))
    .controller('BlocksEditCtrl', require('./controllers/BlocksEditCtrl'))
    .controller('BlocksDeleteCtrl', require('./controllers/directives/BlocksDeleteCtrl'))
    .service('BlockService', require('./services/BlockService.js'))
    .factory('BlocksRepository', require('./services/BlocksRepository.js'))
    .directive('blockDeleteButton', require('./directives/BlockDeleteButton.js'))
    .run([
        'NavBar',
        function(NavBar) {
            NavBar.add({
                title: 'BLOCKS', action: 'blocks.list', icon: 'fa fa-th-large'
            });
        }
    ]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/blocks/module.js","/src/blocks")

},{"./controllers/BlocksAddCtrl":7,"./controllers/BlocksEditCtrl":8,"./controllers/BlocksListCtrl":9,"./controllers/directives/BlocksDeleteCtrl":10,"./directives/BlockDeleteButton.js":11,"./services/BlockService.js":13,"./services/BlocksRepository.js":14,"_process":5,"buffer":2}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function BlockService() {
    return {
        prepareRequestData: function(block) {
            // handle block filter
            if (block.filter !== null && typeof block.filter !== 'undefined') {
                // set empty filter values if not exists
                if (!('+' in block.filter)) {
                    block.filter['+'] = [];
                }
                if (!('-' in block.filter)) {
                    block.filter['-'] = [];
                }
                // handle empty block filter
                if (block.filter['+'].length === 0 && block.filter['-'].length === 0) {
                    block.filter = null;
                }
            }
            return block;
        }
    };
}

BlockService.$inject = [];
module.exports = BlockService;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/blocks/services/BlockService.js","/src/blocks/services")

},{"_process":5,"buffer":2}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function BlocksRepository(Restangular) {
    var api = 'admin/blocks';
    var blocks = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        list: function(params) {
            return blocks.getList(params);
        },
        listForContent: function(id) {
            return Restangular.one(api + '/content', id).getList();
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        },
        create: function(newContent) {
            return blocks.post(newContent);
        },
        delete: function(id, forceDelete) {
            return Restangular.one(api, id).remove({force: forceDelete});
        },
        update: function(categoryKey, data) {
            return Restangular.one(api, categoryKey).customPUT(data);
        },
        createTranslation: function(id, newTranslation) {
            return Restangular.one(api, id).all('translations').post(newTranslation);
        }
    };
}

BlocksRepository.$inject = ['Restangular'];
module.exports = BlocksRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/blocks/services/BlocksRepository.js","/src/blocks/services")

},{"_process":5,"buffer":2}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentAddCtrl($scope, Utils, listParent, ContentRepository) {
    var parentId = null;
    $scope.contentType = Utils.$stateParams.type;

    $scope.ckOptions = Utils.ckOptions;

    // if parent category exists
    if (typeof listParent !== 'undefined') {
        $scope.listParent = listParent; // selected category
        parentId = listParent.id;
    }
    // default translations lang code
    $scope.newContent = {
        type: Utils.$stateParams.type,
        isActive: true,
        translations: {
            langCode: $scope.transLang.code
        }
    };

    // Angular strap dropdown for save button
    $scope.contentSaveButtonLinks = [
        {
            text: 'SAVE_AND_CONTINUE_EDITING',
            click: 'addNewContent(newContent, "content.edit.details")'
        },
        {
            text: 'SAVE_AND_ADD_ANOTHER',
            click: 'addNewContent(newContent, "content.add")'
        }
    ];

    // contents POST action
    $scope.addNewContent = function addNewContent(newContent, redirect) {
        newContent.parentId = parentId; // set parent category as null
        newContent.publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // set publish at date
        // if parent category exists
        if (typeof $scope.listParent !== 'undefined') {
            // check for route translation in selected language
            var route = _.map(_.filter($scope.listParent.route.translations, {langCode: newContent.translations.langCode}), 'url');
            if (!route.length) {
                newContent.parentId = null; // if not found set as uncategorized
            }
        }
        ContentRepository.newContent(newContent).then(function(response) {
            var message = Utils.$stateParams.type === 'category' ? 'CATEGORY_CREATED' : 'CONTENT_CREATED';
            Utils.Notifications.addSuccess(message);
            // when there is custom redirect
            if (typeof redirect !== 'undefined') {
                var params = (redirect === 'content.edit.details') ? {
                    contentId: response.id,
                    langCode: newContent.translations.langCode
                } : {type: Utils.$stateParams.type};

                Utils.$state.go(redirect, params, {reload: true});
            } else {
                if (Utils.$stateParams.type === 'category') {
                    // when create a category then set it as a new listParent on content list
                    Utils.$state.go('content.list', {contentId: response.id}, {reload: true});
                } else {
                    // otherwise go to list without new listParent
                    Utils.$state.go('content.list', {}, {reload: true});
                }
            }
        });
    };
}
ContentAddCtrl.$inject = ['$scope', 'Utils', 'listParent', 'ContentRepository'];
module.exports = ContentAddCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentAddCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentAddTranslationCtrl($scope, $translate, Utils, content, ContentRepository) {
    $scope.ckOptions = Utils.ckOptions;
    $scope.isLoaded = true; // form visibility

    // default translations lang code
    $scope.newContentTranslation = {
        contentId: Utils.$stateParams.contentId,
        langCode: Utils.$stateParams.langCode
    };

    // if parent category exists
    if (content.parentId !== null) {
        $scope.isLoaded = false; // hide form
        // get parent category
        ContentRepository.one(content.parentId).then(function(response) {
            var parent = ContentRepository.clean(response);
            // check for route translation in selected language
            var route = _.map(_.filter(parent.route.translations, {langCode: $scope.newContentTranslation.langCode}), 'url');
            if (!route.length) {
                // Redirect user to previous state or content list
                Utils.redirectBack('content.list');
                // "Before adding translations to this content, you need to translate the categories in which it is located!"
                Utils.Notifications.addInfo('NO_PARENT_TRANSLATION_ERROR', { contentType: $translate.instant(content.type.toUpperCase()).toLowerCase() });
            } else {
                // parent url is translated, show form
                $scope.isLoaded = true;
            }
        });
    }

    // contents POST action
    $scope.addNewContentTranslation = function() {
        ContentRepository.newContentTranslation(Utils.$stateParams.contentId, $scope.newContentTranslation).then(function(response) {
            // Redirect user to previous state or content list
            Utils.redirectBack('content.list');
        });
    };
}
ContentAddTranslationCtrl.$inject = ['$scope', '$translate', 'Utils', 'content', 'ContentRepository'];
module.exports = ContentAddTranslationCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentAddTranslationCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentBlocksCtrl($scope, Utils, blocks, BlocksRepository) {
    // if there are blocks available
    if (typeof blocks !== 'undefined') {
        $scope.blocks = _.groupBy(BlocksRepository.clean(blocks), 'region');
    }
    // visibility settings
    $scope.showBody = true; // show all blocks body by default
    $scope.showRegion = true; // show all regions by default

}

ContentBlocksCtrl.$inject = ['$scope', 'Utils', 'blocks', 'BlocksRepository'];
module.exports = ContentBlocksCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentBlocksCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentCategoryTreeCtrl($scope, categories, openCategories, listParent, Utils) {
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

    // if there are open categories in the Utils.Storage
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
        Utils.Storage.setStorageItem({openCategories: $scope.openCategories});
    }

    // removes listParent id from Utils.Storage
    $scope.uncategorized = function() {
        Utils.Storage.removeStorageItem('contentListParent');
    };

    // toggles Node in categories tree and manage Utils.Storage open categories object
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
        Utils.Storage.setStorageItem({openCategories: $scope.openCategories});
    };

}
ContentCategoryTreeCtrl.$inject = ['$scope', 'categories', 'openCategories', 'listParent', 'Utils'];
module.exports = ContentCategoryTreeCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentCategoryTreeCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDashboardCtrl($scope) {

}
ContentDashboardCtrl.$inject = ['$scope'];
module.exports = ContentDashboardCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDashboardCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDetailsCtrl($scope, content, langCode, ContentRepository, Utils) {

    $scope.Config = Utils.Config;

    // TODO: get registered tabs
    $scope.tabs = [
        {
            title: 'CONTENT',
            action: 'details',
            default: true // default active tab in settings edit mode
        },
        {
            title: 'HISTORY_OF_CHANGES',
            action: 'history'
        },
        {
            title: 'BLOCKS',
            action: 'blocks'
        }
    ];

    // if lang code exists
    if (typeof langCode !== 'undefined') {
        $scope.langCode = langCode;
    }

    // if content exists
    if (typeof content !== 'undefined') {
        $scope.content = ContentRepository.clean(content);
        // if content parent exists
        if (content.path.length > 1) {
            // the last but one id number from path
            var parentId = _.takeRight(content.path, 2)[0];
            ContentRepository.one(parentId).then(function(response) {
                $scope.contentParent = ContentRepository.clean(response);
            });
        }
    }

    $scope.saveContent = function() {
        ContentRepository
            .updateContent($scope.content.id, $scope.content)
            .then(function() {
                Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
            });
    };

}
ContentDetailsCtrl.$inject = ['$scope', 'content', 'langCode', 'ContentRepository', 'Utils'];
module.exports = ContentDetailsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDetailsCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ContentDetailsEditCtrl
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentDetailsEditCtrl($scope, Utils, content, langCode, ContentRepository) { //jshint ignore:line

    /**
     * CKEditor settings getter
     */
    $scope.ckOptions = Utils.ckOptions;
    
    /**
     * Currently active translation object
     *
     * @type Object
     */
    $scope.activeTranslation = Utils.getTranslationByLang((content.translations.slice(0)), langCode);

    /**
     * save current active translation as new active translation
     * and go back to details show state
     */
    $scope.saveTranslation = function() {
        ContentRepository.newContentTranslation(content.id, $scope.activeTranslation).then(function() {
            Utils.$state.go('content.show.details', {
                contentId: content.id,
                langCode: langCode
            });
            Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
        });
    };

}
ContentDetailsEditCtrl.$inject = ['$scope', 'Utils', 'content', 'langCode', 'ContentRepository'];
module.exports = ContentDetailsEditCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDetailsEditCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ContentHistoryCtrl
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentHistoryCtrl($scope, Utils, content, langCode, ContentRepository, NgTableParams) { //jshint ignore:line
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'createdAt': 'desc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            // prepare options to be sent to api
            var queryOptions = {
                langCode: langCode
            };

            // params.count() - number of items per page declared in view
            if (typeof Utils.$stateParams.perPage !== 'undefined') {
                params.count(Utils.$stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof Utils.$stateParams.page !== 'undefined') {
                params.page(Utils.$stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // get list by default
            var promise = ContentRepository.translations(content.id, queryOptions);

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(ContentRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

ContentHistoryCtrl.$inject = ['$scope', 'Utils', 'content', 'langCode', 'ContentRepository', 'ngTableParams'];
module.exports = ContentHistoryCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentHistoryCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentListCtrl($scope, Utils, listParent, ContentRepository, NgTableParams) {
    // if parent category exists
    if (typeof listParent !== 'undefined') {
        $scope.listParent = listParent; // selected category
    }

    // TODO: content add button links
    $scope.contentAddButtonLinks = [
        {
            text: 'ADD_CONTENT',
            href: 'content.add({ type: "content" })',
            icon: 'fa fa-file-text-o'

        },
        {
            text: 'ADD_CATEGORY',
            href: 'content.add({ type: "category" })',
            icon: 'fa fa-folder-o'
        }
    ];

    // TODO: content list actions
    $scope.contentListActions = [
        {
            text: 'VIEW',
            url: 'publicUrl', // this will be replaced with content public url
            icon: 'fa fa-search'
        },
        {
            text: 'EDIT',
            href: 'content.show({ contentId: record_id, langCode: lang_code })',
            icon: 'fa fa-pencil'
        },
        {
            text: 'MOVE_TO_TRASH',
            click: 'delete', // this will be replaced with delete action
            icon: 'fa fa-times'
        }
    ];

    // Bind hotkeys
    Utils.hotkeys.add({
        combo: 'ctrl+alt+n',
        description: Utils.$filter('translate')('ADD_CONTENT'),
        callback: function(){
            Utils.$state.go('content.add', {type: 'content'});
        }
    });

    Utils.hotkeys.add({
        combo: 'ctrl+alt+m',
        description: Utils.$filter('translate')('ADD_CATEGORY'),
        callback: function(){
            Utils.$state.go('content.add', {type: 'category'});
        }
    });

    //  ngTable configuration
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'translations.title': 'asc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            $scope.requestPending = true;
            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.transLang.code,
                type: 'content'
            };

            // params.count() - number of items per page declared in view
            if (typeof Utils.$stateParams.perPage !== 'undefined') {
                params.count(Utils.$stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof Utils.$stateParams.page !== 'undefined') {
                params.page(Utils.$stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // Utils.$stateParams - filters without contentId
            var filters = _.omit(Utils.$stateParams, 'contentId');
            queryOptions = _.merge(queryOptions, filters);
            $scope.activeFilter = filters;

            // list promise
            var promise = {};

            // if parent category is not selected
            if (typeof listParent === 'undefined') {
                // get uncategorized
                queryOptions.level = 0;
                promise = ContentRepository.list(queryOptions);
            } else {
                // get children's
                promise = ContentRepository.children(listParent.id, queryOptions);
            }

            // Promise is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                $scope.requestPending = false;
                params.total(response.meta.total);
                $defer.resolve(ContentRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}
ContentListCtrl.$inject = ['$scope', 'Utils', 'listParent', 'ContentRepository', 'ngTableParams'];
module.exports = ContentListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentListCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],24:[function(require,module,exports){
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

function ContentTrashcanCtrl($scope, ContentRepository, NgTableParams, Utils) {
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'id': 'desc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            $scope.requestPending = true;
            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.transLang.code
            };

            // params.count() - number of items per page declared in view
            if (typeof Utils.$stateParams.perPage !== 'undefined') {
                params.count(Utils.$stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof Utils.$stateParams.page !== 'undefined') {
                params.page(Utils.$stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // Utils.$stateParams filters
            queryOptions = _.merge(queryOptions, Utils.$stateParams);
            $scope.activeFilter = Utils.$stateParams;

            // get list by default
            var promise = ContentRepository.deleted(queryOptions);

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                $scope.requestPending = false;
                params.total(response.meta.total);
                $defer.resolve(ContentRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

ContentTrashcanCtrl.$inject = ['$scope', 'ContentRepository', 'ngTableParams', 'Utils'];
module.exports = ContentTrashcanCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentTrashcanCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":2}],25:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDeleteCtrl($scope, Utils, $modal, ContentRepository) { // jshint ignore:line
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
                templateUrl: viewPath + 'contentDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be removed, it is saved in the scope
         * @param contentType content type
         * @param forceDelete use forceDelete
         */
        showModal: function(contentId, contentType, forceDelete) {
            var self = this;
            vm.contentId = contentId;
            vm.contentType = contentType;
            vm.forceDelete = forceDelete;
            if (vm.forceDelete === true) {
                self.initModal('PLEASE_CONFIRM', 'DELETE_CONTENT_QUESTION');
            } else {
                self.initModal('PLEASE_CONFIRM', 'MOVE_CONTENT_TO_TRASH_QUESTION');
            }

            // Bind hotkeys
            Utils.hotkeys.add({
                combo: 'enter',
                description: Utils.$filter('translate')(
                    vm.forceDelete ? 'CONFIRM_DELETE' : 'CONFIRM_MOVE_TO_TRASH'
                ),
                callback: function(){
                    self.deleteContent();
                }
            });
        },
        /**
         * Function close the modal
         *
         */
        closeModal: function() {
            var self = this;
            Utils.hotkeys.del('enter');
            self.modal.hide();
        },
        /**
         * Function performs the RestAngular DELETE action for content id in scope
         *
         */
        deleteContent: function() {
            var self = this;
            ContentRepository.deleteContent(vm.contentId, vm.forceDelete).then(function() {
                self.closeModal();
                // refresh current state
                if (vm.contentType === 'category') {
                    // removed category
                    Utils.Storage.removeStorageItem('contentListParent');
                    Utils.$state.go('content.list', {contentId: null}, {reload: true, inherit: false});
                    Utils.Notifications.addSuccess('CATEGORY_HAS_BEEN_DELETED');
                } else {
                    // removed content
                    if (Utils.$state.$current.name === 'content.show.details') {
                        Utils.$state.go('content.trashcan', {contentId: null}, {reload: true, inherit: false});
                    } else {
                        Utils.$state.go(Utils.$state.current, {}, {reload: true});
                    }
                    Utils.Notifications.addSuccess(
                        vm.forceDelete ? 'CONTENT_HAS_BEEN_DELETED' : 'CONTENT_HAS_BEEN_MOVED_TO_TRASH'
                    );
                }
            });
        }
    };

}
ContentDeleteCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = ContentDeleteCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentDeleteCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],26:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ContentPublishedAtEditCtrl
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentPublishedAtEditCtrl($scope, Utils, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Route modal
    vm.editModal = {
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
                templateUrl: viewPath + 'contentEditPublishedAtModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be updated, it is saved in the scope
         * @param contentPublishedAt content published at date
         */
        showModal: function(contentId, contentPublishedAt) {
            var self = this;
            vm.contentId = contentId;
            vm.contentPublishedAt = contentPublishedAt;
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
         * Function performs the RestAngular customPUT function for content in scope
         *
         */
        saveContentPublishedAt: function() {
            var self = this;
            var dateTime = moment($scope.vm.contentPublishedAt).format('YYYY-MM-DD HH:mm:ss');
            var content = {
                publishedAt: dateTime
            };

            ContentRepository.updateContent(vm.contentId, content).then(function(response) {
                self.closeModal();
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
            });

        }
    };
}
ContentPublishedAtEditCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = ContentPublishedAtEditCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentPublishedAtEditCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],27:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentRestoreCtrl($scope, Utils, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Restore modal
    vm.restoreModal = {
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
                templateUrl: viewPath + 'contentRestoreModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be restored, it is saved in the scope
         */
        showModal: function(contentId) {
            var self = this;
            vm.contentId = contentId;
            self.initModal('PLEASE_CONFIRM', 'RESTORE_CONTENT_QUESTION');

            // Bind hotkeys
            Utils.hotkeys.add({
                combo: 'enter',
                description: Utils.$filter('translate')('CONFIRM_CONTENT_RESTORE'),
                callback: function() {
                    self.restoreContent();
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
            Utils.hotkeys.del('enter');
        },
        /**
         * Function restore softDeleted content
         * @param editAfterRestore if true redirect to edit state after restore
         */
        restoreContent: function(editAfterRestore) {
            var self = this;
            ContentRepository.restoreContent(vm.contentId).then(function(response) {
                self.closeModal();
                if (editAfterRestore) {
                    Utils.$state.go('content.edit.details', {contentId: vm.contentId, langCode: $scope.currentLang.code});
                } else {
                    Utils.$state.go(Utils.$state.current, {}, {reload: true});
                }
                Utils.Notifications.addSuccess('CONTENT_HAS_BEEN_RESTORED');
            });
        }
    };
}
ContentRestoreCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository', 'Notifications'];
module.exports = ContentRestoreCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentRestoreCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],28:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentRouteCtrl($scope, Utils, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Route modal
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
                templateUrl: viewPath + 'contentEditRouteModal.tpl.html',
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
            vm.oldRoute = vm.contentRoute;
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
            // only when route has been changed
            if (vm.contentRoute !== vm.oldRoute) {
                ContentRepository.newContentRoute(vm.contentId, newRoute).then(function(response) {
                    self.closeModal();
                    Utils.$state.go(Utils.$state.current, {}, {reload: true});
                });
            } else {
                self.closeModal();
            }
        }
    };
}
ContentRouteCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = ContentRouteCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentRouteCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],29:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentThemeEditCtrl($scope, Utils, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Theme modal
    vm.editModal = {
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
                templateUrl: viewPath + 'contentEditThemeModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be updated, it is saved in the scope
         * @param contentTheme content theme
         */
        showModal: function(contentId, contentTheme) {
            var self = this;
            vm.contentId = contentId;
            vm.contentTheme = contentTheme;
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
         * Function performs the RestAngular customPUT function for content in scope
         *
         */
        saveContentWeight: function() {
            var self = this;
            var content = {
                theme: $scope.vm.contentTheme
            };

            ContentRepository.updateContent(vm.contentId, content).then(function(response) {
                self.closeModal();
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
            });

        }
    };
}
ContentThemeEditCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = ContentThemeEditCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentThemeEditCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ContentTogglePropertyCtrl
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentTogglePropertyCtrl(Utils, ContentRepository) {
    var vm = this;

    vm.toggleProperty = {

        toggleProperty: function(contentId, propertyName, currentValue) {
            var newValue = !currentValue;
            var content = {};
            content[propertyName] = newValue;
            ContentRepository.updateContent(contentId, content).then(
                function() {
                    Utils.$state.reload();
                }
            );
        }

    };

}
ContentTogglePropertyCtrl.$inject = ['Utils', 'ContentRepository'];
module.exports = ContentTogglePropertyCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentTogglePropertyCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],31:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentWeightEditCtrl($scope, Utils, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Weight modal
    vm.editModal = {
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
                templateUrl: viewPath + 'contentEditWeightModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },
        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id to be updated, it is saved in the scope
         * @param contentWeight content weight
         */
        showModal: function(contentId, contentWeight) {
            var self = this;
            vm.contentId = contentId;
            vm.contentWeight = contentWeight;
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
         * Function performs the RestAngular customPUT function for content in scope
         *
         */
        saveContentWeight: function() {
            var self = this;
            var content = {
                weight: $scope.vm.contentWeight
            };

            ContentRepository.updateContent(vm.contentId, content).then(function(response) {
                self.closeModal();
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
            });

        }
    };
}
ContentWeightEditCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = ContentWeightEditCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentWeightEditCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],32:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class SetTranslationAsActive
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function SetTranslationAsActiveCtrl($scope, Utils, $modal, ContentRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/content/directives/';
    // Set as active modal
    vm.setAsActiveModal = {

        /**
         * Return translation with specified id property from translations array
         * and fetch lang property
         *
         * @param translations Translations array
         * @param id translation id
         * @returns Object
         */
        getTranslationById: function(translations, id) {
            var self = this;
            var translation = translations.shift();
            if (parseInt(translation.id) === parseInt(id)) {
                return translation;
            } else {
                return self.getTranslationById(translations, id);
            }
        },

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
                templateUrl: viewPath + 'setTranslationAsActiveModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param translationId id of selected translation
         * @param contentId current active content id
         */
        showModal: function(translationId, contentId) {
            var self = this;
            vm.contentId = contentId;
            vm.translations = $scope.tableParams.data.slice(0);
            vm.translationId = translationId;
            vm.selectedTranslation = self.getTranslationById(vm.translations, vm.translationId);
            self.initModal('PLEASE_CONFIRM', 'SET_TRANSLATION_AS_ACTIVE_QUESTION');
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
         * Function performs the RestAngular action and set selected translation
         * as a new active translation
         */
        setAsActive: function() {
            var self = this;
            ContentRepository.newContentTranslation(vm.contentId, vm.selectedTranslation).then(function() {
                Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
                Utils.$state.reload();
                self.closeModal();
            });
        }
    };
}
SetTranslationAsActiveCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = SetTranslationAsActiveCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/SetTranslationAsActiveCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],33:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class DeleteTranslationCtrl
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function DeleteTranslationCtrl($scope, Utils, $modal, ContentRepository) {
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
                templateUrl: viewPath + 'translationDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param contentId content id
         * @param translationId translation id
         */
        showModal: function(contentId, translationId) {
            var self = this;
            vm.contentId = contentId;
            vm.translationId = translationId;
            self.initModal('PLEASE_CONFIRM', 'DELETE_TRANSLATION_QUESTION');
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
         * Function performs the RestAngular DELETE action for translation id in scope
         *
         */
        deleteContent: function() {
            var self = this;
            self.closeModal();
            ContentRepository.deleteTranslation(vm.contentId, vm.translationId).then(function() {
                Utils.Notifications.addSuccess('TRANSLATION_HAS_BEEN_DELETED');
                Utils.$state.reload();
            });
        }
    };
}
DeleteTranslationCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = DeleteTranslationCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/TranslationDeleteCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":2}],34:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function CharactersCounter() {
	return {
		templateUrl: 'gzero/admin/views/content/directives/charactersCounter.tpl.html',
		restrict: 'A',
		scope: {
			'characters': '@count'
		}
	};
}

CharactersCounter.$inject = [];
module.exports = CharactersCounter;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/CharactersCounter.js","/src/content/directives")

},{"_process":5,"buffer":2}],35:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentActionsDropdown($dropdown) {
    return {
        scope: {contentActionsDropdown: '=', record: '=', lang: '='},
        controller: 'ContentDeleteCtrl',
        controllerAs: 'vm',
        restrict: 'A',
        link: function(scope, element, attrs, ContentDeleteCtrl) {
            var dropdown = $dropdown(element, {
                templateUrl: 'gzero/admin/views/content/directives/contentActionsDropdown.tpl.html',
                animation: 'am-flip-x',
                placement: 'bottom-right'
            });

            element.on('click', function() {
                // TODO better params replacement and functions handling
                _.mapValues(scope.contentActionsDropdown, function(n) {
                    if (typeof n.href !== 'undefined') {
                        // Record id
                        if (n.href.indexOf('record_id') !== -1) {
                            n.href = n.href.replace('record_id', scope.record.id);
                        }
                        // Lang code
                        if (n.href.indexOf('lang_code') !== -1) {
                            n.href = n.href.replace('lang_code', '"' + scope.lang.code + '"');
                        }
                    }
                    return n;
                });

                dropdown.$scope.content = scope.contentActionsDropdown;
                dropdown.$scope.record = scope.record; // Pass record to the view
                dropdown.$scope.lang = scope.lang; // Pass lang to the view
                dropdown.$scope.deleteModal = ContentDeleteCtrl.deleteModal; // Pass delete action to the view
            });
        }
    };
}

ContentActionsDropdown.$inject = [];
module.exports = ContentActionsDropdown;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentActionsDropdown.js","/src/content/directives")

},{"_process":5,"buffer":2}],36:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDeleteButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, ContentDeleteCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                ContentDeleteCtrl.deleteModal.showModal(attrs.id, attrs.type, attrs.force === 'true');
            });
        }
    };
}

ContentDeleteButton.$inject = [];
module.exports = ContentDeleteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentDeleteButton.js","/src/content/directives")

},{"_process":5,"buffer":2}],37:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentEditRouteButton() {
    return {
        scope: true,
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

},{"_process":5,"buffer":2}],38:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ContentPublishedAtEditButton
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentPublishedAtEditButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentPublishedAtEditCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, ContentPublishedAtEditCtrl) {
            element.on('click', function() {
                ContentPublishedAtEditCtrl.editModal.showModal(
                    attrs.contentId,
                    attrs.contentPublishedAt
                );
            });
        }
    };
}

ContentPublishedAtEditButton.$inject = [];
module.exports = ContentPublishedAtEditButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentPublishedAtEditButton.js","/src/content/directives")

},{"_process":5,"buffer":2}],39:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentRestoreButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentRestoreCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, ContentRestoreCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                ContentRestoreCtrl.restoreModal.showModal(attrs.id);
            });
        }
    };
}

ContentRestoreButton.$inject = [];
module.exports = ContentRestoreButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentRestoreButton.js","/src/content/directives")

},{"_process":5,"buffer":2}],40:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentThemeEditButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentThemeEditCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, ContentThemeEditCtrl) {
            element.on('click', function() {
                ContentThemeEditCtrl.editModal.showModal(
                    attrs.contentId,
                    attrs.contentTheme
                );
            });
        }
    };
}

ContentThemeEditButton.$inject = [];
module.exports = ContentThemeEditButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentThemeEditButton.js","/src/content/directives")

},{"_process":5,"buffer":2}],41:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ContentTogglePropertyButton
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentTogglePropertyButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentTogglePropertyCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, ContentTogglePropertyCtrl) {
            element.on('click', function() {
                ContentTogglePropertyCtrl.toggleProperty.toggleProperty(
                    attrs.contentId,
                    attrs.propertyName,
                    String(attrs.value) !== 'false'
                );
            });
        }
    };
}

ContentTogglePropertyButton.$inject = [];
module.exports = ContentTogglePropertyButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentTogglePropertyButton.js","/src/content/directives")

},{"_process":5,"buffer":2}],42:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ContentWeightEditButton
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function ContentWeightEditButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'ContentWeightEditCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, ContentWeightEditCtrl) {
            element.on('click', function() {
                ContentWeightEditCtrl.editModal.showModal(
                    attrs.contentId,
                    parseInt(attrs.contentWeight)
                );
            });
        }
    };
}

ContentWeightEditButton.$inject = [];
module.exports = ContentWeightEditButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/ContentWeightEditButton.js","/src/content/directives")

},{"_process":5,"buffer":2}],43:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function SetTranslationAsActiveButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'SetTranslationAsActiveCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, SetTranslationAsActiveCtrl) {
            element.on('click', function() {
                SetTranslationAsActiveCtrl.setAsActiveModal.showModal(attrs.id, attrs.content);
            });
        }
    };
}

SetTranslationAsActiveButton.$inject = [];
module.exports = SetTranslationAsActiveButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/SetTranslationAsActiveButton.js","/src/content/directives")

},{"_process":5,"buffer":2}],44:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function TranslationDeleteButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'TranslationDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, TranslationDeleteCtrl) {
            element.on('click', function() {
                TranslationDeleteCtrl.deleteModal.showModal(attrs.content, attrs.translationId);
            });
        }
    };
}

TranslationDeleteButton.$inject = [];
module.exports = TranslationDeleteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/directives/TranslationDeleteButton.js","/src/content/directives")

},{"_process":5,"buffer":2}],45:[function(require,module,exports){
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
                // CONTENT LIST
                .state('content.list', {
                    url: '/list/{contentId}?isActive&page&perPage',
                    resolve: {
                        listParent: [
                            '$stateParams', 'Utils', 'ContentRepository', function($stateParams, Utils, ContentRepository) {
                                // if state param has category id
                                if ($stateParams.contentId) {
                                    Utils.Storage.setStorageItem({contentListParent: $stateParams.contentId});
                                    return ContentRepository.one($stateParams.contentId);
                                } else {
                                    // if storage has category id
                                    if (Utils.Storage.getStorageItem('contentListParent')) {
                                        $stateParams.contentId = Utils.Storage.getStorageItem('contentListParent');
                                        return ContentRepository.one(Utils.Storage.getStorageItem('contentListParent'));
                                    }
                                }
                            }
                        ],
                        openCategories: [
                            // get open categories from Storage
                            'Utils', function(Utils) {
                                return Utils.Storage.getStorageItem('openCategories');
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
                // CONTENT SHOW
                .state('content.show', {
                    url: '/{contentId}/show/{langCode}',
                    abstract: [
                        // redirect to active tab on language change
                        '$state', function($state) {
                            return _.startsWith($state.current.name, 'content.show') ? $state.current.name : '.details';
                        }
                    ],
                    resolve: {
                        langCode: [
                            '$state', '$stateParams', function($state, $stateParams) {
                                return $stateParams.langCode;
                            }
                        ],
                        content: [
                            '$stateParams', 'ContentRepository', function($stateParams, ContentRepository) {
                                return ContentRepository.one($stateParams.contentId);
                            }
                        ]
                    },
                    views: {
                        'content': {
                            templateUrl: viewPath + 'show.html',
                            controller: 'ContentDetailsCtrl'
                        },
                        'langSwitcher@content.show': {
                            templateUrl: viewPath + 'details/langSwitcher.html'

                        },
                        'contentSettings@content.show': {
                            templateUrl: viewPath + 'details/settings.html'

                        }
                    }
                })
                .state('content.show.details', {
                    url: '/details',
                    deepStateRedirect: true,
                    sticky: true,
                    views: {
                        'contentTab': {
                            templateUrl: viewPath + 'details/tabs/details.html'
                        }
                    }
                })
                .state('content.show.history', {
                    url: '/history?isActive&type&page&perPage',
                    deepStateRedirect: true,
                    sticky: true,
                    views: {
                        'contentTab': {
                            templateUrl: viewPath + 'details/tabs/history.html',
                            controller: 'ContentHistoryCtrl'
                        }
                    }
                })
                .state('content.show.blocks', {
                    url: '/blocks',
                    deepStateRedirect: true,
                    sticky: true,
                    resolve: {
                        blocks: [
                            '$stateParams', 'BlocksRepository', function($stateParams, BlocksRepository) {
                                return BlocksRepository.listForContent($stateParams.contentId);
                            }
                        ]
                    },
                    views: {
                        'contentTab': {
                            templateUrl: viewPath + 'details/tabs/blocks.html',
                            controller: 'ContentBlocksCtrl'
                        }
                    }
                })
                // CONTENT EDIT
                .state('content.edit', {
                    url: '/{contentId}/edit/{langCode}',
                    abstract: '.index',
                    resolve: {
                        langCode: [
                            '$state', '$stateParams', function($state, $stateParams) {
                                return $stateParams.langCode;
                            }
                        ],
                        content: [
                            '$stateParams', 'ContentRepository', function($stateParams, ContentRepository) {
                                return ContentRepository.one($stateParams.contentId);
                            }
                        ]
                    },
                    data: {
                        showMask: true // enter edit mode
                    },
                    views: {
                        'content': {
                            templateUrl: viewPath + 'show.html',
                            controller: 'ContentDetailsCtrl'
                        },
                        'langSwitcher@content.edit': {
                            templateUrl: viewPath + 'details/langSwitcher.html'

                        },
                        'contentSettings@content.edit': {
                            templateUrl: viewPath + 'details/settings.html'

                        }
                    }
                })
                .state('content.edit.index', {
                    url: '',
                    views: {
                        'contentTab': {
                            templateUrl: viewPath + 'details/tabs/details.html'
                        }
                    }
                })
                .state('content.edit.details', {
                    url: '/details',
                    views: {
                        'contentTab': {
                            controller: 'ContentDetailsEditCtrl',
                            templateUrl: viewPath + 'details/tabs/detailsEdit.html'
                        }
                    }
                })
                // CONTENT TRASHCAN
                .state('content.trashcan', {
                    url: '/trashcan?isActive&type&page&perPage',
                    resolve: {
                        listParent: [
                            function() {
                                return undefined;
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
                            templateUrl: viewPath + 'trashcan.html',
                            controller: 'ContentTrashcanCtrl'
                        },
                        'quickSidebarLeft': {
                            templateUrl: viewPath + 'categories.html',
                            controller: 'ContentCategoryTreeCtrl'
                        }
                    }
                })
                // CONTENT ADD
                .state('content.add', {
                    url: '/add/{type}',
                    resolve: {
                        listParent: [
                            'Utils', 'ContentRepository', function(Utils, ContentRepository) {
                                // if storage has category id
                                if (Utils.Storage.getStorageItem('contentListParent')) {
                                    return ContentRepository.one(Utils.Storage.getStorageItem('contentListParent'));
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
                // CONTENT ADD TRANSLATION
                .state('content.addTranslation', {
                    url: '/{contentId}/add-translation/{langCode}',
                    resolve: {
                        content: [
                            '$stateParams', 'ContentRepository', function($stateParams, ContentRepository) {
                                return ContentRepository.one($stateParams.contentId);
                            }
                        ]
                    },
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
    .controller('ContentDeleteCtrl', require('./controllers/directives/ContentDeleteCtrl'))
    .controller('ContentRestoreCtrl', require('./controllers/directives/ContentRestoreCtrl'))
    .controller('ContentCategoryTreeCtrl', require('./controllers/ContentCategoryTreeCtrl'))
    .controller('ContentDashboardCtrl', require('./controllers/ContentDashboardCtrl'))
    .controller('ContentDetailsCtrl', require('./controllers/ContentDetailsCtrl'))
    .controller('ContentDetailsEditCtrl', require('./controllers/ContentDetailsEditCtrl'))
    .controller('ContentHistoryCtrl', require('./controllers/ContentHistoryCtrl'))
    .controller('ContentBlocksCtrl', require('./controllers/ContentBlocksCtrl'))
    .controller('ContentListCtrl', require('./controllers/ContentListCtrl'))
    .controller('ContentTrashcanCtrl', require('./controllers/ContentTrashcanCtrl'))
    .controller('ContentAddTranslationCtrl', require('./controllers/ContentAddTranslationCtrl'))
    .controller('ContentRouteCtrl', require('./controllers/directives/ContentRouteCtrl'))
    .controller('SetTranslationAsActiveCtrl', require('./controllers/directives/SetTranslationAsActiveCtrl'))
    .controller('TranslationDeleteCtrl', require('./controllers/directives/TranslationDeleteCtrl'))
    .controller('ContentTogglePropertyCtrl', require('./controllers/directives/ContentTogglePropertyCtrl'))
    .controller('ContentWeightEditCtrl', require('./controllers/directives/ContentWeightEditCtrl'))
    .controller('ContentThemeEditCtrl', require('./controllers/directives/ContentThemeEditCtrl'))
    .controller('ContentPublishedAtEditCtrl', require('./controllers/directives/ContentPublishedAtEditCtrl'))
    .factory('ContentRepository', require('./services/ContentRepository.js'))
    .directive('contentDeleteButton', require('./directives/ContentDeleteButton.js'))
    .directive('contentRestoreButton', require('./directives/ContentRestoreButton.js'))
    .directive('contentEditRouteButton', require('./directives/ContentEditRouteButton.js'))
    .directive('setTranslationAsActiveButton', require('./directives/SetTranslationAsActiveButton.js'))
    .directive('translationDeleteButton', require('./directives/TranslationDeleteButton.js'))
    .directive('contentTogglePropertyButton', require('./directives/ContentTogglePropertyButton.js'))
    .directive('contentPublishedAtEditButton', require('./directives/ContentPublishedAtEditButton.js'))
    .directive('contentActionsDropdown', ['$dropdown', require('./directives/ContentActionsDropdown.js')])
    .directive('contentWeightEditButton', ['$dropdown', require('./directives/ContentWeightEditButton.js')])
    .directive('contentThemeEditButton', ['$dropdown', require('./directives/ContentThemeEditButton.js')])
    .directive('charactersCounter', require('./directives/CharactersCounter.js'))
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

},{"./controllers/ContentAddCtrl":15,"./controllers/ContentAddTranslationCtrl":16,"./controllers/ContentBlocksCtrl":17,"./controllers/ContentCategoryTreeCtrl":18,"./controllers/ContentDashboardCtrl":19,"./controllers/ContentDetailsCtrl":20,"./controllers/ContentDetailsEditCtrl":21,"./controllers/ContentHistoryCtrl":22,"./controllers/ContentListCtrl":23,"./controllers/ContentTrashcanCtrl":24,"./controllers/directives/ContentDeleteCtrl":25,"./controllers/directives/ContentPublishedAtEditCtrl":26,"./controllers/directives/ContentRestoreCtrl":27,"./controllers/directives/ContentRouteCtrl":28,"./controllers/directives/ContentThemeEditCtrl":29,"./controllers/directives/ContentTogglePropertyCtrl":30,"./controllers/directives/ContentWeightEditCtrl":31,"./controllers/directives/SetTranslationAsActiveCtrl":32,"./controllers/directives/TranslationDeleteCtrl":33,"./directives/CharactersCounter.js":34,"./directives/ContentActionsDropdown.js":35,"./directives/ContentDeleteButton.js":36,"./directives/ContentEditRouteButton.js":37,"./directives/ContentPublishedAtEditButton.js":38,"./directives/ContentRestoreButton.js":39,"./directives/ContentThemeEditButton.js":40,"./directives/ContentTogglePropertyButton.js":41,"./directives/ContentWeightEditButton.js":42,"./directives/SetTranslationAsActiveButton.js":43,"./directives/TranslationDeleteButton.js":44,"./services/ContentRepository.js":46,"_process":5,"buffer":2}],46:[function(require,module,exports){
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
        translations: function(id, params) {
            return Restangular.one(api, id).all('translations').getList(params);
        },
        deleteTranslation: function(contentId, translationId) {
            return Restangular.one(api, contentId).one('translations', translationId).remove();
        },
        deleteContent: function(id, forceDelete) {
            return Restangular.one(api, id).one(forceDelete).remove();
        },
        restoreContent: function(id) {
            return Restangular.one(api + '/restore', id).put();
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        }
    };
}

ContentRepository.$inject = ['Restangular'];
module.exports = ContentRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/services/ContentRepository.js","/src/content/services")

},{"_process":5,"buffer":2}],47:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function CoreCtrl($scope, Utils, Translations, NavBar, TopNavBar) {
    // get translations languages
    Translations.getTranslations().then(function(response) {
        $scope.langs = response.langs;
        $scope.currentLang = $scope.transLang = response.currentLang;
        Translations.selectAdminLang($scope.currentLang);
        // set CKEditor language
        Utils.ckOptions.setEditorOption({language: $scope.currentLang.code});
    });

    // admin panel language
    $scope.selectAdminLang = function() {
        Translations.selectAdminLang($scope.currentLang);
        // set CKEditor language
        Utils.ckOptions.setEditorOption({language: $scope.currentLang.code});
    };

    // translations language
    $scope.selectLanguage = function(lang) {
        $scope.transLang = lang;
    };

    // refresh current state
    $scope.refreshCurrentState = function() {
        Utils.$state.go(Utils.$state.current, {}, {reload: true});
    };

    // redirect user to previous state
    $scope.redirectBack = function(defaultStateName) {
        Utils.redirectBack(defaultStateName);
    };

    $scope.navBar = NavBar.getItems();
    $scope.topNavBar = TopNavBar.getItems();
    // if multi lang is set
    if (typeof Utils.Config.multilang !== 'undefined') {
        $scope.isMultiLangEnabled = (Utils.Config.multilang === 'true');
    }

    // set available entities types
    _.forEach(Utils.getEntitiesTypes(), function(value, key) {
        $scope[key] = value;
    });

    // if block regions are set
    if (typeof Utils.Config.blockRegions !== 'undefined') {
        // add disabled region and pass to view
        $scope.blockRegions = _.union([null], Utils.Config.blockRegions);
    }
    // if current user id is set
    if (typeof Utils.Config.currentUserId !== 'undefined') {
        $scope.currentUserId = Utils.Config.currentUserId;
    }
    // Off canvas sidebar
    $scope.showSidebar = false;
    // content translations language switcher
    $scope.showTransLangSwitcher = false;
    // admin language switcher
    $scope.showAdminLangSwitcher = true;
    // pass state to view
    $scope.$state = Utils.$state;

    // check for edit state
    $scope.$on('$stateChangeStart', function(event, toState) {
        if (typeof toState.data !== 'undefined') {
            if (toState.name !== 'content.edit.index') {
                $scope.editStateName = toState.name;
            }
            $scope.showMask = toState.data.showMask;
        } else {
            $scope.editStateName = null;
            $scope.showMask = false;
        }
    });

    // if there is langCode param validate it
    $scope.$on('$stateChangeSuccess', function() {
        // set content translations language switcher
        $scope.showTransLangSwitcher = Utils.stateIncludes(['content.list', 'content.trashcan', 'blocks.list', 'files.list']);
        // disable admin language switcher
        $scope.showAdminLangSwitcher = Utils.stateIncludes(['content.add', 'content.edit', 'content.addTranslation']);
        if (Utils.$stateParams.hasOwnProperty('langCode')) {
            Translations.checkIfLanguageIsAvailable(Utils.$stateParams.langCode);
        }
    });
}

CoreCtrl.$inject = ['$scope', 'Utils', 'Translations', 'NavBar', 'TopNavBar'];
module.exports = CoreCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/controllers/CoreCtrl.js","/src/core/controllers")

},{"_process":5,"buffer":2}],48:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function StatesDropdown($dropdown) {
    return {
        scope: {statesDropdown: '='},
        restrict: 'A',
        link: function(scope, element, attrs) {
            var dropdown = $dropdown(element, {
                templateUrl: 'gzero/admin/views/core/directives/statesDropdown.tpl.html',
                animation: 'am-flip-x',
                placement: 'bottom-right'
            });

            element.on('click', function() {
                dropdown.$scope.content = scope.statesDropdown;
            });
        }
    };
}

StatesDropdown.$inject = [];
module.exports = StatesDropdown;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/directives/StatesDropdown.js","/src/core/directives")

},{"_process":5,"buffer":2}],49:[function(require,module,exports){
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
                return translation.langCode === langCode;
            }).shift();
            if (_.has(currentTranslation, field)) {
                return currentTranslation[field];
            } else {
                return null;
            }
        };
    })
    /**
     * Filter returns the option value in provided language
     *
     * @param values the collection to iterate over
     * @param langCode  language code
     *
     * @returns {object} value field
     */
    .filter('getOptionValue', function() {
        'use strict';
        return function(values, langCode) {
            return _.filter(values, function(value, code) {
                return code === langCode;
            }).shift();
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

    /**
     * This filter lets you mark HTML as “safe” for angular to use and show on a page.
     * Otherwise, angular would just show the HTML as plain text.
     */
    .filter('trustAsHtml', function($sce) {
        'use strict';
        return $sce.trustAsHtml;
    })

    /**
     * Parse ISO 8601 date to specified format
     * @param format string expected date format
     */
    .filter('formatDate', function($filter) {
        'use strict';
        return function(dateSTR, format) {
            var d = Date.parse(dateSTR);
            if (!format) {
                format = 'yyyy-MM-dd hh:mm:ss';
            }
            return $filter('date')(d, format);
        };
    })

    /**
     * Remove html tags, and trim string to given length without breaking words
     * @param len expected length
     */
    .filter('stripTagsAndTrim', function() {
        'use strict';
        return function(str, len) {
            try {
                str = str.replace(/<\/?[^>]+(>|$)/g, '').substr(0, len);
                str = str.substr(0, Math.min(str.length, str.lastIndexOf(' ')));
                return str;
            } catch (e) {
                return '';
            }
        };
    });

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/filters/CoreFilters.js","/src/core/filters")

},{"_process":5,"buffer":2}],50:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

require('./filters/CoreFilters.js');

angular.module('admin.core', ['CoreFilters'])
  .config([
    '$stateProvider',
    function($stateProvider) {

      // Now set up the states
      $stateProvider
        .state('logout', {
          url: '/logout',
          controller: [
            'ApiRepository', function(ApiRepository) {
              ApiRepository.logout().then(function(response) {
                localStorage.removeItem('gzero_api_token');
                window.location.reload();
              });
            }
          ]
        });
    }
  ])
  .controller('CoreCtrl', require('./controllers/CoreCtrl.js'))
  .factory('LangRepository', require('./services/LangRepository.js'))
  .factory('ApiRepository', require('./services/ApiRepository.js'))
  .factory('NavBar', require('./services/NavBar.js'))
  .factory('TopNavBar', require('./services/TopNavBar.js'))
  .factory('Notifications', require('../lib/Notifications.js'))
  .factory('ckOptions', require('../lib/ckOptions.js'))
  .factory('Translations', require('./services/Translations.js'))
  .factory('Storage', require('../lib/Storage.js'))
  .factory('Utils', require('./services/Utils.js'))
  .directive('statesDropdown', ['$dropdown', require('./directives/StatesDropdown.js')])
  .run([
    'TopNavBar',
    'UserRepository',
    'Utils',
    function(TopNavBar, UserRepository, Utils) {

      UserRepository.one(Utils.Config.currentUserId).then(function(response) {
        var user = response;
        user.fullName = user.firstName + ' ' + user.lastName;

        TopNavBar.add(
          {
            title: 'PAGE_PREVIEW',
            action: false,
            url: '/'
          }
        );
        TopNavBar.add(
          {
            title: user.fullName,
            action: 'content.list'
          }
        );
        TopNavBar.addLastChild(
          user.fullName,
          {
            title: 'PROFILE',
            action: 'user.edit({userId: ' + user.id + '})'
          }
        );
        TopNavBar.addLastChild(
          user.fullName,
          {
            title: 'LOG_OUT',
            action: 'logout'
          }
        );
      });

    }
  ]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/module.js","/src/core")

},{"../lib/Notifications.js":71,"../lib/Storage.js":72,"../lib/ckOptions.js":73,"./controllers/CoreCtrl.js":47,"./directives/StatesDropdown.js":48,"./filters/CoreFilters.js":49,"./services/ApiRepository.js":51,"./services/LangRepository.js":52,"./services/NavBar.js":53,"./services/TopNavBar.js":54,"./services/Translations.js":55,"./services/Utils.js":56,"_process":5,"buffer":2}],51:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ApiRepository(Restangular) {
    return {
        login: function() {
            return Restangular.one('/login').post();
        },
        logout: function() {
            return Restangular.one('/logout').post();
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        }
    };
}

ApiRepository.$inject = ['Restangular'];
module.exports = ApiRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/ApiRepository.js","/src/core/services")

},{"_process":5,"buffer":2}],52:[function(require,module,exports){
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
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        }
    };
}

LangRepository.$inject = ['Restangular'];
module.exports = LangRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/LangRepository.js","/src/core/services")

},{"_process":5,"buffer":2}],53:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function NavBar() {
    /** @var Navigation */
    return require('../../lib/navigation.js')();
}

module.$inject = [];
module.exports = NavBar;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/NavBar.js","/src/core/services")

},{"../../lib/navigation.js":74,"_process":5,"buffer":2}],54:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function TopNavBar() {
    /** @var Navigation */
    return require('../../lib/navigation.js')();
}

module.$inject = [];
module.exports = TopNavBar;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/TopNavBar.js","/src/core/services")

},{"../../lib/navigation.js":74,"_process":5,"buffer":2}],55:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function Translations($q, $translate, LangRepository, Utils) {
    //create deferred promise
    var deferred = $q.defer();
    var languages = {};

    //get languages
    LangRepository.list().then(function(response) {
        languages.langs = response;
        languages.currentLang = languages.transLang = response[0];
        // resolve the promise
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
        },
        /**
         * Redirect if user try to access non existing language
         * @param langCode
         */
        checkIfLanguageIsAvailable: function(langCode) {
            var available = [];
            if (languages === {}) {
                angular.forEach(languages, function(v, k) {
                    available.push(v.code);
                });
                if (available.indexOf(langCode) === -1) {
                    Utils.Notifications.addError('LANGUAGE_NOT_FOUND');
                    Utils.$state.go('home');
                }
            } else {
                LangRepository.list().then(function(response) {
                    angular.forEach(LangRepository.clean(response), function(v, k) {
                        available.push(v.code);
                    });
                    if (available.indexOf(langCode) === -1) {
                        Utils.Notifications.addError('LANGUAGE_NOT_FOUND');
                        Utils.$state.go('home');
                    }
                });
            }
        }
    };
}
Translations.$inject = ['$q', '$translate', 'LangRepository', 'Utils'];
module.exports = Translations;


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/Translations.js","/src/core/services")

},{"_process":5,"buffer":2}],56:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function Utils(Notifications, Storage, $state, $previousState, $stateParams, ckOptions, hotkeys, $filter) { // jshint ignore:line

    return {
        Notifications: Notifications,
        Storage: Storage,
        $state: $state,
        $stateParams: $stateParams,
        $previousState: $previousState,
        Config: Config,
        ckOptions: ckOptions,
        hotkeys: hotkeys,
        $filter: $filter,
        /**
         * Redirect user to previous state
         * @param {string} defaultStateName default state name
         */
        redirectBack: function(defaultStateName) {
            // gets a reference to the previous state.
            var previousState = $previousState.get();
            // set default name for the redirect if it is is not specified
            if (typeof defaultStateName === 'undefined') {
                defaultStateName = 'home'; // Redirect to home
            }

            // if there is a previousState
            if (previousState !== null) {
                // redirected back to the state we came from
                $state.go(previousState.state.name, previousState.params, {reload: true});
            } else {
                // otherwise go to default state
                $state.go(defaultStateName, {}, {reload: true});
            }
        },
        /**
         * function checks if one of provided state names is included in current state
         *
         * @param {array} stateNames the collection to iterate over
         *
         * @returns {bool} whether any of state exists
         */
        stateIncludes: function(stateNames) {
            var includes = false;
            if (typeof stateNames !== 'undefined') {
                _.forEach(stateNames, function(stateName) {
                    if ($state.includes(stateName)) {
                        includes = true;
                    }
                });
            }

            return includes;
        },
        /**
         * Return translation with specified lang property from translations array
         * and fetch lang property
         *
         * @param translations Translations array
         * @param langCode language code
         * @returns Object | false
         */
        getTranslationByLang: function(translations, langCode) {
            var translation = translations.shift();

            if (!translation) {
                return false;
            }

            if (translation.langCode === langCode) {
                return translation;
            } else {
                return this.getTranslationByLang(translations, langCode);
            }
        },
        /**
         * Return all available entities types object from config
         *
         * @returns Object available entities types
         */
        getEntitiesTypes: function() {
            return {
                contentTypes: this.Config.contentTypes,
                blockTypes: this.Config.blockTypes,
                fileTypes: this.Config.fileTypes
            };
        }
    };

}

module.$inject = [
    'Notifications',
    'Storage',
    '$state',
    '$previousState',
    '$stateParams',
    'ckOptions',
    'hotkeys',
    '$filter'
];

module.exports = Utils;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/Utils.js","/src/core/services")

},{"_process":5,"buffer":2}],57:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function FilesAddCtrl($q, $scope, Utils, type, Upload, FilesRepository, FileService) { //jshint ignore:line
    $scope.files = [];
    $scope.progress = [];
    $scope.isBusy = false;
    // default file record values
    $scope.newFileDefaults = {
        isActive: 1,
        type: type,
        translations: {
            langCode: Utils.Config.defaultLangCode
        }
    };

    // set translations lang code
    if (typeof $scope.transLang !== 'undefined') {
        $scope.newFileDefaults.translations.langCode = $scope.transLang.code;
    }

    // remove file from files queue
    $scope.removeFile = function(index) {
        $scope.files.splice(index, 1);
        $scope.progress.splice(index, 1);
    };

    /* Set the default values for ngf-select and ngf-drop directives*/
    $scope.invalidFiles = [];
    Upload.setDefaults({
        ngfMaxTotalSize: '5MB', //@TODO allowed total files size
        ngfKeep: '"distinct"',
        ngfMaxFiles: 10, //@TODO allowed max files number
        ngfValidate: {pattern: FileService.getTypeExtensionsPattern(type)}, //allowed type files extensions
        ngfModelInvalid: 'invalidFiles'
    });

    // file POST action
    $scope.save = function() {
        $scope.isBusy = true;
        var promises = [];
        _.each($scope.files, function(file, index) {
            var defaults = _.cloneDeep($scope.newFileDefaults);
            var data = FileService.prepareRequestData(file, defaults);
            promises.push(FilesRepository.create(data).then(function(response) {
                $scope.removeFile(index);
                Utils.Notifications.addSuccess('FILE_CREATED', {fileName: file.name});
            }, function(response) {
                $scope.progress[index] = 0;
                throw new Error({fileName: file.name});
            }, function(evt) {
                // progress notify
                $scope.progress[index] = parseInt(100.0 * evt.loaded / evt.total);
            }));
        });

        $q.all(promises)
            .then(function() {
                $scope.isBusy = false;
                // if any of the file processing produced an error
                Utils.$state.go('files.list', {}, {reload: true});
            })
            .catch(function(error) {
                $scope.isBusy = false;
                Utils.Notifications.addError('FILE_CREATE_ERROR', error);
            });
    };
}

FilesAddCtrl.$inject = ['$q', '$scope', 'Utils', 'type', 'Upload', 'FilesRepository', 'FileService'];

module.exports = FilesAddCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/controllers/FilesAddCtrl.js","/src/files/controllers")

},{"_process":5,"buffer":2}],58:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function FilesAddTranslationCtrl($scope, Utils, FilesRepository) {
    // default translations lang code
    $scope.newFileTranslation = {
        langCode: Utils.$stateParams.langCode
    };

    // contents POST action
    $scope.addFileTranslation = function() {
        FilesRepository.newTranslation(Utils.$stateParams.fileId, $scope.newFileTranslation).then(function(response) {
            // Redirect user to previous state or files list
            Utils.redirectBack('files.list');
        });
    };
}
FilesAddTranslationCtrl.$inject = ['$scope', 'Utils', 'FilesRepository'];
module.exports = FilesAddTranslationCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/controllers/FilesAddTranslationCtrl.js","/src/files/controllers")

},{"_process":5,"buffer":2}],59:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function FilesDetailsCtrl($scope, file, langCode, FilesRepository, Utils) {

    // TODO: get registered tabs
    $scope.tabs = [
        {
            title: 'PREVIEW',
            action: 'details',
            default: true // default active tab in settings edit mode
        }
        // {
        //     title: 'BLOCKS',
        //     action: 'blocks'
        // }
    ];

    // if lang code exists
    if (typeof langCode !== 'undefined') {
        $scope.langCode = langCode;
    }

    // if file exists
    if (typeof file !== 'undefined') {
        $scope.file = FilesRepository.clean(file);
        $scope.activeTranslation = Utils.getTranslationByLang((file.translations.slice(0)), langCode);
    }
}
FilesDetailsCtrl.$inject = ['$scope', 'file', 'langCode', 'FilesRepository', 'Utils'];
module.exports = FilesDetailsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/controllers/FilesDetailsCtrl.js","/src/files/controllers")

},{"_process":5,"buffer":2}],60:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function FilesDetailsEditCtrl($scope, file, langCode, FilesRepository, Utils) {

    // if file translation is not set
    if (typeof $scope.activeTranslation === 'undefined') {
        $scope.activeTranslation = Utils.getTranslationByLang((file.translations.slice(0)), langCode);
    }

    $scope.saveFile = function() {
        FilesRepository.newTranslation($scope.file.id, $scope.activeTranslation).then(function() {
            Utils.$state.go('files.show.details', {
                fileId: file.id,
                langCode: langCode
            });
            Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
        });
    };

}
FilesDetailsEditCtrl.$inject = ['$scope', 'file', 'langCode', 'FilesRepository', 'Utils'];
module.exports = FilesDetailsEditCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/controllers/FilesDetailsEditCtrl.js","/src/files/controllers")

},{"_process":5,"buffer":2}],61:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class FileController
 *
 * @package    Admin
 */

'use strict';

function FilesListCtrl($scope, Utils, FilesRepository, NgTableParams) {
    // TODO: file add button links for other types
    $scope.fileAddButtonLinks = [
        {
            text: 'ADD_IMAGES',
            href: 'files.add({ type: "image" })',
            icon: 'fa fa-file-image-o'

        },
        {
            text: 'ADD_DOCUMENTS',
            href: 'files.add({ type: "document" })',
            icon: 'fa fa-file-pdf-o'
        }
    ];

    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'translations.title': 'asc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            $scope.requestPending = true;
            // prepare options to be sent to api
            var queryOptions = {
                lang: Utils.Config.defaultLangCode
            };

            // lang sort options
            if (typeof $scope.transLang !== 'undefined') {
                queryOptions.lang = $scope.transLang.code;
            }

            // params.count() - number of items per page declared in view
            if (typeof Utils.$stateParams.perPage !== 'undefined') {
                params.count(Utils.$stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof Utils.$stateParams.page !== 'undefined') {
                params.page(Utils.$stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // Utils.$stateParams - filters from state params
            var filters = Utils.$stateParams;
            queryOptions = _.merge(queryOptions, filters);
            $scope.activeFilter = filters;

            // get list by default
            var promise = FilesRepository.list(queryOptions);

            // Promise is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                $scope.requestPending = false;
                params.total(response.meta.total);
                $defer.resolve(FilesRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

FilesListCtrl.$inject = ['$scope', 'Utils', 'FilesRepository', 'ngTableParams'];
module.exports = FilesListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/controllers/FilesListCtrl.js","/src/files/controllers")

},{"_process":5,"buffer":2}],62:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function FilesDeleteCtrl($scope, Utils, FilesRepository, $modal) {
    var vm = this;
    var viewPath = 'gzero/admin/views/files/directives/';
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
                templateUrl: viewPath + 'fileDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });

            // Bind hotkeys
            Utils.hotkeys.add({
                combo: 'enter',
                description: Utils.$filter('translate')('CONFIRM_DELETE'),
                callback: function() {
                    self.deleteFile();
                }
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param FileId File id to be removed, it is saved in the scope
         */
        showModal: function(FileId) {
            var self = this;
            vm.FileId = FileId;
            self.initModal('PLEASE_CONFIRM', 'DELETE_FILE_QUESTION');
            Utils.hotkeys.del('enter');
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
         * Function performs the RestAngular DELETE action for File id in scope
         *
         */
        deleteFile: function() {
            var self = this;
            // Force delete File
            FilesRepository.delete(vm.FileId).then(function(response) {
                self.closeModal();
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
                Utils.Notifications.addSuccess('FILE_HAS_BEEN_DELETED');
            });
        }
    };
}

FilesDeleteCtrl.$inject = ['$scope', 'Utils', 'FilesRepository', '$modal'];
module.exports = FilesDeleteCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/controllers/directives/FilesDeleteCtrl.js","/src/files/controllers/directives")

},{"_process":5,"buffer":2}],63:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class FilesDeleteTranslationCtrl
 *
 * @package    Admin
 */

'use strict';

function FilesDeleteTranslationCtrl($scope, Utils, $modal, FilesRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/files/directives/';
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
                templateUrl: viewPath + 'translationDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param fileId files id
         * @param translationId translation id
         */
        showModal: function(fileId, translationId) {
            var self = this;
            vm.fileId = fileId;
            vm.translationId = translationId;
            self.initModal('PLEASE_CONFIRM', 'DELETE_TRANSLATION_QUESTION');
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
         * Function performs the RestAngular DELETE action for translation id in scope
         *
         */
        delete: function() {
            var self = this;
            self.closeModal();
            FilesRepository.deleteTranslation(vm.fileId, vm.translationId).then(function() {
                Utils.Notifications.addSuccess('TRANSLATION_HAS_BEEN_DELETED');
                Utils.$state.reload();
            });
        }
    };
}
FilesDeleteTranslationCtrl.$inject = ['$scope', 'Utils', '$modal', 'FilesRepository'];
module.exports = FilesDeleteTranslationCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/controllers/directives/FilesDeleteTranslationCtrl.js","/src/files/controllers/directives")

},{"_process":5,"buffer":2}],64:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class FilesTogglePropertyCtrl
 *
 * @package    Admin
 */

'use strict';

function FilesTogglePropertyCtrl(Utils, FilesRepository) {
    var vm = this;

    vm.toggleProperty = {

        toggleProperty: function(fileId, propertyName, currentValue) {
            var newValue = !currentValue;
            var file = {};
            file[propertyName] = newValue;
            FilesRepository.update(fileId, file).then(
                function() {
                    Utils.$state.reload();
                }
            );
        }

    };

}
FilesTogglePropertyCtrl.$inject = ['Utils', 'FilesRepository'];
module.exports = FilesTogglePropertyCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/controllers/directives/FilesTogglePropertyCtrl.js","/src/files/controllers/directives")

},{"_process":5,"buffer":2}],65:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function FileDeleteButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'FilesDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, FilesDeleteCtrl) {
            element.on('click', function() {
                // Show a delete modal from a controller
                FilesDeleteCtrl.deleteModal.showModal(attrs.fileId);
            });
        }
    };
}

FileDeleteButton.$inject = [];
module.exports = FileDeleteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/directives/FileDeleteButton.js","/src/files/directives")

},{"_process":5,"buffer":2}],66:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class FileTogglePropertyButton
 *
 * @package    Admin
 */

'use strict';

function FileTogglePropertyButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'FilesTogglePropertyCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, FilesTogglePropertyCtrl) {
            element.on('click', function() {
                FilesTogglePropertyCtrl.toggleProperty.toggleProperty(
                    attrs.fileId,
                    attrs.propertyName,
                    String(attrs.value) !== 'false'
                );
            });
        }
    };
}

FileTogglePropertyButton.$inject = [];
module.exports = FileTogglePropertyButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/directives/FileTogglePropertyButton.js","/src/files/directives")

},{"_process":5,"buffer":2}],67:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function FileTranslationDeleteButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'FilesDeleteTranslationCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, TranslationDeleteCtrl) {
            element.on('click', function() {
                TranslationDeleteCtrl.deleteModal.showModal(attrs.fileId, attrs.translationId);
            });
        }
    };
}

FileTranslationDeleteButton.$inject = [];
module.exports = FileTranslationDeleteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/directives/FileTranslationDeleteButton.js","/src/files/directives")

},{"_process":5,"buffer":2}],68:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

angular.module('admin.files', ['ngTable'])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'gzero/admin/views/files/';

            // Now set up the states
            $stateProvider
                .state('files', {
                    url: '/file',
                    templateUrl: viewPath + 'index.html'
                })
                .state('files.list', {
                    url: '/list?type&isActive&page&perPage',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'list.html',
                            controller: 'FilesListCtrl'
                        }
                    }
                })
                // FILE SHOW
                .state('files.show', {
                    url: '/{fileId}/show/{langCode}',
                    abstract: [
                        // redirect to active tab on language change
                        '$state', function($state) {
                            return _.startsWith($state.current.name, 'files.show') ? $state.current.name : '.details';
                        }
                    ],
                    resolve: {
                        langCode: [
                            '$state', '$stateParams', function($state, $stateParams) {
                                return $stateParams.langCode;
                            }
                        ],
                        file: [
                            '$stateParams', 'FilesRepository', function($stateParams, FilesRepository) {
                                return FilesRepository.one($stateParams.fileId);
                            }
                        ]
                    },
                    views: {
                        'content': {
                            templateUrl: viewPath + 'show.html',
                            controller: 'FilesDetailsCtrl'
                        },
                        'langSwitcher@files.show': {
                            templateUrl: viewPath + 'details/langSwitcher.html'

                        },
                        'fileSettings@files.show': {
                            templateUrl: viewPath + 'details/settings.html'

                        }
                    }
                })
                .state('files.show.details', {
                    url: '/details',
                    deepStateRedirect: true,
                    sticky: true,
                    views: {
                        'fileTab': {
                            templateUrl: viewPath + 'details/tabs/details.html'
                        }
                    }
                })
                // FILE EDIT
                .state('files.edit', {
                    url: '/{fileId}/edit/{langCode}',
                    abstract: '.index',
                    resolve: {
                        langCode: [
                            '$state', '$stateParams', function($state, $stateParams) {
                                return $stateParams.langCode;
                            }
                        ],
                        file: [
                            '$stateParams', 'FilesRepository', function($stateParams, FilesRepository) {
                                return FilesRepository.one($stateParams.fileId);
                            }
                        ]
                    },
                    data: {
                        showMask: true // enter edit mode
                    },
                    views: {
                        'content': {
                            templateUrl: viewPath + 'show.html',
                            controller: 'FilesDetailsCtrl'
                        },
                        'langSwitcher@files.edit': {
                            templateUrl: viewPath + 'details/langSwitcher.html'

                        },
                        'fileSettings@files.edit': {
                            templateUrl: viewPath + 'details/settings.html'

                        }
                    }
                })
                .state('files.edit.index', {
                    url: '',
                    views: {
                        'fileTab': {
                            templateUrl: viewPath + 'details/tabs/details.html'
                        }
                    }
                })
                .state('files.edit.details', {
                    url: '/details',
                    views: {
                        'fileTab': {
                            controller: 'FilesDetailsEditCtrl',
                            templateUrl: viewPath + 'details/tabs/detailsEdit.html'
                        }
                    }
                })
                // FILE ADD
                .state('files.add', {
                    url: '/add/{type}',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'add.html',
                            controller: 'FilesAddCtrl'
                        }
                    },
                    resolve: {
                        type: [
                            '$state', '$stateParams', function($state, $stateParams) {
                                return $stateParams.type;
                            }
                        ]
                    }
                })
                // FILE ADD TRANSLATION
                .state('files.addTranslation', {
                    url: '/{fileId}/add-translation/{langCode}',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'addTranslation.html',
                            controller: 'FilesAddTranslationCtrl'
                        }
                    }
                });
        }
    ])
    .controller('FilesAddCtrl', require('./controllers/FilesAddCtrl'))
    .controller('FilesListCtrl', require('./controllers/FilesListCtrl'))
    .controller('FilesDetailsCtrl', require('./controllers/FilesDetailsCtrl'))
    .controller('FilesDetailsEditCtrl', require('./controllers/FilesDetailsEditCtrl'))
    .controller('FilesAddTranslationCtrl', require('./controllers/FilesAddTranslationCtrl'))
    .controller('FilesDeleteCtrl', require('./controllers/directives/FilesDeleteCtrl'))
    .controller('FilesTogglePropertyCtrl', require('./controllers/directives/FilesTogglePropertyCtrl'))
    .controller('FilesDeleteTranslationCtrl', require('./controllers/directives/FilesDeleteTranslationCtrl'))
    .service('FileService', require('./services/FileService.js'))
    .factory('FilesRepository', require('./services/FilesRepository.js'))
    .directive('fileDeleteButton', require('./directives/FileDeleteButton.js'))
    .directive('fileTogglePropertyButton', require('./directives/FileTogglePropertyButton.js'))
    .directive('fileTranslationDeleteButton', require('./directives/FileTranslationDeleteButton.js'))
    .run([
        'NavBar',
        function(NavBar) {
            NavBar.add({
                title: 'FILES', action: 'files.list', icon: 'fa fa-files-o'
            });
        }
    ]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/module.js","/src/files")

},{"./controllers/FilesAddCtrl":57,"./controllers/FilesAddTranslationCtrl":58,"./controllers/FilesDetailsCtrl":59,"./controllers/FilesDetailsEditCtrl":60,"./controllers/FilesListCtrl":61,"./controllers/directives/FilesDeleteCtrl":62,"./controllers/directives/FilesDeleteTranslationCtrl":63,"./controllers/directives/FilesTogglePropertyCtrl":64,"./directives/FileDeleteButton.js":65,"./directives/FileTogglePropertyButton.js":66,"./directives/FileTranslationDeleteButton.js":67,"./services/FileService.js":69,"./services/FilesRepository.js":70,"_process":5,"buffer":2}],69:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function FileService(Utils) {
    return {
        /**
         * Returns merged file data with provided defaults
         *
         * @param file file data
         * @param defaults default file settings to merge with
         * @returns Object merged file data with defaults
         */
        prepareRequestData: function(file, defaults) {
            var output = {
                file: file
            };
            // set translations if there any of them is filled, because translations are not required.
            if (typeof file.translations !== 'undefined') {
                output.translations = file.translations;
            } else {
                defaults = _.omit(defaults, ['translations']);
            }
            return _.merge(defaults, output);
        },
        /**
         * Returns file extensions pattern for ng-file-upload validator e.g. '.png,.jpg,.jpeg,.tif'
         *
         * @param type file type
         * @returns string type file extensions pattern for ng-file-upload validator
         */
        getTypeExtensionsPattern: function(type) {
            return '.' + _.join(Utils.Config.fileExtensions[type], ',.');
        }
    };
}

FileService.$inject = ['Utils'];
module.exports = FileService;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/services/FileService.js","/src/files/services")

},{"_process":5,"buffer":2}],70:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class FileController
 *
 * @package    Admin
 */

'use strict';

function FilesRepository(Restangular, Upload) {
    var api = 'admin/files';
    var users = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
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
        },
        create: function(newFile) {
            return Upload.upload({
                url: Restangular.configuration.baseUrl + '/' + api,
                headers : Restangular.configuration.defaultHeaders,
                withCredentials: Restangular.configuration.defaultHttpFields.withCredentials,
                data: newFile
            });
        },
        newTranslation: function(id, newTranslation) {
            return Restangular.one(api, id).all('translations').post(newTranslation);
        },
        deleteTranslation: function(fileId, translationId) {
            return Restangular.one(api, fileId).one('translations', translationId).remove();
        }
    };
}

FilesRepository.$inject = ['Restangular', 'Upload'];
module.exports = FilesRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/files/services/FilesRepository.js","/src/files/services")

},{"_process":5,"buffer":2}],71:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function Notifications($translate) {
    // Notifications stack
    var stackBottomRight = {'dir1': 'up', 'dir2': 'left', 'firstpos1': 25, 'firstpos2': 25};
    // Notifications options
    var options = {
        addclass: 'stack-bottomright',
        stack: stackBottomRight,
        shadow: false,
        buttons: {
            sticker: false
        }
    };
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
         * @param translationParams dynamic params for the translation
         */
        addInfo: function(message, translationParams) {
            return new PNotify(_.merge(options, {
                text: $translate.instant(message, translationParams),
                type: 'info'
            }));
        },
        /**
         * Function shows the AngularStrap danger type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         * @param translationParams dynamic params for the translation
         */
        addError: function(message, translationParams) {
            return new PNotify(_.merge(options, {
                text: $translate.instant(message, translationParams),
                type: 'error',
                icon: 'fa fa-times'
            }));
        },
        /**
         * Function shows the AngularStrap warning type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         * @param translationParams dynamic params for the translation
         */
        addWarning: function(message, translationParams) {
            return new PNotify(_.merge(options, {
                text: $translate.instant(message, translationParams),
                type: 'warning'
            }));
        },
        /**
         * Function shows the AngularStrap success type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         * @param translationParams dynamic params for the translation
         */
        addSuccess: function(message, translationParams) {
            return new PNotify(_.merge(options, {
                text: $translate.instant(message, translationParams),
                type: 'success'
            }));
        }
    };
}

module.$inject = ['$translate'];
module.exports = Notifications;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/lib/Notifications.js","/src/lib")

},{"_process":5,"buffer":2}],72:[function(require,module,exports){
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
            storageItems = _.merge(storageItems, object, function(objectValue, sourceValue) {
                if (_.isArray(objectValue)) {
                    return sourceValue;
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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/lib/Storage.js","/src/lib")

},{"_process":5,"buffer":2}],73:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ckOptions() {
    var defaults = {
        toolbarGroups: [
            {name: 'clipboard', groups: ['clipboard', 'undo']},
            {name: 'editing', groups: ['find', 'selection']},
            {name: 'links'},
            {name: 'insert'},
            {name: 'tools'},
            {name: 'document', groups: ['mode', 'document', 'doctools']},
            {name: 'others'},
            '/',
            {name: 'basicstyles', groups: ['basicstyles', 'cleanup']},
            {name: 'paragraph', groups: ['list', 'indent', 'blocks', 'bidi']},
            {name: 'align'},
            {name: 'styles'}
        ],
        height: '500px'
    };

    return {
        /**
         * Function adds specified object to the CKEditor options
         *
         * @param object
         */
        setEditorOption: function(object) {
            defaults = _.merge(defaults, object, function(objectValue, sourceValue) {
                if (_.isArray(objectValue)) {
                    return sourceValue;
                }
            });
        },
        /**
         * Function returns CKEditor options
         * @param custom custom option to include in return object, only for this instance of editor
         * @returns {object}
         */
        getEditorOptions: function(custom) {
            var output = _.cloneDeep(defaults);
            angular.forEach(custom, function(value, key) {
                output[key] = value;
            });
            return output;
        }
    };
}

module.$inject = [];
module.exports = ckOptions;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/lib/ckOptions.js","/src/lib")

},{"_process":5,"buffer":2}],74:[function(require,module,exports){
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

},{"_process":5,"buffer":2}],75:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function SettingsCtrl($scope, Utils, SettingsRepository, categories, settings) {

    // fields that will use number type input
    $scope.numericFields = ['defaultPageSize', 'seoDescLength'];

    // option category
    if (typeof Utils.$stateParams.key !== 'undefined') {
        $scope.categoryKey = Utils.$stateParams.key;
    }

    // lang code exists
    if (typeof Utils.$stateParams.langCode !== 'undefined') {
        $scope.langCode = Utils.$stateParams.langCode;
    }

    // categories exists
    if (typeof categories !== 'undefined') {
        $scope.categories = SettingsRepository.clean(categories); // options categories
    }

    // settings exists
    if (typeof settings !== 'undefined') {
        $scope.settings = SettingsRepository.clean(settings); // category settings
    }

    // we need integer values for number type inputs
    angular.forEach($scope.numericFields, function(propertyName){
        if ($scope.settings.hasOwnProperty(propertyName)) {
            angular.forEach($scope.settings[propertyName], function(v, k) {
                $scope.settings[propertyName][k] = parseInt(v);
            });
        }
    });

    // save settings category options
    $scope.save = function(key, value) {
        // prepare option data
        var data = {
            key: key,
            value: value
        };

        // save option
        SettingsRepository.update($scope.categoryKey, data).then(function() {
            Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
        });
    };
}

SettingsCtrl.$inject = ['$scope', 'Utils', 'SettingsRepository', 'categories', 'settings'];
module.exports = SettingsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/settings/controllers/SettingsCtrl.js","/src/settings/controllers")

},{"_process":5,"buffer":2}],76:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function SettingCopyCtrl($scope, Utils, $modal, SettingsRepository) {
    var vm = this;
    var viewPath = 'gzero/admin/views/settings/directives/';
    // Copy modal
    vm.copyModal = {
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
                templateUrl: viewPath + 'settingCopyModal.tpl.html',
                show: true,
                placement: 'center'
            });
        },

        /**
         * Function shows the AngularStrap modal
         *
         * @param attrs attributes from directive
         */
        showModal: function(attrs) {
            var self = this;
            vm.attrs = attrs;
            self.initModal('PLEASE_CONFIRM', 'OPTIONS_LANG.COPY_OPTION_QUESTION');
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
         * Function apply setting value to other languages and performs the RestAngular PUT action for option value
         *
         */
        saveSetting: function() {
            var self = this;
            self.closeModal();
            // prepare option data
            var data = {
                key: vm.attrs.optionKey,
                value: angular.fromJson(vm.attrs.optionValue)
            };

            // set option value to all other languages
            _.forEach(data.value, function(n, key) {
                data.value[key] = vm.attrs.optionNewValue;
            });

            // save option
            SettingsRepository.update(vm.attrs.categoryKey, data).then(function() {
                Utils.Notifications.addSuccess('OPTIONS_LANG.COPY_CONFIRM');
                Utils.$state.reload();
            });
        }
    };
}
SettingCopyCtrl.$inject = ['$scope', 'Utils', '$modal', 'SettingsRepository'];
module.exports = SettingCopyCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/settings/controllers/directives/SettingCopyCtrl.js","/src/settings/controllers/directives")

},{"_process":5,"buffer":2}],77:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function SettingCopyButton() {
    return {
        scope: '=',
        restrict: 'A',
        controller: 'SettingCopyCtrl',
        controllerAs: 'vm',
        bindToController: true,
        link: function(scope, element, attrs, SettingCopyCtrl) {
            element.on('click', function() {
                SettingCopyCtrl.copyModal.showModal(attrs);
            });
        }
    };
}

SettingCopyButton.$inject = [];
module.exports = SettingCopyButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/settings/directives/SettingCopyButton.js","/src/settings/directives")

},{"_process":5,"buffer":2}],78:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

angular.module('admin.settings', [])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'gzero/admin/views/settings/';

            // Now set up the states
            $stateProvider
                .state('settings', {
                    url: '/settings/{key}',
                    templateUrl: viewPath + 'index.html',
                    controller: 'SettingsCtrl',
                    deepStateRedirect: true,
                    resolve: {
                        categories: [
                            'SettingsRepository', function(SettingsRepository) {
                                // get tree of all categories
                                return SettingsRepository.list();
                            }
                        ],
                        settings: [
                            '$stateParams', 'SettingsRepository', function($stateParams, SettingsRepository) {
                                return SettingsRepository.one($stateParams.key);
                            }
                        ]
                    }
                })
                // SETTINGS SHOW
                .state('settings.show', {
                    url: '/{langCode}',
                    views: {
                        'contentTab': {
                            templateUrl: viewPath + 'show.html',
                            controller: 'SettingsCtrl'
                        }
                    }
                });
        }
    ])
    .controller('SettingsCtrl', require('./controllers/SettingsCtrl'))
    .controller('SettingCopyCtrl', require('./controllers/directives/SettingCopyCtrl'))
    .directive('settingCopyButton', require('./directives/SettingCopyButton.js'))
    .factory('SettingsRepository', require('./services/SettingsRepository.js'))
    .run([
        'NavBar',
        function(NavBar) {
            NavBar.add({
                title: 'SETTINGS', action: 'settings', icon: 'fa fa-cogs'
            });
        }
    ]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/settings/module.js","/src/settings")

},{"./controllers/SettingsCtrl":75,"./controllers/directives/SettingCopyCtrl":76,"./directives/SettingCopyButton.js":77,"./services/SettingsRepository.js":79,"_process":5,"buffer":2}],79:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function SettingsRepository(Restangular) {
    var api = 'admin/options';
    var option = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        list: function(params) {
            return option.getList(params);
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        },
        delete: function(id) {
            return Restangular.one(api, id).remove();
        },
        update: function(categoryKey, data) {
            return Restangular.one(api, categoryKey).customPUT(data);
        }
    };
}

SettingsRepository.$inject = ['Restangular'];
module.exports = SettingsRepository;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/settings/services/SettingsRepository.js","/src/settings/services")

},{"_process":5,"buffer":2}],80:[function(require,module,exports){
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

function UserDetailsCtrl($scope, Utils, UserRepository) {
    // get single user
    UserRepository.one(Utils.$stateParams.userId).then(function(response) {
        $scope.user = UserRepository.clean(response);
    });
}
UserDetailsCtrl.$inject = ['$scope', 'Utils', 'UserRepository'];
module.exports = UserDetailsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserDetailsCtrl.js","/src/user/controllers")

},{"_process":5,"buffer":2}],81:[function(require,module,exports){
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

function UserDetailsCtrl($scope, UserRepository, Utils) {
    // get single user
    UserRepository.one(Utils.$stateParams.userId).then(function(response) {
        $scope.user = UserRepository.clean(response);
    });

    $scope.saveUser = function() {
        UserRepository.update($scope.user.id, $scope.user).then(function(response) {
            Utils.$state.go('user.list');
            Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
        });
    };

}
UserDetailsCtrl.$inject = ['$scope', 'UserRepository', 'Utils'];
module.exports = UserDetailsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserEditCtrl.js","/src/user/controllers")

},{"_process":5,"buffer":2}],82:[function(require,module,exports){
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

function UserListCtrl($scope, Utils, UserRepository, NgTableParams) {
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'id': 'desc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            $scope.requestPending = true;
            // prepare options to be sent to api
            var queryOptions = {
                type: 'user'
            };

            // params.count() - number of items per page declared in view
            if (typeof Utils.$stateParams.perPage !== 'undefined') {
                params.count(Utils.$stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof Utils.$stateParams.page !== 'undefined') {
                params.page(Utils.$stateParams.page);
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

            // Promise is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                $scope.requestPending = false;
                params.total(response.meta.total);
                $defer.resolve(UserRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });

    $scope.userListActions = [
        {
            text: 'VIEW',
            url: 'user.show({ userId: record_id })',
            icon: 'fa fa-search'
        },
        {
            text: 'EDIT',
            href: 'user.edit({ userId: record_id })',
            icon: 'fa fa-pencil'
        },
        {
            text: 'DELETE',
            click: 'delete', // this will be replaced with delete action
            icon: 'fa fa-times'
        }
    ];
}

UserListCtrl.$inject = ['$scope', 'Utils', 'UserRepository', 'ngTableParams'];
module.exports = UserListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserListCtrl.js","/src/user/controllers")

},{"_process":5,"buffer":2}],83:[function(require,module,exports){
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

function UserListCtrl($scope, Utils, UserRepository, $modal) {
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
                templateUrl: viewPath + 'userDeleteModal.tpl.html',
                show: true,
                placement: 'center'
            });

            // Bind hotkeys
            Utils.hotkeys.add({
                combo: 'enter',
                description: 'CONFIRM_DELETE',
                callback: function() {
                    self.deleteUser();
                }
            });
        },

        /**
         * Function shows the AngularStrap modal
         * @param userId content id to be removed, it is saved in the scope
         */
        showModal: function(userId) {
            var self = this;
            vm.userId = userId;
            if (userId !== Utils.Config.currentUserId) {
                self.initModal('PLEASE_CONFIRM', 'DELETE_USER_QUESTION');
                Utils.hotkeys.del('enter');
            } else {
                //You can not delete your own account!
                Utils.Notifications.addError('DELETE_SELF_USER_ERROR');
            }
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
        deleteUser: function(userId) {
            var self = this;
            UserRepository.delete(vm.userId).then(function(response) {
                self.closeModal();
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
            });
        }
    };
}

UserListCtrl.$inject = ['$scope', 'Utils', 'UserRepository', '$modal'];
module.exports = UserListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/directives/UserDeleteCtrl.js","/src/user/controllers/directives")

},{"_process":5,"buffer":2}],84:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function UserActionsDropdown($dropdown) {
    return {
        scope: {userActionsDropdown: '=', record: '='},
        controller: 'UserDeleteCtrl',
        controllerAs: 'vm',
        restrict: 'A',
        link: function(scope, element, attrs, UserDeleteCtrl) {
            var dropdown = $dropdown(element, {
                templateUrl: 'gzero/admin/views/user/directives/userActionsDropdown.tpl.html',
                animation: 'am-flip-x',
                placement: 'bottom-right'
            });

            element.on('click', function() {
                // TODO better params replacement and functions handling
                _.mapValues(scope.userActionsDropdown, function(n) {
                    if (typeof n.url !== 'undefined') {
                        // Record id
                        if (n.url.indexOf('record_id') !== -1) {
                            n.url = n.url.replace('record_id', scope.record.id);
                        }
                    } else if (typeof n.href !== 'undefined') {
                        // Record id
                        if (n.href.indexOf('record_id') !== -1) {
                            n.href = n.href.replace('record_id', scope.record.id);
                        }
                    }
                    return n;
                });

                dropdown.$scope.user = scope.userActionsDropdown;
                dropdown.$scope.record = scope.record; // Pass user id to the view
                dropdown.$scope.deleteModal = UserDeleteCtrl.deleteModal; // Pass delete action to the view
            });
        }
    };
}

UserActionsDropdown.$inject = [];
module.exports = UserActionsDropdown;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/directives/UserActionsDropdown.js","/src/user/directives")

},{"_process":5,"buffer":2}],85:[function(require,module,exports){
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
        scope: {
            userId: '='
        },
        restrict: 'A',
        controller: 'UserDeleteCtrl',
        controllerAs: 'vm',
        link: function(scope, element, attrs, UserDeleteController) {
            element.on('click', function() {
                // Show a delete modal from a controller
                UserDeleteController.deleteModal.showModal(scope.userId);
            });
        }
    };
}

UserDeleteButton.$inject = [];
module.exports = UserDeleteButton;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/directives/UserDeleteButton.js","/src/user/directives")

},{"_process":5,"buffer":2}],86:[function(require,module,exports){
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
                    url: '/list?page&perPage',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'list.html'
                        }
                    }

                });
        }
    ])
    .controller('UserListCtrl', require('./controllers/UserListCtrl'))
    .controller('UserDeleteCtrl', require('./controllers/directives/UserDeleteCtrl'))
    .controller('UserEditCtrl', require('./controllers/UserEditCtrl'))
    .controller('UserDetailsCtrl', require('./controllers/UserDetailsCtrl'))
    .factory('UserRepository', require('./services/UserRepository.js'))
    .directive('userDeleteButton', require('./directives/UserDeleteButton.js'))
    .directive('userActionsDropdown', ['$dropdown', require('./directives/UserActionsDropdown.js')])
    .run([
        'NavBar',
        function(NavBar) {
            NavBar.add({
                title: 'USERS', action: 'user.list', icon: 'fa fa-user'
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

},{"./controllers/UserDetailsCtrl":80,"./controllers/UserEditCtrl":81,"./controllers/UserListCtrl":82,"./controllers/directives/UserDeleteCtrl":83,"./directives/UserActionsDropdown.js":84,"./directives/UserDeleteButton.js":85,"./services/UserRepository.js":87,"_process":5,"buffer":2}],87:[function(require,module,exports){
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

},{"_process":5,"buffer":2}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJzcmMvYXBwLmpzIiwic3JjL2Jsb2Nrcy9jb250cm9sbGVycy9CbG9ja3NBZGRDdHJsLmpzIiwic3JjL2Jsb2Nrcy9jb250cm9sbGVycy9CbG9ja3NFZGl0Q3RybC5qcyIsInNyYy9ibG9ja3MvY29udHJvbGxlcnMvQmxvY2tzTGlzdEN0cmwuanMiLCJzcmMvYmxvY2tzL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQmxvY2tzRGVsZXRlQ3RybC5qcyIsInNyYy9ibG9ja3MvZGlyZWN0aXZlcy9CbG9ja0RlbGV0ZUJ1dHRvbi5qcyIsInNyYy9ibG9ja3MvbW9kdWxlLmpzIiwic3JjL2Jsb2Nrcy9zZXJ2aWNlcy9CbG9ja1NlcnZpY2UuanMiLCJzcmMvYmxvY2tzL3NlcnZpY2VzL0Jsb2Nrc1JlcG9zaXRvcnkuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50QWRkQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRBZGRUcmFuc2xhdGlvbkN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50QmxvY2tzQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudERhc2hib2FyZEN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50RGV0YWlsc0N0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50RGV0YWlsc0VkaXRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudEhpc3RvcnlDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudExpc3RDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudFRyYXNoY2FuQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRQdWJsaXNoZWRBdEVkaXRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50UmVzdG9yZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRSb3V0ZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRUaGVtZUVkaXRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50VG9nZ2xlUHJvcGVydHlDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50V2VpZ2h0RWRpdEN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL1NldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9UcmFuc2xhdGlvbkRlbGV0ZUN0cmwuanMiLCJzcmMvY29udGVudC9kaXJlY3RpdmVzL0NoYXJhY3RlcnNDb3VudGVyLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50QWN0aW9uc0Ryb3Bkb3duLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50RGVsZXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50RWRpdFJvdXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50UHVibGlzaGVkQXRFZGl0QnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50UmVzdG9yZUJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudFRoZW1lRWRpdEJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudFRvZ2dsZVByb3BlcnR5QnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50V2VpZ2h0RWRpdEJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvVHJhbnNsYXRpb25EZWxldGVCdXR0b24uanMiLCJzcmMvY29udGVudC9tb2R1bGUuanMiLCJzcmMvY29udGVudC9zZXJ2aWNlcy9Db250ZW50UmVwb3NpdG9yeS5qcyIsInNyYy9jb3JlL2NvbnRyb2xsZXJzL0NvcmVDdHJsLmpzIiwic3JjL2NvcmUvZGlyZWN0aXZlcy9TdGF0ZXNEcm9wZG93bi5qcyIsInNyYy9jb3JlL2ZpbHRlcnMvQ29yZUZpbHRlcnMuanMiLCJzcmMvY29yZS9tb2R1bGUuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9BcGlSZXBvc2l0b3J5LmpzIiwic3JjL2NvcmUvc2VydmljZXMvTGFuZ1JlcG9zaXRvcnkuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9OYXZCYXIuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9Ub3BOYXZCYXIuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9UcmFuc2xhdGlvbnMuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9VdGlscy5qcyIsInNyYy9maWxlcy9jb250cm9sbGVycy9GaWxlc0FkZEN0cmwuanMiLCJzcmMvZmlsZXMvY29udHJvbGxlcnMvRmlsZXNBZGRUcmFuc2xhdGlvbkN0cmwuanMiLCJzcmMvZmlsZXMvY29udHJvbGxlcnMvRmlsZXNEZXRhaWxzQ3RybC5qcyIsInNyYy9maWxlcy9jb250cm9sbGVycy9GaWxlc0RldGFpbHNFZGl0Q3RybC5qcyIsInNyYy9maWxlcy9jb250cm9sbGVycy9GaWxlc0xpc3RDdHJsLmpzIiwic3JjL2ZpbGVzL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvRmlsZXNEZWxldGVDdHJsLmpzIiwic3JjL2ZpbGVzL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvRmlsZXNEZWxldGVUcmFuc2xhdGlvbkN0cmwuanMiLCJzcmMvZmlsZXMvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9GaWxlc1RvZ2dsZVByb3BlcnR5Q3RybC5qcyIsInNyYy9maWxlcy9kaXJlY3RpdmVzL0ZpbGVEZWxldGVCdXR0b24uanMiLCJzcmMvZmlsZXMvZGlyZWN0aXZlcy9GaWxlVG9nZ2xlUHJvcGVydHlCdXR0b24uanMiLCJzcmMvZmlsZXMvZGlyZWN0aXZlcy9GaWxlVHJhbnNsYXRpb25EZWxldGVCdXR0b24uanMiLCJzcmMvZmlsZXMvbW9kdWxlLmpzIiwic3JjL2ZpbGVzL3NlcnZpY2VzL0ZpbGVTZXJ2aWNlLmpzIiwic3JjL2ZpbGVzL3NlcnZpY2VzL0ZpbGVzUmVwb3NpdG9yeS5qcyIsInNyYy9saWIvTm90aWZpY2F0aW9ucy5qcyIsInNyYy9saWIvU3RvcmFnZS5qcyIsInNyYy9saWIvY2tPcHRpb25zLmpzIiwic3JjL2xpYi9uYXZpZ2F0aW9uLmpzIiwic3JjL3NldHRpbmdzL2NvbnRyb2xsZXJzL1NldHRpbmdzQ3RybC5qcyIsInNyYy9zZXR0aW5ncy9jb250cm9sbGVycy9kaXJlY3RpdmVzL1NldHRpbmdDb3B5Q3RybC5qcyIsInNyYy9zZXR0aW5ncy9kaXJlY3RpdmVzL1NldHRpbmdDb3B5QnV0dG9uLmpzIiwic3JjL3NldHRpbmdzL21vZHVsZS5qcyIsInNyYy9zZXR0aW5ncy9zZXJ2aWNlcy9TZXR0aW5nc1JlcG9zaXRvcnkuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyRGV0YWlsc0N0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyRWRpdEN0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyTGlzdEN0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9kaXJlY3RpdmVzL1VzZXJEZWxldGVDdHJsLmpzIiwic3JjL3VzZXIvZGlyZWN0aXZlcy9Vc2VyQWN0aW9uc0Ryb3Bkb3duLmpzIiwic3JjL3VzZXIvZGlyZWN0aXZlcy9Vc2VyRGVsZXRlQnV0dG9uLmpzIiwic3JjL3VzZXIvbW9kdWxlLmpzIiwic3JjL3VzZXIvc2VydmljZXMvVXNlclJlcG9zaXRvcnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDanJEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbmZ1bmN0aW9uIGluaXQgKCkge1xuICB2YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbiAgfVxuXG4gIHJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxuICByZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcbn1cblxuaW5pdCgpXG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcblxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcbiAgLy8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuICAvLyByZXByZXNlbnQgb25lIGJ5dGVcbiAgLy8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG4gIC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2VcbiAgcGxhY2VIb2xkZXJzID0gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxuXG4gIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICBhcnIgPSBuZXcgQXJyKGxlbiAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogRHVlIHRvIHZhcmlvdXMgYnJvd3NlciBidWdzLCBzb21ldGltZXMgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiB3aWxsIGJlIHVzZWQgZXZlblxuICogd2hlbiB0aGUgYnJvd3NlciBzdXBwb3J0cyB0eXBlZCBhcnJheXMuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAgIC0gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLFxuICogICAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG5cbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5XG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCBiZWhhdmVzIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVCAhPT0gdW5kZWZpbmVkXG4gID8gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgOiB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbi8qXG4gKiBFeHBvcnQga01heExlbmd0aCBhZnRlciB0eXBlZCBhcnJheSBzdXBwb3J0IGlzIGRldGVybWluZWQuXG4gKi9cbmV4cG9ydHMua01heExlbmd0aCA9IGtNYXhMZW5ndGgoKVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHtfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH19XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDIgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgYXJyLnN1YmFycmF5KDEsIDEpLmJ5dGVMZW5ndGggPT09IDAgLy8gaWUxMCBoYXMgYnJva2VuIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGtNYXhMZW5ndGggKCkge1xuICByZXR1cm4gQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgICA/IDB4N2ZmZmZmZmZcbiAgICA6IDB4M2ZmZmZmZmZcbn1cblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgaWYgKGtNYXhMZW5ndGgoKSA8IGxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHR5cGVkIGFycmF5IGxlbmd0aCcpXG4gIH1cbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgaWYgKHRoYXQgPT09IG51bGwpIHtcbiAgICAgIHRoYXQgPSBuZXcgQnVmZmVyKGxlbmd0aClcbiAgICB9XG4gICAgdGhhdC5sZW5ndGggPSBsZW5ndGhcbiAgfVxuXG4gIHJldHVybiB0aGF0XG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmICEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdJZiBlbmNvZGluZyBpcyBzcGVjaWZpZWQgdGhlbiB0aGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKHRoaXMsIGFyZylcbiAgfVxuICByZXR1cm4gZnJvbSh0aGlzLCBhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbi8vIFRPRE86IExlZ2FjeSwgbm90IG5lZWRlZCBhbnltb3JlLiBSZW1vdmUgaW4gbmV4dCBtYWpvciB2ZXJzaW9uLlxuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIGZyb20gKHRoYXQsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXInKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgdmFsdWUgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodGhhdCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodGhhdCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICByZXR1cm4gZnJvbU9iamVjdCh0aGF0LCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbShudWxsLCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG5pZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuICBCdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuICBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgJiZcbiAgICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICAgIC8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSlcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAodGhhdCwgc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2MobnVsbCwgc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlICh0aGF0LCBzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgKytpKSB7XG4gICAgICB0aGF0W2ldID0gMFxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKG51bGwsIHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKG51bGwsIHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJlbmNvZGluZ1wiIG11c3QgYmUgYSB2YWxpZCBzdHJpbmcgZW5jb2RpbmcnKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuZ3RoKVxuXG4gIHRoYXQud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKHRoYXQsIGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgYXJyYXkuYnl0ZUxlbmd0aCAvLyB0aGlzIHRocm93cyBpZiBgYXJyYXlgIGlzIG5vdCBhIHZhbGlkIEFycmF5QnVmZmVyXG5cbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ29mZnNldFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnbGVuZ3RoXFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBhcnJheVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0ID0gZnJvbUFycmF5TGlrZSh0aGF0LCBhcnJheSlcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW4pXG5cbiAgICBpZiAodGhhdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0XG4gICAgfVxuXG4gICAgb2JqLmNvcHkodGhhdCwgMCwgMCwgbGVuKVxuICAgIHJldHVybiB0aGF0XG4gIH1cblxuICBpZiAob2JqKSB7XG4gICAgaWYgKCh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIG9iai5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikgfHwgJ2xlbmd0aCcgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IGlzbmFuKG9iai5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIodGhhdCwgMClcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHRoYXQsIG9iailcbiAgICB9XG5cbiAgICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmouZGF0YSlcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgYXJyYXktbGlrZSBvYmplY3QuJylcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IGtNYXhMZW5ndGhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IHN0cmluZyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIGNhc2UgJ3Jhdyc6XG4gICAgICBjYXNlICdyYXdzJzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGUgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCBhbmQgYGlzLWJ1ZmZlcmAgKGluIFNhZmFyaSA1LTcpIHRvIGRldGVjdFxuLy8gQnVmZmVyIGluc3RhbmNlcy5cbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8IDBcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICBmb3IgKHZhciBpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBzcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpXG4gIH1cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAoaXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoIHwgMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIC8vIGxlZ2FjeSB3cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aCkgLSByZW1vdmUgaW4gdjAuMTNcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gICAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyArK2kpIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7ICsraSkge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyArK2kpIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG4gIHZhciBpXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yIChpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2UgaWYgKGxlbiA8IDEwMDAgfHwgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gYXNjZW5kaW5nIGNvcHkgZnJvbSBzdGFydFxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoY29kZSA8IDI1Nikge1xuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogdXRmOFRvQnl0ZXMobmV3IEJ1ZmZlcih2YWwsIGVuY29kaW5nKS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7ICsraSkge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXitcXC8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBpc25hbiAodmFsKSB7XG4gIHJldHVybiB2YWwgIT09IHZhbCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCJ2YXIgdG9TdHJpbmcgPSB7fS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBpcyBub3QgZGVmaW5lZCcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICB9XG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgfVxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9jb3JlL21vZHVsZS5qcycpO1xucmVxdWlyZSgnLi9jb250ZW50L21vZHVsZS5qcycpO1xucmVxdWlyZSgnLi9ibG9ja3MvbW9kdWxlLmpzJyk7XG5yZXF1aXJlKCcuL3VzZXIvbW9kdWxlLmpzJyk7XG5yZXF1aXJlKCcuL2ZpbGVzL21vZHVsZS5qcycpO1xucmVxdWlyZSgnLi9zZXR0aW5ncy9tb2R1bGUuanMnKTtcblxudmFyIGRlcGVuZGVuY2llcyA9IFtcbiAgICAncmVzdGFuZ3VsYXInLFxuICAgICd1aS5yb3V0ZXInLFxuICAgICd1aS5yb3V0ZXIuZGVmYXVsdCcsXG4gICAgJ2N0LnVpLnJvdXRlci5leHRyYXMnLFxuICAgICduZ0FuaW1hdGUnLFxuICAgICdtZ2NyZWEubmdTdHJhcCcsXG4gICAgJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUnLFxuICAgICdja2VkaXRvcicsXG4gICAgJ2FuZ3VsYXItbG9hZGluZy1iYXInLFxuICAgICduZy5odHRwTG9hZGVyJyxcbiAgICAnY2ZwLmhvdGtleXMnLFxuICAgICdhZG1pbi5jb3JlJyxcbiAgICAnYWRtaW4uY29udGVudCcsXG4gICAgJ2FkbWluLmJsb2NrcycsXG4gICAgJ2FkbWluLmZpbGVzJyxcbiAgICAnYWRtaW4udXNlcicsXG4gICAgJ2FkbWluLnNldHRpbmdzJyxcbiAgICAnbmdGaWxlVXBsb2FkJyxcbiAgICAnbmdNZXNzYWdlcydcbl07XG5kZXBlbmRlbmNpZXMucHVzaC5hcHBseShkZXBlbmRlbmNpZXMsIG1vZHVsZXMpOyAvLyBPdGhlciBtb2R1bGVzIGFyZSBsb2FkZWQgYnkgdHdpZ1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4nLCBkZXBlbmRlbmNpZXMpLmNvbmZpZyhbXG4gICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAnJHVybFJvdXRlclByb3ZpZGVyJyxcbiAgICAnUmVzdGFuZ3VsYXJQcm92aWRlcicsXG4gICAgJyR0cmFuc2xhdGVQcm92aWRlcicsXG4gICAgJyR0cmFuc2xhdGVQYXJ0aWFsTG9hZGVyUHJvdmlkZXInLFxuICAgICdodHRwTWV0aG9kSW50ZXJjZXB0b3JQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgUmVzdGFuZ3VsYXJQcm92aWRlciwgJHRyYW5zbGF0ZVByb3ZpZGVyLCAkdHJhbnNsYXRlUGFydGlhbExvYWRlclByb3ZpZGVyLCBodHRwTWV0aG9kSW50ZXJjZXB0b3JQcm92aWRlcikge1xuICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvJztcblxuICAgICAgICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9zdGF0ZTFcbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuICAgICAgICAvLyBXaGl0ZWxpc3QgdGhlIGRvbWFpbnMgdGhhdCB0aGUgbG9hZGVyIHdpbCBzaG93IGZvclxuICAgICAgICBodHRwTWV0aG9kSW50ZXJjZXB0b3JQcm92aWRlci53aGl0ZWxpc3REb21haW4oQ29uZmlnLmRvbWFpbik7XG4gICAgICAgIC8vIE5vdyBzZXQgdXAgdGhlIHN0YXRlc1xuICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKCdob21lJywge1xuICAgICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdob21lLmh0bWwnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIudXNlTG9hZGVyKCckdHJhbnNsYXRlUGFydGlhbExvYWRlcicsIHtcbiAgICAgICAgICAgIHVybFRlbXBsYXRlOiAnZ3plcm8ve3BhcnR9L2xhbmcve2xhbmd9Lmpzb24nXG4gICAgICAgIH0pO1xuICAgICAgICAkdHJhbnNsYXRlUGFydGlhbExvYWRlclByb3ZpZGVyLmFkZFBhcnQoJ2FkbWluJyk7XG4gICAgICAgICR0cmFuc2xhdGVQcm92aWRlci5wcmVmZXJyZWRMYW5ndWFnZSgnZW5fVVMnKTtcblxuICAgICAgICAvLyBVc2VyIG1vcmUgc2VjdXJlIHZhcmlhbnQgc2FuaXRpemUgc3RyYXRlZ3kgZm9yIGVzY2FwaW5nO1xuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIudXNlU2FuaXRpemVWYWx1ZVN0cmF0ZWd5KCdlc2NhcGUnKTtcblxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldEJhc2VVcmwoQ29uZmlnLmFwaVVybCArICcvdjEnKTtcblxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldERlZmF1bHRIdHRwRmllbGRzKHtcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCByZXF1ZXN0IGhlYWRlcnNcbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5zZXREZWZhdWx0SGVhZGVycyh7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCcsXG4gICAgICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiAnQmVhcmVyICcgKyBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZ3plcm9fYXBpX3Rva2VuJylcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVuYW1lIFJlc3Rhbmd1bGFyIHJvdXRlIGZpZWxkIHRvIHVzZSBhICQgcHJlZml4IGZvciBlYXN5IGRpc3RpbmN0aW9uIGJldHdlZW4gZGF0YSBhbmQgbWV0YWRhdGFcbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5zZXRSZXN0YW5ndWxhckZpZWxkcyh7cm91dGU6ICckcm91dGUnfSk7XG4gICAgICAgIC8vIEFkZCBhIHJlc3BvbnNlIGludGVyY2VwdG9yXG4gICAgICAgIFJlc3Rhbmd1bGFyUHJvdmlkZXIuYWRkUmVzcG9uc2VJbnRlcmNlcHRvcihmdW5jdGlvbihkYXRhLCBvcGVyYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBleHRyYWN0ZWREYXRhO1xuICAgICAgICAgICAgLy8gLi4gdG8gbG9vayBmb3IgZ2V0TGlzdCBvcGVyYXRpb25zXG5cbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24gPT09ICdnZXRMaXN0Jykge1xuICAgICAgICAgICAgICAgIC8vIC4uIGFuZCBoYW5kbGUgdGhlIGRhdGEgYW5kIG1ldGEgZGF0YVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YS5kYXRhICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhLm1ldGEgPSBkYXRhLm1ldGE7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEucGFyYW1zID0gZGF0YS5wYXJhbXM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gb25seSBvbmUgaXRlbSBpbiBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGV4dHJhY3RlZERhdGE7XG4gICAgICAgIH0pO1xuICAgIH1cbl0pLnJ1bihbXG4gICAgJ05hdkJhcicsXG4gICAgJyRyb290U2NvcGUnLFxuICAgICdSZXN0YW5ndWxhcicsXG4gICAgJ1V0aWxzJyxcbiAgICBmdW5jdGlvbihOYXZCYXIsICRyb290U2NvcGUsIFJlc3Rhbmd1bGFyLCBVdGlscykge1xuICAgICAgICBOYXZCYXIuYWRkRmlyc3Qoe3RpdGxlOiAnREFTSEJPQVJEJywgYWN0aW9uOiAnaG9tZScsIGljb246ICdmYSBmYS1ob21lJ30pO1xuICAgICAgICAkcm9vdFNjb3BlLmJhc2VVcmwgPSBVdGlscy5Db25maWcudXJsO1xuXG4gICAgICAgIFJlc3Rhbmd1bGFyLnNldEVycm9ySW50ZXJjZXB0b3IoZnVuY3Rpb24ocmVzcG9uc2UsIGRlZmVycmVkLCByZXNwb25zZUhhbmRsZXIpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ0NPTU1PTl9FUlJPUicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gZXJyb3IgaGFuZGxlZFxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDUwMCkge1xuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3IocmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZ3plcm9fYXBpX3Rva2VuJyk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRFcnJvcihyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBlcnJvciBub3QgaGFuZGxlZFxuICAgICAgICB9KTtcbiAgICB9XG5dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQmxvY2tzQWRkQ3RybCgkc2NvcGUsIFV0aWxzLCBsYW5nQ29kZSwgQmxvY2tzUmVwb3NpdG9yeSwgQmxvY2tTZXJ2aWNlKSB7XG4gICAgJHNjb3BlLmNrT3B0aW9ucyA9IFV0aWxzLmNrT3B0aW9ucztcbiAgICAkc2NvcGUuaXNFZGl0ZWQgPSBmYWxzZTtcbiAgICAvLyBkZWZhdWx0IHZhbHVlc1xuICAgICRzY29wZS5uZXdCbG9jayA9IHtcbiAgICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgICAgIHdlaWdodDogMCxcbiAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICBsYW5nQ29kZTogbGFuZ0NvZGVcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBpZiBibG9jayB0eXBlcyBhcmUgc2V0XG4gICAgaWYgKHR5cGVvZiAkc2NvcGUuYmxvY2tUeXBlcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLm5ld0Jsb2NrLnR5cGUgPSAkc2NvcGUuYmxvY2tUeXBlc1swXTtcbiAgICB9XG5cbiAgICAvLyBpZiBibG9jayByZWdpb25zIGFyZSBzZXRcbiAgICBpZiAodHlwZW9mICRzY29wZS5ibG9ja1JlZ2lvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5uZXdCbG9jay5yZWdpb24gPSAkc2NvcGUuYmxvY2tSZWdpb25zWzBdO1xuICAgIH1cblxuICAgIC8vIGJsb2NrIFBPU1QgYWN0aW9uXG4gICAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbihuZXdCbG9jaykge1xuICAgICAgICBuZXdCbG9jayA9IEJsb2NrU2VydmljZS5wcmVwYXJlUmVxdWVzdERhdGEobmV3QmxvY2spO1xuICAgICAgICBCbG9ja3NSZXBvc2l0b3J5LmNyZWF0ZShuZXdCbG9jaykudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdCTE9DS19DUkVBVEVEJyk7XG4gICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2Jsb2Nrcy5saXN0Jywge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3IocmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cblxuQmxvY2tzQWRkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnbGFuZ0NvZGUnLCAnQmxvY2tzUmVwb3NpdG9yeScsICdCbG9ja1NlcnZpY2UnXTtcbm1vZHVsZS5leHBvcnRzID0gQmxvY2tzQWRkQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQmxvY2tzRWRpdEN0cmwoJHNjb3BlLCBVdGlscywgbGFuZ0NvZGUsIGJsb2NrLCBCbG9ja3NSZXBvc2l0b3J5LCBCbG9ja1NlcnZpY2UpIHtcbiAgICAkc2NvcGUuY2tPcHRpb25zID0gVXRpbHMuY2tPcHRpb25zO1xuICAgICRzY29wZS5pc0VkaXRlZCA9IHRydWU7XG4gICAgLy8gaWYgYmxvY2sgdHlwZXMgYXJlIHNldFxuICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5uZXdCbG9jayA9IEJsb2Nrc1JlcG9zaXRvcnkuY2xlYW4oYmxvY2spO1xuICAgICAgICAvLyBzZXQgYWN0aXZlIHRyYW5zbGF0aW9uXG4gICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLm5ld0Jsb2NrLnRyYW5zbGF0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICRzY29wZS5uZXdCbG9jay50cmFuc2xhdGlvbnMgPSBfLmZpbmQoJHNjb3BlLm5ld0Jsb2NrLnRyYW5zbGF0aW9ucywgeydsYW5nQ29kZSc6IGxhbmdDb2RlfSk7XG4gICAgICAgICAgICAvLyBpZiBub3QgZm91bmQsIHNldCBhcyBuZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLm5ld0Jsb2NrLnRyYW5zbGF0aW9ucyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmV3QmxvY2sudHJhbnNsYXRpb25zID0geydsYW5nQ29kZSc6IGxhbmdDb2RlfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNoZWNrIGZvciB0cmFuc2xhdGlvbnMgdXBkYXRlIEBUT0RPIHVzZSB0cmFuc2xhdGlvbnMgaGlzdG9yeVxuICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCduZXdCbG9jay50cmFuc2xhdGlvbnMnLCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgJHNjb3BlLmlzVHJhbnNsYXRpb25DaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gYmxvY2sgUFVUIGFjdGlvblxuICAgICRzY29wZS5zYXZlID0gZnVuY3Rpb24obmV3QmxvY2spIHtcbiAgICAgICAgbmV3QmxvY2sgPSBCbG9ja1NlcnZpY2UucHJlcGFyZVJlcXVlc3REYXRhKG5ld0Jsb2NrKTtcbiAgICAgICAgLy8gdXBkYXRlIGJsb2NrXG4gICAgICAgIEJsb2Nrc1JlcG9zaXRvcnkudXBkYXRlKFV0aWxzLiRzdGF0ZVBhcmFtcy5ibG9ja0lkLCBuZXdCbG9jaykudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgLy8gYWRkIG5ldyB0cmFuc2xhdGlvbiBAVE9ETyB1c2UgdHJhbnNsYXRpb25zIGhpc3RvcnlcbiAgICAgICAgICAgIGlmICgkc2NvcGUuaXNUcmFuc2xhdGlvbkNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBCbG9ja3NSZXBvc2l0b3J5LmNyZWF0ZVRyYW5zbGF0aW9uKFV0aWxzLiRzdGF0ZVBhcmFtcy5ibG9ja0lkLCBuZXdCbG9jay50cmFuc2xhdGlvbnMpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMucmVkaXJlY3RCYWNrKCdibG9ja3MubGlzdCcpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3JzKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnVEhFX0NIQU5HRVNfSEFWRV9CRUVOX1NBVkVEJyk7XG4gICAgICAgICAgICAgICAgVXRpbHMucmVkaXJlY3RCYWNrKCdibG9ja3MubGlzdCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZEVycm9yKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbkJsb2Nrc0VkaXRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdsYW5nQ29kZScsICdibG9jaycsICdCbG9ja3NSZXBvc2l0b3J5JywgJ0Jsb2NrU2VydmljZSddO1xubW9kdWxlLmV4cG9ydHMgPSBCbG9ja3NFZGl0Q3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQmxvY2tzTGlzdEN0cmwoJHNjb3BlLCBVdGlscywgTmdUYWJsZVBhcmFtcywgQmxvY2tzUmVwb3NpdG9yeSkge1xuICAgICRzY29wZS50YWJsZVBhcmFtcyA9IG5ldyBOZ1RhYmxlUGFyYW1zKHtcbiAgICAgICAgY291bnQ6IDI1LCAvLyBjb3VudCBwZXIgcGFnZVxuICAgICAgICBzb3J0aW5nOiB7XG4gICAgICAgICAgICAncmVnaW9uJzogJ2Rlc2MnLCAvLyBpbml0aWFsIHNvcnRpbmdcbiAgICAgICAgICAgICd3ZWlnaHQnOiAnYXNjJ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgICRzY29wZS5yZXF1ZXN0UGVuZGluZyA9IHRydWU7XG4gICAgICAgICAgICAvLyBwcmVwYXJlIG9wdGlvbnMgdG8gYmUgc2VudCB0byBhcGlcbiAgICAgICAgICAgIHZhciBxdWVyeU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbGFuZzogVXRpbHMuQ29uZmlnLmRlZmF1bHRMYW5nQ29kZWVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGxhbmcgc29ydCBvcHRpb25zXG4gICAgICAgICAgICBpZiAodHlwZW9mICRzY29wZS50cmFuc0xhbmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLmxhbmcgPSAkc2NvcGUudHJhbnNMYW5nLmNvZGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSAmJiB0eXBlb2YgJHNjb3BlLnRyYW5zTGFuZyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IGludGVyZXN0ZWQgaW4gZmlyc3Qgc29ydCBjb2x1bW4gZm9yIG5vd1xuICAgICAgICAgICAgICAgIHZhciBvcmRlckJ5ID0gcGFyYW1zLm9yZGVyQnkoKVswXTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMuc29ydCA9IG9yZGVyQnlbMF0gPT09ICcrJyA/IG9yZGVyQnkuc3Vic3RyaW5nKDEpIDogb3JkZXJCeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZ2V0IGxpc3QgYnkgZGVmYXVsdFxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBCbG9ja3NSZXBvc2l0b3J5Lmxpc3QocXVlcnlPcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gUHJvbWlzZSBpcyBhIFJFU1QgQW5ndWxhckpTIHNlcnZpY2UgdGhhdCB0YWxrcyB0byBhcGkgYW5kIHJldHVybiBwcm9taXNlXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVxdWVzdFBlbmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwYXJhbXMudG90YWwocmVzcG9uc2UubWV0YS50b3RhbCk7XG4gICAgICAgICAgICAgICAgJGRlZmVyLnJlc29sdmUoQmxvY2tzUmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5tZXRhID0gcmVzcG9uc2UubWV0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbkJsb2Nrc0xpc3RDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdOZ1RhYmxlUGFyYW1zJywgJ0Jsb2Nrc1JlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQmxvY2tzTGlzdEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJsb2Nrc0RlbGV0ZUN0cmwoJHNjb3BlLCBVdGlscywgQmxvY2tzUmVwb3NpdG9yeSwgJG1vZGFsKSB7XG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvYmxvY2tzL2RpcmVjdGl2ZXMvJztcbiAgICAvLyBEZWxldGUgbW9kYWxcbiAgICB2bS5kZWxldGVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdibG9ja0RlbGV0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBCaW5kIGhvdGtleXNcbiAgICAgICAgICAgIFV0aWxzLmhvdGtleXMuYWRkKHtcbiAgICAgICAgICAgICAgICBjb21ibzogJ2VudGVyJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogVXRpbHMuJGZpbHRlcigndHJhbnNsYXRlJykoXG4gICAgICAgICAgICAgICAgICAgIHZtLmZvcmNlRGVsZXRlID8gJ0NPTkZJUk1fREVMRVRFJyA6ICdDT05GSVJNX01PVkVfVE9fVFJBU0gnXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZGVsZXRlQ29udGVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBibG9ja0lkIGJsb2NrIGlkIHRvIGJlIHJlbW92ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKiBAcGFyYW0gZm9yY2VEZWxldGUgdXNlIGZvcmNlRGVsZXRlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKGJsb2NrSWQsIGZvcmNlRGVsZXRlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5ibG9ja0lkID0gYmxvY2tJZDtcbiAgICAgICAgICAgIHZtLmZvcmNlRGVsZXRlID0gZm9yY2VEZWxldGU7XG4gICAgICAgICAgICBpZiAodm0uZm9yY2VEZWxldGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnREVMRVRFX0JMT0NLX1FVRVNUSU9OJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdNT1ZFX0JMT0NLX1RPX1RSQVNIX1FVRVNUSU9OJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBVdGlscy5ob3RrZXlzLmRlbCgnZW50ZXInKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgYmxvY2sgaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGRlbGV0ZUJsb2NrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIC8vIFNvZnQgYW5kIGZvcmNlIGRlbGV0ZSBibG9jayBAVE9ETyBoYW5kbGUgc29mdCBkZWxldGVcbiAgICAgICAgICAgIEJsb2Nrc1JlcG9zaXRvcnkuZGVsZXRlKHZtLmJsb2NrSWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBCbG9ja3NSZXBvc2l0b3J5LmRlbGV0ZSh2bS5ibG9ja0lkLCB2bS5mb3JjZURlbGV0ZSkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKFV0aWxzLiRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5mb3JjZURlbGV0ZSA/ICdCTE9DS19IQVNfQkVFTl9ERUxFVEVEJyA6ICdCTE9DS19IQVNfQkVFTl9NT1ZFRF9UT19UUkFTSCdcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQmxvY2tzRGVsZXRlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnQmxvY2tzUmVwb3NpdG9yeScsICckbW9kYWwnXTtcbm1vZHVsZS5leHBvcnRzID0gQmxvY2tzRGVsZXRlQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQmxvY2tEZWxldGVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdCbG9ja3NEZWxldGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLC8vIGJlY2F1c2UgdGhlIHNjb3BlIGlzIGlzb2xhdGVkXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQmxvY2tzRGVsZXRlQ3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgZGVsZXRlIG1vZGFsIGZyb20gYSBjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgQmxvY2tzRGVsZXRlQ3RybC5kZWxldGVNb2RhbC5zaG93TW9kYWwoYXR0cnMuYmxvY2tJZCwgYXR0cnMuZm9yY2UgPT09ICd0cnVlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkJsb2NrRGVsZXRlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gQmxvY2tEZWxldGVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhZG1pbi5ibG9ja3MnLCBbXSlcbiAgICAuY29uZmlnKFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgICAgICdSZXN0YW5ndWxhclByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgUmVzdGFuZ3VsYXJQcm92aWRlcikge1xuXG4gICAgICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvYmxvY2tzLyc7XG5cbiAgICAgICAgICAgIC8vIE5vdyBzZXQgdXAgdGhlIHN0YXRlc1xuICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2Jsb2NrcycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2Jsb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdpbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIEJMT0NLIExJU1RcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2Jsb2Nrcy5saXN0Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvbGlzdD9wYWdlJnBlclBhZ2UnLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2xpc3QuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0Jsb2Nrc0xpc3RDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIEJMT0NLIEFERFxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnYmxvY2tzLmFkZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2FkZC97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdmb3JtLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdCbG9ja3NBZGRDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYW5nQ29kZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24oJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy5sYW5nQ29kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIEJMT0NLIEVESVRcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2Jsb2Nrcy5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2Jsb2NrSWR9L2VkaXQve2xhbmdDb2RlfScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZm9ybS5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQmxvY2tzRWRpdEN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhbmdDb2RlOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsICckc3RhdGVQYXJhbXMnLCBmdW5jdGlvbigkc3RhdGUsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHN0YXRlUGFyYW1zLmxhbmdDb2RlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBibG9jazogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnQmxvY2tzUmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgQmxvY2tzUmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQmxvY2tzUmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLmJsb2NrSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSlcbiAgICAuY29udHJvbGxlcignQmxvY2tzTGlzdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0Jsb2Nrc0xpc3RDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0Jsb2Nrc0FkZEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0Jsb2Nrc0FkZEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQmxvY2tzRWRpdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0Jsb2Nrc0VkaXRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0Jsb2Nrc0RlbGV0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQmxvY2tzRGVsZXRlQ3RybCcpKVxuICAgIC5zZXJ2aWNlKCdCbG9ja1NlcnZpY2UnLCByZXF1aXJlKCcuL3NlcnZpY2VzL0Jsb2NrU2VydmljZS5qcycpKVxuICAgIC5mYWN0b3J5KCdCbG9ja3NSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9CbG9ja3NSZXBvc2l0b3J5LmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnYmxvY2tEZWxldGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQmxvY2tEZWxldGVCdXR0b24uanMnKSlcbiAgICAucnVuKFtcbiAgICAgICAgJ05hdkJhcicsXG4gICAgICAgIGZ1bmN0aW9uKE5hdkJhcikge1xuICAgICAgICAgICAgTmF2QmFyLmFkZCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICdCTE9DS1MnLCBhY3Rpb246ICdibG9ja3MubGlzdCcsIGljb246ICdmYSBmYS10aC1sYXJnZSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJsb2NrU2VydmljZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBwcmVwYXJlUmVxdWVzdERhdGE6IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgICAgICAgICAvLyBoYW5kbGUgYmxvY2sgZmlsdGVyXG4gICAgICAgICAgICBpZiAoYmxvY2suZmlsdGVyICE9PSBudWxsICYmIHR5cGVvZiBibG9jay5maWx0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IGVtcHR5IGZpbHRlciB2YWx1ZXMgaWYgbm90IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICghKCcrJyBpbiBibG9jay5maWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrLmZpbHRlclsnKyddID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghKCctJyBpbiBibG9jay5maWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrLmZpbHRlclsnLSddID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBlbXB0eSBibG9jayBmaWx0ZXJcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2suZmlsdGVyWycrJ10ubGVuZ3RoID09PSAwICYmIGJsb2NrLmZpbHRlclsnLSddLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBibG9jay5maWx0ZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBibG9jaztcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkJsb2NrU2VydmljZS4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrU2VydmljZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQmxvY2tzUmVwb3NpdG9yeShSZXN0YW5ndWxhcikge1xuICAgIHZhciBhcGkgPSAnYWRtaW4vYmxvY2tzJztcbiAgICB2YXIgYmxvY2tzID0gUmVzdGFuZ3VsYXIuYWxsKGFwaSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmdldChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0OiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBibG9ja3MuZ2V0TGlzdChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0Rm9yQ29udGVudDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpICsgJy9jb250ZW50JywgaWQpLmdldExpc3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYW46IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5zdHJpcFJlc3Rhbmd1bGFyKGVsZW0pO1xuICAgICAgICB9LFxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKG5ld0NvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBibG9ja3MucG9zdChuZXdDb250ZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlOiBmdW5jdGlvbihpZCwgZm9yY2VEZWxldGUpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkucmVtb3ZlKHtmb3JjZTogZm9yY2VEZWxldGV9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbihjYXRlZ29yeUtleSwgZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGNhdGVnb3J5S2V5KS5jdXN0b21QVVQoZGF0YSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNyZWF0ZVRyYW5zbGF0aW9uOiBmdW5jdGlvbihpZCwgbmV3VHJhbnNsYXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuYWxsKCd0cmFuc2xhdGlvbnMnKS5wb3N0KG5ld1RyYW5zbGF0aW9uKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkJsb2Nrc1JlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gQmxvY2tzUmVwb3NpdG9yeTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEFkZEN0cmwoJHNjb3BlLCBVdGlscywgbGlzdFBhcmVudCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgcGFyZW50SWQgPSBudWxsO1xuICAgICRzY29wZS5jb250ZW50VHlwZSA9IFV0aWxzLiRzdGF0ZVBhcmFtcy50eXBlO1xuXG4gICAgJHNjb3BlLmNrT3B0aW9ucyA9IFV0aWxzLmNrT3B0aW9ucztcblxuICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5saXN0UGFyZW50ID0gbGlzdFBhcmVudDsgLy8gc2VsZWN0ZWQgY2F0ZWdvcnlcbiAgICAgICAgcGFyZW50SWQgPSBsaXN0UGFyZW50LmlkO1xuICAgIH1cbiAgICAvLyBkZWZhdWx0IHRyYW5zbGF0aW9ucyBsYW5nIGNvZGVcbiAgICAkc2NvcGUubmV3Q29udGVudCA9IHtcbiAgICAgICAgdHlwZTogVXRpbHMuJHN0YXRlUGFyYW1zLnR5cGUsXG4gICAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgICAgICB0cmFuc2xhdGlvbnM6IHtcbiAgICAgICAgICAgIGxhbmdDb2RlOiAkc2NvcGUudHJhbnNMYW5nLmNvZGVcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBBbmd1bGFyIHN0cmFwIGRyb3Bkb3duIGZvciBzYXZlIGJ1dHRvblxuICAgICRzY29wZS5jb250ZW50U2F2ZUJ1dHRvbkxpbmtzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiAnU0FWRV9BTkRfQ09OVElOVUVfRURJVElORycsXG4gICAgICAgICAgICBjbGljazogJ2FkZE5ld0NvbnRlbnQobmV3Q29udGVudCwgXCJjb250ZW50LmVkaXQuZGV0YWlsc1wiKSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ1NBVkVfQU5EX0FERF9BTk9USEVSJyxcbiAgICAgICAgICAgIGNsaWNrOiAnYWRkTmV3Q29udGVudChuZXdDb250ZW50LCBcImNvbnRlbnQuYWRkXCIpJ1xuICAgICAgICB9XG4gICAgXTtcblxuICAgIC8vIGNvbnRlbnRzIFBPU1QgYWN0aW9uXG4gICAgJHNjb3BlLmFkZE5ld0NvbnRlbnQgPSBmdW5jdGlvbiBhZGROZXdDb250ZW50KG5ld0NvbnRlbnQsIHJlZGlyZWN0KSB7XG4gICAgICAgIG5ld0NvbnRlbnQucGFyZW50SWQgPSBwYXJlbnRJZDsgLy8gc2V0IHBhcmVudCBjYXRlZ29yeSBhcyBudWxsXG4gICAgICAgIG5ld0NvbnRlbnQucHVibGlzaGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTkpLnJlcGxhY2UoJ1QnLCAnICcpOyAvLyBzZXQgcHVibGlzaCBhdCBkYXRlXG4gICAgICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICAgICAgaWYgKHR5cGVvZiAkc2NvcGUubGlzdFBhcmVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGZvciByb3V0ZSB0cmFuc2xhdGlvbiBpbiBzZWxlY3RlZCBsYW5ndWFnZVxuICAgICAgICAgICAgdmFyIHJvdXRlID0gXy5tYXAoXy5maWx0ZXIoJHNjb3BlLmxpc3RQYXJlbnQucm91dGUudHJhbnNsYXRpb25zLCB7bGFuZ0NvZGU6IG5ld0NvbnRlbnQudHJhbnNsYXRpb25zLmxhbmdDb2RlfSksICd1cmwnKTtcbiAgICAgICAgICAgIGlmICghcm91dGUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbmV3Q29udGVudC5wYXJlbnRJZCA9IG51bGw7IC8vIGlmIG5vdCBmb3VuZCBzZXQgYXMgdW5jYXRlZ29yaXplZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIENvbnRlbnRSZXBvc2l0b3J5Lm5ld0NvbnRlbnQobmV3Q29udGVudCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBVdGlscy4kc3RhdGVQYXJhbXMudHlwZSA9PT0gJ2NhdGVnb3J5JyA/ICdDQVRFR09SWV9DUkVBVEVEJyA6ICdDT05URU5UX0NSRUFURUQnO1xuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKG1lc3NhZ2UpO1xuICAgICAgICAgICAgLy8gd2hlbiB0aGVyZSBpcyBjdXN0b20gcmVkaXJlY3RcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVkaXJlY3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IChyZWRpcmVjdCA9PT0gJ2NvbnRlbnQuZWRpdC5kZXRhaWxzJykgPyB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRJZDogcmVzcG9uc2UuaWQsXG4gICAgICAgICAgICAgICAgICAgIGxhbmdDb2RlOiBuZXdDb250ZW50LnRyYW5zbGF0aW9ucy5sYW5nQ29kZVxuICAgICAgICAgICAgICAgIH0gOiB7dHlwZTogVXRpbHMuJHN0YXRlUGFyYW1zLnR5cGV9O1xuXG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKHJlZGlyZWN0LCBwYXJhbXMsIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKFV0aWxzLiRzdGF0ZVBhcmFtcy50eXBlID09PSAnY2F0ZWdvcnknKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gY3JlYXRlIGEgY2F0ZWdvcnkgdGhlbiBzZXQgaXQgYXMgYSBuZXcgbGlzdFBhcmVudCBvbiBjb250ZW50IGxpc3RcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50Lmxpc3QnLCB7Y29udGVudElkOiByZXNwb25zZS5pZH0sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgZ28gdG8gbGlzdCB3aXRob3V0IG5ldyBsaXN0UGFyZW50XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbygnY29udGVudC5saXN0Jywge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5Db250ZW50QWRkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnbGlzdFBhcmVudCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50QWRkQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybCgkc2NvcGUsICR0cmFuc2xhdGUsIFV0aWxzLCBjb250ZW50LCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICRzY29wZS5ja09wdGlvbnMgPSBVdGlscy5ja09wdGlvbnM7XG4gICAgJHNjb3BlLmlzTG9hZGVkID0gdHJ1ZTsgLy8gZm9ybSB2aXNpYmlsaXR5XG5cbiAgICAvLyBkZWZhdWx0IHRyYW5zbGF0aW9ucyBsYW5nIGNvZGVcbiAgICAkc2NvcGUubmV3Q29udGVudFRyYW5zbGF0aW9uID0ge1xuICAgICAgICBjb250ZW50SWQ6IFV0aWxzLiRzdGF0ZVBhcmFtcy5jb250ZW50SWQsXG4gICAgICAgIGxhbmdDb2RlOiBVdGlscy4kc3RhdGVQYXJhbXMubGFuZ0NvZGVcbiAgICB9O1xuXG4gICAgLy8gaWYgcGFyZW50IGNhdGVnb3J5IGV4aXN0c1xuICAgIGlmIChjb250ZW50LnBhcmVudElkICE9PSBudWxsKSB7XG4gICAgICAgICRzY29wZS5pc0xvYWRlZCA9IGZhbHNlOyAvLyBoaWRlIGZvcm1cbiAgICAgICAgLy8gZ2V0IHBhcmVudCBjYXRlZ29yeVxuICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5vbmUoY29udGVudC5wYXJlbnRJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IENvbnRlbnRSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIC8vIGNoZWNrIGZvciByb3V0ZSB0cmFuc2xhdGlvbiBpbiBzZWxlY3RlZCBsYW5ndWFnZVxuICAgICAgICAgICAgdmFyIHJvdXRlID0gXy5tYXAoXy5maWx0ZXIocGFyZW50LnJvdXRlLnRyYW5zbGF0aW9ucywge2xhbmdDb2RlOiAkc2NvcGUubmV3Q29udGVudFRyYW5zbGF0aW9uLmxhbmdDb2RlfSksICd1cmwnKTtcbiAgICAgICAgICAgIGlmICghcm91dGUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdXNlciB0byBwcmV2aW91cyBzdGF0ZSBvciBjb250ZW50IGxpc3RcbiAgICAgICAgICAgICAgICBVdGlscy5yZWRpcmVjdEJhY2soJ2NvbnRlbnQubGlzdCcpO1xuICAgICAgICAgICAgICAgIC8vIFwiQmVmb3JlIGFkZGluZyB0cmFuc2xhdGlvbnMgdG8gdGhpcyBjb250ZW50LCB5b3UgbmVlZCB0byB0cmFuc2xhdGUgdGhlIGNhdGVnb3JpZXMgaW4gd2hpY2ggaXQgaXMgbG9jYXRlZCFcIlxuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkSW5mbygnTk9fUEFSRU5UX1RSQU5TTEFUSU9OX0VSUk9SJywgeyBjb250ZW50VHlwZTogJHRyYW5zbGF0ZS5pbnN0YW50KGNvbnRlbnQudHlwZS50b1VwcGVyQ2FzZSgpKS50b0xvd2VyQ2FzZSgpIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBwYXJlbnQgdXJsIGlzIHRyYW5zbGF0ZWQsIHNob3cgZm9ybVxuICAgICAgICAgICAgICAgICRzY29wZS5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGNvbnRlbnRzIFBPU1QgYWN0aW9uXG4gICAgJHNjb3BlLmFkZE5ld0NvbnRlbnRUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5uZXdDb250ZW50VHJhbnNsYXRpb24oVXRpbHMuJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCwgJHNjb3BlLm5ld0NvbnRlbnRUcmFuc2xhdGlvbikudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgLy8gUmVkaXJlY3QgdXNlciB0byBwcmV2aW91cyBzdGF0ZSBvciBjb250ZW50IGxpc3RcbiAgICAgICAgICAgIFV0aWxzLnJlZGlyZWN0QmFjaygnY29udGVudC5saXN0Jyk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5Db250ZW50QWRkVHJhbnNsYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckdHJhbnNsYXRlJywgJ1V0aWxzJywgJ2NvbnRlbnQnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEJsb2Nrc0N0cmwoJHNjb3BlLCBVdGlscywgYmxvY2tzLCBCbG9ja3NSZXBvc2l0b3J5KSB7XG4gICAgLy8gaWYgdGhlcmUgYXJlIGJsb2NrcyBhdmFpbGFibGVcbiAgICBpZiAodHlwZW9mIGJsb2NrcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmJsb2NrcyA9IF8uZ3JvdXBCeShCbG9ja3NSZXBvc2l0b3J5LmNsZWFuKGJsb2NrcyksICdyZWdpb24nKTtcbiAgICB9XG4gICAgLy8gdmlzaWJpbGl0eSBzZXR0aW5nc1xuICAgICRzY29wZS5zaG93Qm9keSA9IHRydWU7IC8vIHNob3cgYWxsIGJsb2NrcyBib2R5IGJ5IGRlZmF1bHRcbiAgICAkc2NvcGUuc2hvd1JlZ2lvbiA9IHRydWU7IC8vIHNob3cgYWxsIHJlZ2lvbnMgYnkgZGVmYXVsdFxuXG59XG5cbkNvbnRlbnRCbG9ja3NDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdibG9ja3MnLCAnQmxvY2tzUmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50QmxvY2tzQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudENhdGVnb3J5VHJlZUN0cmwoJHNjb3BlLCBjYXRlZ29yaWVzLCBvcGVuQ2F0ZWdvcmllcywgbGlzdFBhcmVudCwgVXRpbHMpIHtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiByZXR1cm5zIHJvb3QgaWQgZnJvbSBwcm92aWRlZCBwYXRoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGF0aCB0byBzZWFyY2ggb3ZlclxuICAgICAqXG4gICAgICogQHJldHVybnMge2ludH0gcm9vdCBpZFxuICAgICAqIEB0aHJvd3MgRXJyb3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRSb290SWRGcm9tUGF0aChwYXRoKSB7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBwYXRoWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlIHBhdGggaXMgdG9vIHNob3J0IScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gcmV0dXJucyBzcGVjaWZpZWQgbm9kZSBmb3JtIHByb3ZpZGVkIGNvbGxlY3Rpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb2xsZWN0aW9uIHRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3ZlclxuICAgICAqIEBwYXJhbSBpZCAgbm9kZSBpZFxuICAgICAqXG4gICAgICogQHJldHVybnMge29iamVjdH0gcmV0dXJucyB0aGUgZm91bmQgZWxlbWVudCwgZWxzZSB1bmRlZmluZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXROb2RlQnlJZChjb2xsZWN0aW9uLCBpZCkge1xuICAgICAgICByZXR1cm4gXy5maW5kKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcnkuaWQgPT09IGlkO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBpZiB0aGVyZSBhcmUgb3BlbiBjYXRlZ29yaWVzIGluIHRoZSBVdGlscy5TdG9yYWdlXG4gICAgaWYgKHR5cGVvZiBvcGVuQ2F0ZWdvcmllcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzID0gb3BlbkNhdGVnb3JpZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzID0gW107XG4gICAgfVxuXG4gICAgLy8gaWYgY2F0ZWdvcmllcyB0cmVlIGV4aXN0c1xuICAgIGlmICh0eXBlb2YgY2F0ZWdvcmllcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzO1xuICAgIH1cblxuICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5hY3RpdmVOb2RlID0gbGlzdFBhcmVudC5pZDtcblxuICAgICAgICAvLyBtZXJnZSBvcGVuIGNhdGVnb3JpZXMgd2l0aCBhY3RpdmUgY2F0ZWdvcnkgcGF0aFxuICAgICAgICAkc2NvcGUub3BlbkNhdGVnb3JpZXMgPSBfLnVuaW9uKCRzY29wZS5vcGVuQ2F0ZWdvcmllcywgbGlzdFBhcmVudC5wYXRoKTtcbiAgICAgICAgJHNjb3BlLnJvb3QgPSBnZXROb2RlQnlJZCgkc2NvcGUuY2F0ZWdvcmllcywgZ2V0Um9vdElkRnJvbVBhdGgobGlzdFBhcmVudC5wYXRoKSk7XG4gICAgICAgIC8vIHNhdmUgb3BlbiBjYXRlZ29yaWVzIGluIHRoZSBzdG9yZVxuICAgICAgICBVdGlscy5TdG9yYWdlLnNldFN0b3JhZ2VJdGVtKHtvcGVuQ2F0ZWdvcmllczogJHNjb3BlLm9wZW5DYXRlZ29yaWVzfSk7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlcyBsaXN0UGFyZW50IGlkIGZyb20gVXRpbHMuU3RvcmFnZVxuICAgICRzY29wZS51bmNhdGVnb3JpemVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIFV0aWxzLlN0b3JhZ2UucmVtb3ZlU3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50Jyk7XG4gICAgfTtcblxuICAgIC8vIHRvZ2dsZXMgTm9kZSBpbiBjYXRlZ29yaWVzIHRyZWUgYW5kIG1hbmFnZSBVdGlscy5TdG9yYWdlIG9wZW4gY2F0ZWdvcmllcyBvYmplY3RcbiAgICAkc2NvcGUudG9nZ2xlTm9kZSA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLnRvZ2dsZSgpO1xuICAgICAgICB2YXIgbm9kZUlkID0gXy5wYXJzZUludChzY29wZS4kZWxlbWVudFswXS5pZCwgMTApO1xuICAgICAgICAvLyBpZiBub2RlIGlzIG9wZW5cbiAgICAgICAgaWYgKCFzY29wZS5jb2xsYXBzZWQpIHtcbiAgICAgICAgICAgIC8vIGFkZCB0byBzY29wZVxuICAgICAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzLnB1c2gobm9kZUlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBmcm9tIHNjb3BlXG4gICAgICAgICAgICAkc2NvcGUub3BlbkNhdGVnb3JpZXMgPSBfLndpdGhvdXQoJHNjb3BlLm9wZW5DYXRlZ29yaWVzLCBub2RlSWQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNhdmUgaW4gdGhlIHN0b3JlXG4gICAgICAgIFV0aWxzLlN0b3JhZ2Uuc2V0U3RvcmFnZUl0ZW0oe29wZW5DYXRlZ29yaWVzOiAkc2NvcGUub3BlbkNhdGVnb3JpZXN9KTtcbiAgICB9O1xuXG59XG5Db250ZW50Q2F0ZWdvcnlUcmVlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnY2F0ZWdvcmllcycsICdvcGVuQ2F0ZWdvcmllcycsICdsaXN0UGFyZW50JywgJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRDYXRlZ29yeVRyZWVDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGFzaGJvYXJkQ3RybCgkc2NvcGUpIHtcblxufVxuQ29udGVudERhc2hib2FyZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREYXNoYm9hcmRDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGV0YWlsc0N0cmwoJHNjb3BlLCBjb250ZW50LCBsYW5nQ29kZSwgQ29udGVudFJlcG9zaXRvcnksIFV0aWxzKSB7XG5cbiAgICAkc2NvcGUuQ29uZmlnID0gVXRpbHMuQ29uZmlnO1xuXG4gICAgLy8gVE9ETzogZ2V0IHJlZ2lzdGVyZWQgdGFic1xuICAgICRzY29wZS50YWJzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0NPTlRFTlQnLFxuICAgICAgICAgICAgYWN0aW9uOiAnZGV0YWlscycsXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlIC8vIGRlZmF1bHQgYWN0aXZlIHRhYiBpbiBzZXR0aW5ncyBlZGl0IG1vZGVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdISVNUT1JZX09GX0NIQU5HRVMnLFxuICAgICAgICAgICAgYWN0aW9uOiAnaGlzdG9yeSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdCTE9DS1MnLFxuICAgICAgICAgICAgYWN0aW9uOiAnYmxvY2tzJ1xuICAgICAgICB9XG4gICAgXTtcblxuICAgIC8vIGlmIGxhbmcgY29kZSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxhbmdDb2RlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubGFuZ0NvZGUgPSBsYW5nQ29kZTtcbiAgICB9XG5cbiAgICAvLyBpZiBjb250ZW50IGV4aXN0c1xuICAgIGlmICh0eXBlb2YgY29udGVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBDb250ZW50UmVwb3NpdG9yeS5jbGVhbihjb250ZW50KTtcbiAgICAgICAgLy8gaWYgY29udGVudCBwYXJlbnQgZXhpc3RzXG4gICAgICAgIGlmIChjb250ZW50LnBhdGgubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgLy8gdGhlIGxhc3QgYnV0IG9uZSBpZCBudW1iZXIgZnJvbSBwYXRoXG4gICAgICAgICAgICB2YXIgcGFyZW50SWQgPSBfLnRha2VSaWdodChjb250ZW50LnBhdGgsIDIpWzBdO1xuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkub25lKHBhcmVudElkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbnRlbnRQYXJlbnQgPSBDb250ZW50UmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS5zYXZlQ29udGVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBDb250ZW50UmVwb3NpdG9yeVxuICAgICAgICAgICAgLnVwZGF0ZUNvbnRlbnQoJHNjb3BlLmNvbnRlbnQuaWQsICRzY29wZS5jb250ZW50KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbn1cbkNvbnRlbnREZXRhaWxzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnY29udGVudCcsICdsYW5nQ29kZScsICdDb250ZW50UmVwb3NpdG9yeScsICdVdGlscyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RGV0YWlsc0N0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgQ29udGVudERldGFpbHNFZGl0Q3RybFxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnREZXRhaWxzRWRpdEN0cmwoJHNjb3BlLCBVdGlscywgY29udGVudCwgbGFuZ0NvZGUsIENvbnRlbnRSZXBvc2l0b3J5KSB7IC8vanNoaW50IGlnbm9yZTpsaW5lXG5cbiAgICAvKipcbiAgICAgKiBDS0VkaXRvciBzZXR0aW5ncyBnZXR0ZXJcbiAgICAgKi9cbiAgICAkc2NvcGUuY2tPcHRpb25zID0gVXRpbHMuY2tPcHRpb25zO1xuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSBhY3RpdmUgdHJhbnNsYXRpb24gb2JqZWN0XG4gICAgICpcbiAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgKi9cbiAgICAkc2NvcGUuYWN0aXZlVHJhbnNsYXRpb24gPSBVdGlscy5nZXRUcmFuc2xhdGlvbkJ5TGFuZygoY29udGVudC50cmFuc2xhdGlvbnMuc2xpY2UoMCkpLCBsYW5nQ29kZSk7XG5cbiAgICAvKipcbiAgICAgKiBzYXZlIGN1cnJlbnQgYWN0aXZlIHRyYW5zbGF0aW9uIGFzIG5ldyBhY3RpdmUgdHJhbnNsYXRpb25cbiAgICAgKiBhbmQgZ28gYmFjayB0byBkZXRhaWxzIHNob3cgc3RhdGVcbiAgICAgKi9cbiAgICAkc2NvcGUuc2F2ZVRyYW5zbGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIENvbnRlbnRSZXBvc2l0b3J5Lm5ld0NvbnRlbnRUcmFuc2xhdGlvbihjb250ZW50LmlkLCAkc2NvcGUuYWN0aXZlVHJhbnNsYXRpb24pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2NvbnRlbnQuc2hvdy5kZXRhaWxzJywge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRJZDogY29udGVudC5pZCxcbiAgICAgICAgICAgICAgICBsYW5nQ29kZTogbGFuZ0NvZGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufVxuQ29udGVudERldGFpbHNFZGl0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnY29udGVudCcsICdsYW5nQ29kZScsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RGV0YWlsc0VkaXRDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIENvbnRlbnRIaXN0b3J5Q3RybFxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRIaXN0b3J5Q3RybCgkc2NvcGUsIFV0aWxzLCBjb250ZW50LCBsYW5nQ29kZSwgQ29udGVudFJlcG9zaXRvcnksIE5nVGFibGVQYXJhbXMpIHsgLy9qc2hpbnQgaWdub3JlOmxpbmVcbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ2NyZWF0ZWRBdCc6ICdkZXNjJyAvLyBpbml0aWFsIHNvcnRpbmdcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAgdG90YWw6IDAsIC8vIGxlbmd0aCBvZiBkYXRhXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCRkZWZlciwgcGFyYW1zKSB7XG4gICAgICAgICAgICAvLyBwcmVwYXJlIG9wdGlvbnMgdG8gYmUgc2VudCB0byBhcGlcbiAgICAgICAgICAgIHZhciBxdWVyeU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbGFuZ0NvZGU6IGxhbmdDb2RlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBwYXJhbXMuY291bnQoKSAtIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSBkZWNsYXJlZCBpbiB2aWV3XG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5jb3VudChVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBlclBhZ2UgPSBwYXJhbXMuY291bnQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyYW1zLnBhZ2UoKSAtIGN1cnJlbnQgcGFnZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucGFnZShVdGlscy4kc3RhdGVQYXJhbXMucGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBhZ2UgPSBwYXJhbXMucGFnZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0YWJsZVBhcmFtcy5vcmRlckJ5KCkgLSBhbiBhcnJheSBvZiBzdHJpbmcgaW5kaWNhdGluZyBib3RoIHRoZSBzb3J0aW5nIGNvbHVtbiBhbmQgZGlyZWN0aW9uIChlLmcuIFtcIituYW1lXCIsIFwiLWVtYWlsXCJdKVxuICAgICAgICAgICAgaWYgKHBhcmFtcy5zb3J0aW5nKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IGludGVyZXN0ZWQgaW4gZmlyc3Qgc29ydCBjb2x1bW4gZm9yIG5vd1xuICAgICAgICAgICAgICAgIHZhciBvcmRlckJ5ID0gcGFyYW1zLm9yZGVyQnkoKVswXTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMuc29ydCA9IG9yZGVyQnlbMF0gPT09ICcrJyA/IG9yZGVyQnkuc3Vic3RyaW5nKDEpIDogb3JkZXJCeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZ2V0IGxpc3QgYnkgZGVmYXVsdFxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBDb250ZW50UmVwb3NpdG9yeS50cmFuc2xhdGlvbnMoY29udGVudC5pZCwgcXVlcnlPcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gQ29udGVudHMgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKENvbnRlbnRSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuQ29udGVudEhpc3RvcnlDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdjb250ZW50JywgJ2xhbmdDb2RlJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgJ25nVGFibGVQYXJhbXMnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudEhpc3RvcnlDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50TGlzdEN0cmwoJHNjb3BlLCBVdGlscywgbGlzdFBhcmVudCwgQ29udGVudFJlcG9zaXRvcnksIE5nVGFibGVQYXJhbXMpIHtcbiAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBsaXN0UGFyZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubGlzdFBhcmVudCA9IGxpc3RQYXJlbnQ7IC8vIHNlbGVjdGVkIGNhdGVnb3J5XG4gICAgfVxuXG4gICAgLy8gVE9ETzogY29udGVudCBhZGQgYnV0dG9uIGxpbmtzXG4gICAgJHNjb3BlLmNvbnRlbnRBZGRCdXR0b25MaW5rcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ0FERF9DT05URU5UJyxcbiAgICAgICAgICAgIGhyZWY6ICdjb250ZW50LmFkZCh7IHR5cGU6IFwiY29udGVudFwiIH0pJyxcbiAgICAgICAgICAgIGljb246ICdmYSBmYS1maWxlLXRleHQtbydcblxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiAnQUREX0NBVEVHT1JZJyxcbiAgICAgICAgICAgIGhyZWY6ICdjb250ZW50LmFkZCh7IHR5cGU6IFwiY2F0ZWdvcnlcIiB9KScsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtZm9sZGVyLW8nXG4gICAgICAgIH1cbiAgICBdO1xuXG4gICAgLy8gVE9ETzogY29udGVudCBsaXN0IGFjdGlvbnNcbiAgICAkc2NvcGUuY29udGVudExpc3RBY3Rpb25zID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiAnVklFVycsXG4gICAgICAgICAgICB1cmw6ICdwdWJsaWNVcmwnLCAvLyB0aGlzIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCBjb250ZW50IHB1YmxpYyB1cmxcbiAgICAgICAgICAgIGljb246ICdmYSBmYS1zZWFyY2gnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdFRElUJyxcbiAgICAgICAgICAgIGhyZWY6ICdjb250ZW50LnNob3coeyBjb250ZW50SWQ6IHJlY29yZF9pZCwgbGFuZ0NvZGU6IGxhbmdfY29kZSB9KScsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtcGVuY2lsJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiAnTU9WRV9UT19UUkFTSCcsXG4gICAgICAgICAgICBjbGljazogJ2RlbGV0ZScsIC8vIHRoaXMgd2lsbCBiZSByZXBsYWNlZCB3aXRoIGRlbGV0ZSBhY3Rpb25cbiAgICAgICAgICAgIGljb246ICdmYSBmYS10aW1lcydcbiAgICAgICAgfVxuICAgIF07XG5cbiAgICAvLyBCaW5kIGhvdGtleXNcbiAgICBVdGlscy5ob3RrZXlzLmFkZCh7XG4gICAgICAgIGNvbWJvOiAnY3RybCthbHQrbicsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBVdGlscy4kZmlsdGVyKCd0cmFuc2xhdGUnKSgnQUREX0NPTlRFTlQnKSxcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2NvbnRlbnQuYWRkJywge3R5cGU6ICdjb250ZW50J30pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBVdGlscy5ob3RrZXlzLmFkZCh7XG4gICAgICAgIGNvbWJvOiAnY3RybCthbHQrbScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBVdGlscy4kZmlsdGVyKCd0cmFuc2xhdGUnKSgnQUREX0NBVEVHT1JZJyksXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50LmFkZCcsIHt0eXBlOiAnY2F0ZWdvcnknfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vICBuZ1RhYmxlIGNvbmZpZ3VyYXRpb25cbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ3RyYW5zbGF0aW9ucy50aXRsZSc6ICdhc2MnIC8vIGluaXRpYWwgc29ydGluZ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgICRzY29wZS5yZXF1ZXN0UGVuZGluZyA9IHRydWU7XG4gICAgICAgICAgICAvLyBwcmVwYXJlIG9wdGlvbnMgdG8gYmUgc2VudCB0byBhcGlcbiAgICAgICAgICAgIHZhciBxdWVyeU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbGFuZzogJHNjb3BlLnRyYW5zTGFuZy5jb2RlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdjb250ZW50J1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gcGFyYW1zLmNvdW50KCkgLSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgZGVjbGFyZWQgaW4gdmlld1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuY291bnQoVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wZXJQYWdlID0gcGFyYW1zLmNvdW50KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5wYWdlKCkgLSBjdXJyZW50IHBhZ2VcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnBhZ2UoVXRpbHMuJHN0YXRlUGFyYW1zLnBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wYWdlID0gcGFyYW1zLnBhZ2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGFibGVQYXJhbXMub3JkZXJCeSgpIC0gYW4gYXJyYXkgb2Ygc3RyaW5nIGluZGljYXRpbmcgYm90aCB0aGUgc29ydGluZyBjb2x1bW4gYW5kIGRpcmVjdGlvbiAoZS5nLiBbXCIrbmFtZVwiLCBcIi1lbWFpbFwiXSlcbiAgICAgICAgICAgIGlmIChwYXJhbXMuc29ydGluZygpKSB7XG4gICAgICAgICAgICAgICAgLy8gb25seSBpbnRlcmVzdGVkIGluIGZpcnN0IHNvcnQgY29sdW1uIGZvciBub3dcbiAgICAgICAgICAgICAgICB2YXIgb3JkZXJCeSA9IHBhcmFtcy5vcmRlckJ5KClbMF07XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnNvcnQgPSBvcmRlckJ5WzBdID09PSAnKycgPyBvcmRlckJ5LnN1YnN0cmluZygxKSA6IG9yZGVyQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFV0aWxzLiRzdGF0ZVBhcmFtcyAtIGZpbHRlcnMgd2l0aG91dCBjb250ZW50SWRcbiAgICAgICAgICAgIHZhciBmaWx0ZXJzID0gXy5vbWl0KFV0aWxzLiRzdGF0ZVBhcmFtcywgJ2NvbnRlbnRJZCcpO1xuICAgICAgICAgICAgcXVlcnlPcHRpb25zID0gXy5tZXJnZShxdWVyeU9wdGlvbnMsIGZpbHRlcnMpO1xuICAgICAgICAgICAgJHNjb3BlLmFjdGl2ZUZpbHRlciA9IGZpbHRlcnM7XG5cbiAgICAgICAgICAgIC8vIGxpc3QgcHJvbWlzZVxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSB7fTtcblxuICAgICAgICAgICAgLy8gaWYgcGFyZW50IGNhdGVnb3J5IGlzIG5vdCBzZWxlY3RlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaXN0UGFyZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIC8vIGdldCB1bmNhdGVnb3JpemVkXG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLmxldmVsID0gMDtcbiAgICAgICAgICAgICAgICBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkubGlzdChxdWVyeU9wdGlvbnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgY2hpbGRyZW4nc1xuICAgICAgICAgICAgICAgIHByb21pc2UgPSBDb250ZW50UmVwb3NpdG9yeS5jaGlsZHJlbihsaXN0UGFyZW50LmlkLCBxdWVyeU9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm9taXNlIGlzIGEgUkVTVCBBbmd1bGFySlMgc2VydmljZSB0aGF0IHRhbGtzIHRvIGFwaSBhbmQgcmV0dXJuIHByb21pc2VcbiAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXF1ZXN0UGVuZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHBhcmFtcy50b3RhbChyZXNwb25zZS5tZXRhLnRvdGFsKTtcbiAgICAgICAgICAgICAgICAkZGVmZXIucmVzb2x2ZShDb250ZW50UmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5tZXRhID0gcmVzcG9uc2UubWV0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5Db250ZW50TGlzdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ2xpc3RQYXJlbnQnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnbmdUYWJsZVBhcmFtcyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50TGlzdEN0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50VHJhc2hjYW5DdHJsKCRzY29wZSwgQ29udGVudFJlcG9zaXRvcnksIE5nVGFibGVQYXJhbXMsIFV0aWxzKSB7XG4gICAgJHNjb3BlLnRhYmxlUGFyYW1zID0gbmV3IE5nVGFibGVQYXJhbXMoe1xuICAgICAgICBjb3VudDogMjUsIC8vIGNvdW50IHBlciBwYWdlXG4gICAgICAgIHNvcnRpbmc6IHtcbiAgICAgICAgICAgICdpZCc6ICdkZXNjJyAvLyBpbml0aWFsIHNvcnRpbmdcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAgdG90YWw6IDAsIC8vIGxlbmd0aCBvZiBkYXRhXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCRkZWZlciwgcGFyYW1zKSB7XG4gICAgICAgICAgICAkc2NvcGUucmVxdWVzdFBlbmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgLy8gcHJlcGFyZSBvcHRpb25zIHRvIGJlIHNlbnQgdG8gYXBpXG4gICAgICAgICAgICB2YXIgcXVlcnlPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGxhbmc6ICRzY29wZS50cmFuc0xhbmcuY29kZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gcGFyYW1zLmNvdW50KCkgLSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgZGVjbGFyZWQgaW4gdmlld1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuY291bnQoVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wZXJQYWdlID0gcGFyYW1zLmNvdW50KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5wYWdlKCkgLSBjdXJyZW50IHBhZ2VcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnBhZ2UoVXRpbHMuJHN0YXRlUGFyYW1zLnBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wYWdlID0gcGFyYW1zLnBhZ2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGFibGVQYXJhbXMub3JkZXJCeSgpIC0gYW4gYXJyYXkgb2Ygc3RyaW5nIGluZGljYXRpbmcgYm90aCB0aGUgc29ydGluZyBjb2x1bW4gYW5kIGRpcmVjdGlvbiAoZS5nLiBbXCIrbmFtZVwiLCBcIi1lbWFpbFwiXSlcbiAgICAgICAgICAgIGlmIChwYXJhbXMuc29ydGluZygpKSB7XG4gICAgICAgICAgICAgICAgLy8gb25seSBpbnRlcmVzdGVkIGluIGZpcnN0IHNvcnQgY29sdW1uIGZvciBub3dcbiAgICAgICAgICAgICAgICB2YXIgb3JkZXJCeSA9IHBhcmFtcy5vcmRlckJ5KClbMF07XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnNvcnQgPSBvcmRlckJ5WzBdID09PSAnKycgPyBvcmRlckJ5LnN1YnN0cmluZygxKSA6IG9yZGVyQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFV0aWxzLiRzdGF0ZVBhcmFtcyBmaWx0ZXJzXG4gICAgICAgICAgICBxdWVyeU9wdGlvbnMgPSBfLm1lcmdlKHF1ZXJ5T3B0aW9ucywgVXRpbHMuJHN0YXRlUGFyYW1zKTtcbiAgICAgICAgICAgICRzY29wZS5hY3RpdmVGaWx0ZXIgPSBVdGlscy4kc3RhdGVQYXJhbXM7XG5cbiAgICAgICAgICAgIC8vIGdldCBsaXN0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkuZGVsZXRlZChxdWVyeU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAvLyBDb250ZW50cyBpcyBhIFJFU1QgQW5ndWxhckpTIHNlcnZpY2UgdGhhdCB0YWxrcyB0byBhcGkgYW5kIHJldHVybiBwcm9taXNlXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVxdWVzdFBlbmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwYXJhbXMudG90YWwocmVzcG9uc2UubWV0YS50b3RhbCk7XG4gICAgICAgICAgICAgICAgJGRlZmVyLnJlc29sdmUoQ29udGVudFJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5Db250ZW50VHJhc2hjYW5DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdDb250ZW50UmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJywgJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRUcmFzaGNhbkN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnREZWxldGVDdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgQ29udGVudFJlcG9zaXRvcnkpIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC9kaXJlY3RpdmVzLyc7XG4gICAgLy8gRGVsZXRlIG1vZGFsXG4gICAgdm0uZGVsZXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY29udGVudERlbGV0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWQgdG8gYmUgcmVtb3ZlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50VHlwZSBjb250ZW50IHR5cGVcbiAgICAgICAgICogQHBhcmFtIGZvcmNlRGVsZXRlIHVzZSBmb3JjZURlbGV0ZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihjb250ZW50SWQsIGNvbnRlbnRUeXBlLCBmb3JjZURlbGV0ZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0uY29udGVudElkID0gY29udGVudElkO1xuICAgICAgICAgICAgdm0uY29udGVudFR5cGUgPSBjb250ZW50VHlwZTtcbiAgICAgICAgICAgIHZtLmZvcmNlRGVsZXRlID0gZm9yY2VEZWxldGU7XG4gICAgICAgICAgICBpZiAodm0uZm9yY2VEZWxldGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnREVMRVRFX0NPTlRFTlRfUVVFU1RJT04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ01PVkVfQ09OVEVOVF9UT19UUkFTSF9RVUVTVElPTicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCaW5kIGhvdGtleXNcbiAgICAgICAgICAgIFV0aWxzLmhvdGtleXMuYWRkKHtcbiAgICAgICAgICAgICAgICBjb21ibzogJ2VudGVyJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogVXRpbHMuJGZpbHRlcigndHJhbnNsYXRlJykoXG4gICAgICAgICAgICAgICAgICAgIHZtLmZvcmNlRGVsZXRlID8gJ0NPTkZJUk1fREVMRVRFJyA6ICdDT05GSVJNX01PVkVfVE9fVFJBU0gnXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kZWxldGVDb250ZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgVXRpbHMuaG90a2V5cy5kZWwoJ2VudGVyJyk7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBERUxFVEUgYWN0aW9uIGZvciBjb250ZW50IGlkIGluIHNjb3BlXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBkZWxldGVDb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5LmRlbGV0ZUNvbnRlbnQodm0uY29udGVudElkLCB2bS5mb3JjZURlbGV0ZSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICAvLyByZWZyZXNoIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgICAgICAgICBpZiAodm0uY29udGVudFR5cGUgPT09ICdjYXRlZ29yeScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlZCBjYXRlZ29yeVxuICAgICAgICAgICAgICAgICAgICBVdGlscy5TdG9yYWdlLnJlbW92ZVN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpO1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2NvbnRlbnQubGlzdCcsIHtjb250ZW50SWQ6IG51bGx9LCB7cmVsb2FkOiB0cnVlLCBpbmhlcml0OiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ0NBVEVHT1JZX0hBU19CRUVOX0RFTEVURUQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmVkIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKFV0aWxzLiRzdGF0ZS4kY3VycmVudC5uYW1lID09PSAnY29udGVudC5zaG93LmRldGFpbHMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2NvbnRlbnQudHJhc2hjYW4nLCB7Y29udGVudElkOiBudWxsfSwge3JlbG9hZDogdHJ1ZSwgaW5oZXJpdDogZmFsc2V9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbyhVdGlscy4kc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoXG4gICAgICAgICAgICAgICAgICAgICAgICB2bS5mb3JjZURlbGV0ZSA/ICdDT05URU5UX0hBU19CRUVOX0RFTEVURUQnIDogJ0NPTlRFTlRfSEFTX0JFRU5fTU9WRURfVE9fVFJBU0gnXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5Db250ZW50RGVsZXRlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREZWxldGVDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIENvbnRlbnRQdWJsaXNoZWRBdEVkaXRDdHJsXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFB1Ymxpc2hlZEF0RWRpdEN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIFJvdXRlIG1vZGFsXG4gICAgdm0uZWRpdE1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2NvbnRlbnRFZGl0UHVibGlzaGVkQXRNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRJZCBjb250ZW50IGlkIHRvIGJlIHVwZGF0ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKiBAcGFyYW0gY29udGVudFB1Ymxpc2hlZEF0IGNvbnRlbnQgcHVibGlzaGVkIGF0IGRhdGVcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oY29udGVudElkLCBjb250ZW50UHVibGlzaGVkQXQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHZtLmNvbnRlbnRQdWJsaXNoZWRBdCA9IGNvbnRlbnRQdWJsaXNoZWRBdDtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdFRElUJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgY3VzdG9tUFVUIGZ1bmN0aW9uIGZvciBjb250ZW50IGluIHNjb3BlXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBzYXZlQ29udGVudFB1Ymxpc2hlZEF0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhciBkYXRlVGltZSA9IG1vbWVudCgkc2NvcGUudm0uY29udGVudFB1Ymxpc2hlZEF0KS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3MnKTtcbiAgICAgICAgICAgIHZhciBjb250ZW50ID0ge1xuICAgICAgICAgICAgICAgIHB1Ymxpc2hlZEF0OiBkYXRlVGltZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkudXBkYXRlQ29udGVudCh2bS5jb250ZW50SWQsIGNvbnRlbnQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9XG4gICAgfTtcbn1cbkNvbnRlbnRQdWJsaXNoZWRBdEVkaXRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICckbW9kYWwnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFB1Ymxpc2hlZEF0RWRpdEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRSZXN0b3JlQ3RybCgkc2NvcGUsIFV0aWxzLCAkbW9kYWwsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC9kaXJlY3RpdmVzLyc7XG4gICAgLy8gUmVzdG9yZSBtb2RhbFxuICAgIHZtLnJlc3RvcmVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdjb250ZW50UmVzdG9yZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWQgdG8gYmUgcmVzdG9yZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihjb250ZW50SWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdSRVNUT1JFX0NPTlRFTlRfUVVFU1RJT04nKTtcblxuICAgICAgICAgICAgLy8gQmluZCBob3RrZXlzXG4gICAgICAgICAgICBVdGlscy5ob3RrZXlzLmFkZCh7XG4gICAgICAgICAgICAgICAgY29tYm86ICdlbnRlcicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFV0aWxzLiRmaWx0ZXIoJ3RyYW5zbGF0ZScpKCdDT05GSVJNX0NPTlRFTlRfUkVTVE9SRScpLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5yZXN0b3JlQ29udGVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICAgICAgVXRpbHMuaG90a2V5cy5kZWwoJ2VudGVyJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiByZXN0b3JlIHNvZnREZWxldGVkIGNvbnRlbnRcbiAgICAgICAgICogQHBhcmFtIGVkaXRBZnRlclJlc3RvcmUgaWYgdHJ1ZSByZWRpcmVjdCB0byBlZGl0IHN0YXRlIGFmdGVyIHJlc3RvcmVcbiAgICAgICAgICovXG4gICAgICAgIHJlc3RvcmVDb250ZW50OiBmdW5jdGlvbihlZGl0QWZ0ZXJSZXN0b3JlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5yZXN0b3JlQ29udGVudCh2bS5jb250ZW50SWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdEFmdGVyUmVzdG9yZSkge1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2NvbnRlbnQuZWRpdC5kZXRhaWxzJywge2NvbnRlbnRJZDogdm0uY29udGVudElkLCBsYW5nQ29kZTogJHNjb3BlLmN1cnJlbnRMYW5nLmNvZGV9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnQ09OVEVOVF9IQVNfQkVFTl9SRVNUT1JFRCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuQ29udGVudFJlc3RvcmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICckbW9kYWwnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnTm90aWZpY2F0aW9ucyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50UmVzdG9yZUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRSb3V0ZUN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIFJvdXRlIG1vZGFsXG4gICAgdm0uZWRpdFJvdXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY29udGVudEVkaXRSb3V0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWQgdG8gYmUgcmVtb3ZlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50Um91dGUgY29udGVudCByb3V0ZVxuICAgICAgICAgKiBAcGFyYW0gbGFuZ0NvZGUgcm91dGUgdHJhbnNsYXRpb24gbGFuZ3VhZ2VcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oY29udGVudElkLCBjb250ZW50Um91dGUsIGxhbmdDb2RlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICB2bS5jb250ZW50Um91dGUgPSBjb250ZW50Um91dGUuc3Vic3RyKGNvbnRlbnRSb3V0ZS5sYXN0SW5kZXhPZignLycpICsgMSk7IC8vIGxhc3QgdXJsIHNlZ21lbnRcbiAgICAgICAgICAgIHZtLm9sZFJvdXRlID0gdm0uY29udGVudFJvdXRlO1xuICAgICAgICAgICAgdm0ubGFuZ0NvZGUgPSBsYW5nQ29kZTtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdFRElUJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgY29udGVudCBpZCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZUNvbnRlbnRSb3V0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgbmV3Um91dGUgPSB7XG4gICAgICAgICAgICAgICAgbGFuZ0NvZGU6IHZtLmxhbmdDb2RlLFxuICAgICAgICAgICAgICAgIHVybDogdm0uY29udGVudFJvdXRlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gb25seSB3aGVuIHJvdXRlIGhhcyBiZWVuIGNoYW5nZWRcbiAgICAgICAgICAgIGlmICh2bS5jb250ZW50Um91dGUgIT09IHZtLm9sZFJvdXRlKSB7XG4gICAgICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkubmV3Q29udGVudFJvdXRlKHZtLmNvbnRlbnRJZCwgbmV3Um91dGUpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbyhVdGlscy4kc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuQ29udGVudFJvdXRlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRSb3V0ZUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRUaGVtZUVkaXRDdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvJztcbiAgICAvLyBUaGVtZSBtb2RhbFxuICAgIHZtLmVkaXRNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdjb250ZW50RWRpdFRoZW1lTW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50SWQgY29udGVudCBpZCB0byBiZSB1cGRhdGVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRUaGVtZSBjb250ZW50IHRoZW1lXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKGNvbnRlbnRJZCwgY29udGVudFRoZW1lKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICB2bS5jb250ZW50VGhlbWUgPSBjb250ZW50VGhlbWU7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnRURJVCcpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIGN1c3RvbVBVVCBmdW5jdGlvbiBmb3IgY29udGVudCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZUNvbnRlbnRXZWlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSB7XG4gICAgICAgICAgICAgICAgdGhlbWU6ICRzY29wZS52bS5jb250ZW50VGhlbWVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5LnVwZGF0ZUNvbnRlbnQodm0uY29udGVudElkLCBjb250ZW50KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKFV0aWxzLiRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgIH07XG59XG5Db250ZW50VGhlbWVFZGl0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRUaGVtZUVkaXRDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIENvbnRlbnRUb2dnbGVQcm9wZXJ0eUN0cmxcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50VG9nZ2xlUHJvcGVydHlDdHJsKFV0aWxzLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG5cbiAgICB2bS50b2dnbGVQcm9wZXJ0eSA9IHtcblxuICAgICAgICB0b2dnbGVQcm9wZXJ0eTogZnVuY3Rpb24oY29udGVudElkLCBwcm9wZXJ0eU5hbWUsIGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gIWN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIHZhciBjb250ZW50ID0ge307XG4gICAgICAgICAgICBjb250ZW50W3Byb3BlcnR5TmFtZV0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5LnVwZGF0ZUNvbnRlbnQoY29udGVudElkLCBjb250ZW50KS50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxufVxuQ29udGVudFRvZ2dsZVByb3BlcnR5Q3RybC4kaW5qZWN0ID0gWydVdGlscycsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50VG9nZ2xlUHJvcGVydHlDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50V2VpZ2h0RWRpdEN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIFdlaWdodCBtb2RhbFxuICAgIHZtLmVkaXRNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdjb250ZW50RWRpdFdlaWdodE1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWQgdG8gYmUgdXBkYXRlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50V2VpZ2h0IGNvbnRlbnQgd2VpZ2h0XG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKGNvbnRlbnRJZCwgY29udGVudFdlaWdodCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0uY29udGVudElkID0gY29udGVudElkO1xuICAgICAgICAgICAgdm0uY29udGVudFdlaWdodCA9IGNvbnRlbnRXZWlnaHQ7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnRURJVCcpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIGN1c3RvbVBVVCBmdW5jdGlvbiBmb3IgY29udGVudCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZUNvbnRlbnRXZWlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSB7XG4gICAgICAgICAgICAgICAgd2VpZ2h0OiAkc2NvcGUudm0uY29udGVudFdlaWdodFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkudXBkYXRlQ29udGVudCh2bS5jb250ZW50SWQsIGNvbnRlbnQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9XG4gICAgfTtcbn1cbkNvbnRlbnRXZWlnaHRFZGl0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRXZWlnaHRFZGl0Q3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBTZXRUcmFuc2xhdGlvbkFzQWN0aXZlXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIFNldCBhcyBhY3RpdmUgbW9kYWxcbiAgICB2bS5zZXRBc0FjdGl2ZU1vZGFsID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gdHJhbnNsYXRpb24gd2l0aCBzcGVjaWZpZWQgaWQgcHJvcGVydHkgZnJvbSB0cmFuc2xhdGlvbnMgYXJyYXlcbiAgICAgICAgICogYW5kIGZldGNoIGxhbmcgcHJvcGVydHlcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9ucyBUcmFuc2xhdGlvbnMgYXJyYXlcbiAgICAgICAgICogQHBhcmFtIGlkIHRyYW5zbGF0aW9uIGlkXG4gICAgICAgICAqIEByZXR1cm5zIE9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0VHJhbnNsYXRpb25CeUlkOiBmdW5jdGlvbih0cmFuc2xhdGlvbnMsIGlkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgdHJhbnNsYXRpb24gPSB0cmFuc2xhdGlvbnMuc2hpZnQoKTtcbiAgICAgICAgICAgIGlmIChwYXJzZUludCh0cmFuc2xhdGlvbi5pZCkgPT09IHBhcnNlSW50KGlkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFuc2xhdGlvbjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuZ2V0VHJhbnNsYXRpb25CeUlkKHRyYW5zbGF0aW9ucywgaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2V0VHJhbnNsYXRpb25Bc0FjdGl2ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0cmFuc2xhdGlvbklkIGlkIG9mIHNlbGVjdGVkIHRyYW5zbGF0aW9uXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50SWQgY3VycmVudCBhY3RpdmUgY29udGVudCBpZFxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbih0cmFuc2xhdGlvbklkLCBjb250ZW50SWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHZtLnRyYW5zbGF0aW9ucyA9ICRzY29wZS50YWJsZVBhcmFtcy5kYXRhLnNsaWNlKDApO1xuICAgICAgICAgICAgdm0udHJhbnNsYXRpb25JZCA9IHRyYW5zbGF0aW9uSWQ7XG4gICAgICAgICAgICB2bS5zZWxlY3RlZFRyYW5zbGF0aW9uID0gc2VsZi5nZXRUcmFuc2xhdGlvbkJ5SWQodm0udHJhbnNsYXRpb25zLCB2bS50cmFuc2xhdGlvbklkKTtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdTRVRfVFJBTlNMQVRJT05fQVNfQUNUSVZFX1FVRVNUSU9OJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIGFjdGlvbiBhbmQgc2V0IHNlbGVjdGVkIHRyYW5zbGF0aW9uXG4gICAgICAgICAqIGFzIGEgbmV3IGFjdGl2ZSB0cmFuc2xhdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgc2V0QXNBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkubmV3Q29udGVudFRyYW5zbGF0aW9uKHZtLmNvbnRlbnRJZCwgdm0uc2VsZWN0ZWRUcmFuc2xhdGlvbikudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ1RIRV9DSEFOR0VTX0hBVkVfQkVFTl9TQVZFRCcpO1xuICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblNldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICckbW9kYWwnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgRGVsZXRlVHJhbnNsYXRpb25DdHJsXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRGVsZXRlVHJhbnNsYXRpb25DdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvJztcbiAgICAvLyBEZWxldGUgbW9kYWxcbiAgICB2bS5kZWxldGVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICd0cmFuc2xhdGlvbkRlbGV0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50SWQgY29udGVudCBpZFxuICAgICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25JZCB0cmFuc2xhdGlvbiBpZFxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihjb250ZW50SWQsIHRyYW5zbGF0aW9uSWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHZtLnRyYW5zbGF0aW9uSWQgPSB0cmFuc2xhdGlvbklkO1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ0RFTEVURV9UUkFOU0xBVElPTl9RVUVTVElPTicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBERUxFVEUgYWN0aW9uIGZvciB0cmFuc2xhdGlvbiBpZCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgZGVsZXRlQ29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5LmRlbGV0ZVRyYW5zbGF0aW9uKHZtLmNvbnRlbnRJZCwgdm0udHJhbnNsYXRpb25JZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ1RSQU5TTEFUSU9OX0hBU19CRUVOX0RFTEVURUQnKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUucmVsb2FkKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5EZWxldGVUcmFuc2xhdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJyRtb2RhbCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBEZWxldGVUcmFuc2xhdGlvbkN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENoYXJhY3RlcnNDb3VudGVyKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRlbXBsYXRlVXJsOiAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC9kaXJlY3RpdmVzL2NoYXJhY3RlcnNDb3VudGVyLnRwbC5odG1sJyxcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdHNjb3BlOiB7XG5cdFx0XHQnY2hhcmFjdGVycyc6ICdAY291bnQnXG5cdFx0fVxuXHR9O1xufVxuXG5DaGFyYWN0ZXJzQ291bnRlci4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IENoYXJhY3RlcnNDb3VudGVyOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEFjdGlvbnNEcm9wZG93bigkZHJvcGRvd24pIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZToge2NvbnRlbnRBY3Rpb25zRHJvcGRvd246ICc9JywgcmVjb3JkOiAnPScsIGxhbmc6ICc9J30sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50RGVsZXRlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBDb250ZW50RGVsZXRlQ3RybCkge1xuICAgICAgICAgICAgdmFyIGRyb3Bkb3duID0gJGRyb3Bkb3duKGVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy9jb250ZW50QWN0aW9uc0Ryb3Bkb3duLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBhbmltYXRpb246ICdhbS1mbGlwLXgnLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2JvdHRvbS1yaWdodCdcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gYmV0dGVyIHBhcmFtcyByZXBsYWNlbWVudCBhbmQgZnVuY3Rpb25zIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgXy5tYXBWYWx1ZXMoc2NvcGUuY29udGVudEFjdGlvbnNEcm9wZG93biwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG4uaHJlZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlY29yZCBpZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG4uaHJlZi5pbmRleE9mKCdyZWNvcmRfaWQnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuLmhyZWYgPSBuLmhyZWYucmVwbGFjZSgncmVjb3JkX2lkJywgc2NvcGUucmVjb3JkLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIExhbmcgY29kZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG4uaHJlZi5pbmRleE9mKCdsYW5nX2NvZGUnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuLmhyZWYgPSBuLmhyZWYucmVwbGFjZSgnbGFuZ19jb2RlJywgJ1wiJyArIHNjb3BlLmxhbmcuY29kZSArICdcIicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgZHJvcGRvd24uJHNjb3BlLmNvbnRlbnQgPSBzY29wZS5jb250ZW50QWN0aW9uc0Ryb3Bkb3duO1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS5yZWNvcmQgPSBzY29wZS5yZWNvcmQ7IC8vIFBhc3MgcmVjb3JkIHRvIHRoZSB2aWV3XG4gICAgICAgICAgICAgICAgZHJvcGRvd24uJHNjb3BlLmxhbmcgPSBzY29wZS5sYW5nOyAvLyBQYXNzIGxhbmcgdG8gdGhlIHZpZXdcbiAgICAgICAgICAgICAgICBkcm9wZG93bi4kc2NvcGUuZGVsZXRlTW9kYWwgPSBDb250ZW50RGVsZXRlQ3RybC5kZWxldGVNb2RhbDsgLy8gUGFzcyBkZWxldGUgYWN0aW9uIHRvIHRoZSB2aWV3XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnRBY3Rpb25zRHJvcGRvd24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50QWN0aW9uc0Ryb3Bkb3duO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGVsZXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsLy8gYmVjYXVzZSB0aGUgc2NvcGUgaXMgaXNvbGF0ZWRcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBDb250ZW50RGVsZXRlQ3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgZGVsZXRlIG1vZGFsIGZyb20gYSBjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgQ29udGVudERlbGV0ZUN0cmwuZGVsZXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmlkLCBhdHRycy50eXBlLCBhdHRycy5mb3JjZSA9PT0gJ3RydWUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudERlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREZWxldGVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRFZGl0Um91dGVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50Um91dGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLC8vIGJlY2F1c2UgdGhlIHNjb3BlIGlzIGlzb2xhdGVkXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQ29udGVudFJvdXRlQ3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgZGVsZXRlIG1vZGFsIGZyb20gYSBjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgQ29udGVudFJvdXRlQ3RybC5lZGl0Um91dGVNb2RhbC5zaG93TW9kYWwoYXR0cnMuaWQsIGF0dHJzLnJvdXRlLCBhdHRycy5sYW5nKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudEVkaXRSb3V0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRFZGl0Um91dGVCdXR0b247XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgQ29udGVudFB1Ymxpc2hlZEF0RWRpdEJ1dHRvblxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRQdWJsaXNoZWRBdEVkaXRCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50UHVibGlzaGVkQXRFZGl0Q3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBDb250ZW50UHVibGlzaGVkQXRFZGl0Q3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBDb250ZW50UHVibGlzaGVkQXRFZGl0Q3RybC5lZGl0TW9kYWwuc2hvd01vZGFsKFxuICAgICAgICAgICAgICAgICAgICBhdHRycy5jb250ZW50SWQsXG4gICAgICAgICAgICAgICAgICAgIGF0dHJzLmNvbnRlbnRQdWJsaXNoZWRBdFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnRQdWJsaXNoZWRBdEVkaXRCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50UHVibGlzaGVkQXRFZGl0QnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50UmVzdG9yZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRSZXN0b3JlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIENvbnRlbnRSZXN0b3JlQ3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgZGVsZXRlIG1vZGFsIGZyb20gYSBjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgQ29udGVudFJlc3RvcmVDdHJsLnJlc3RvcmVNb2RhbC5zaG93TW9kYWwoYXR0cnMuaWQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50UmVzdG9yZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRSZXN0b3JlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50VGhlbWVFZGl0QnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudFRoZW1lRWRpdEN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQ29udGVudFRoZW1lRWRpdEN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgQ29udGVudFRoZW1lRWRpdEN0cmwuZWRpdE1vZGFsLnNob3dNb2RhbChcbiAgICAgICAgICAgICAgICAgICAgYXR0cnMuY29udGVudElkLFxuICAgICAgICAgICAgICAgICAgICBhdHRycy5jb250ZW50VGhlbWVcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50VGhlbWVFZGl0QnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFRoZW1lRWRpdEJ1dHRvbjtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBDb250ZW50VG9nZ2xlUHJvcGVydHlCdXR0b25cbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50VG9nZ2xlUHJvcGVydHlCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50VG9nZ2xlUHJvcGVydHlDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIENvbnRlbnRUb2dnbGVQcm9wZXJ0eUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgQ29udGVudFRvZ2dsZVByb3BlcnR5Q3RybC50b2dnbGVQcm9wZXJ0eS50b2dnbGVQcm9wZXJ0eShcbiAgICAgICAgICAgICAgICAgICAgYXR0cnMuY29udGVudElkLFxuICAgICAgICAgICAgICAgICAgICBhdHRycy5wcm9wZXJ0eU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIFN0cmluZyhhdHRycy52YWx1ZSkgIT09ICdmYWxzZSdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50VG9nZ2xlUHJvcGVydHlCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50VG9nZ2xlUHJvcGVydHlCdXR0b247XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgQ29udGVudFdlaWdodEVkaXRCdXR0b25cbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50V2VpZ2h0RWRpdEJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRXZWlnaHRFZGl0Q3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBDb250ZW50V2VpZ2h0RWRpdEN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgQ29udGVudFdlaWdodEVkaXRDdHJsLmVkaXRNb2RhbC5zaG93TW9kYWwoXG4gICAgICAgICAgICAgICAgICAgIGF0dHJzLmNvbnRlbnRJZCxcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoYXR0cnMuY29udGVudFdlaWdodClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50V2VpZ2h0RWRpdEJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRXZWlnaHRFZGl0QnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTZXRUcmFuc2xhdGlvbkFzQWN0aXZlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwuc2V0QXNBY3RpdmVNb2RhbC5zaG93TW9kYWwoYXR0cnMuaWQsIGF0dHJzLmNvbnRlbnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5TZXRUcmFuc2xhdGlvbkFzQWN0aXZlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVHJhbnNsYXRpb25EZWxldGVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdUcmFuc2xhdGlvbkRlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgVHJhbnNsYXRpb25EZWxldGVDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFRyYW5zbGF0aW9uRGVsZXRlQ3RybC5kZWxldGVNb2RhbC5zaG93TW9kYWwoYXR0cnMuY29udGVudCwgYXR0cnMudHJhbnNsYXRpb25JZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblRyYW5zbGF0aW9uRGVsZXRlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gVHJhbnNsYXRpb25EZWxldGVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhZG1pbi5jb250ZW50JywgWyduZ1RhYmxlJywgJ3VpLnRyZWUnXSlcbiAgICAuY29uZmlnKFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAgICAgICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50Lyc7XG4gICAgICAgICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvY29udGVudCcsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50RGFzaGJvYXJkQ3RybCcsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdpbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDb250ZW50UmVwb3NpdG9yeScsIGZ1bmN0aW9uKENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCB0cmVlIG9mIGFsbCBjYXRlZ29yaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS50cmVlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYXRlZ29yeSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBDT05URU5UIExJU1RcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQubGlzdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2xpc3Qve2NvbnRlbnRJZH0/aXNBY3RpdmUmcGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdFBhcmVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnVXRpbHMnLCAnQ29udGVudFJlcG9zaXRvcnknLCBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIFV0aWxzLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdGF0ZSBwYXJhbSBoYXMgY2F0ZWdvcnkgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzdGF0ZVBhcmFtcy5jb250ZW50SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFV0aWxzLlN0b3JhZ2Uuc2V0U3RvcmFnZUl0ZW0oe2NvbnRlbnRMaXN0UGFyZW50OiAkc3RhdGVQYXJhbXMuY29udGVudElkfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5jb250ZW50SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgc3RvcmFnZSBoYXMgY2F0ZWdvcnkgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChVdGlscy5TdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCA9IFV0aWxzLlN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZShVdGlscy5TdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuQ2F0ZWdvcmllczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCBvcGVuIGNhdGVnb3JpZXMgZnJvbSBTdG9yYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1V0aWxzJywgZnVuY3Rpb24oVXRpbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLlN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ29wZW5DYXRlZ29yaWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2xpc3QuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRMaXN0Q3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAncXVpY2tTaWRlYmFyTGVmdCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY2F0ZWdvcmllcy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudENhdGVnb3J5VHJlZUN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIENPTlRFTlQgU0hPV1xuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5zaG93Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2NvbnRlbnRJZH0vc2hvdy97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgYWJzdHJhY3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlZGlyZWN0IHRvIGFjdGl2ZSB0YWIgb24gbGFuZ3VhZ2UgY2hhbmdlXG4gICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJywgZnVuY3Rpb24oJHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8uc3RhcnRzV2l0aCgkc3RhdGUuY3VycmVudC5uYW1lLCAnY29udGVudC5zaG93JykgPyAkc3RhdGUuY3VycmVudC5uYW1lIDogJy5kZXRhaWxzJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFuZ0NvZGU6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzdGF0ZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMubGFuZ0NvZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5jb250ZW50SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdzaG93Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50RGV0YWlsc0N0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2xhbmdTd2l0Y2hlckBjb250ZW50LnNob3cnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvbGFuZ1N3aXRjaGVyLmh0bWwnXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudFNldHRpbmdzQGNvbnRlbnQuc2hvdyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy9zZXR0aW5ncy5odG1sJ1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5zaG93LmRldGFpbHMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9kZXRhaWxzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVlcFN0YXRlUmVkaXJlY3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHN0aWNreTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50VGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3RhYnMvZGV0YWlscy5odG1sJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQuc2hvdy5oaXN0b3J5Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvaGlzdG9yeT9pc0FjdGl2ZSZ0eXBlJnBhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIGRlZXBTdGF0ZVJlZGlyZWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzdGlja3k6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudFRhYic6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2hpc3RvcnkuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRIaXN0b3J5Q3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LnNob3cuYmxvY2tzJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvYmxvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgZGVlcFN0YXRlUmVkaXJlY3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHN0aWNreTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsICdCbG9ja3NSZXBvc2l0b3J5JywgZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBCbG9ja3NSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBCbG9ja3NSZXBvc2l0b3J5Lmxpc3RGb3JDb250ZW50KCRzdGF0ZVBhcmFtcy5jb250ZW50SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50VGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3RhYnMvYmxvY2tzLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50QmxvY2tzQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gQ09OVEVOVCBFRElUXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LmVkaXQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy97Y29udGVudElkfS9lZGl0L3tsYW5nQ29kZX0nLFxuICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogJy5pbmRleCcsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhbmdDb2RlOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsICckc3RhdGVQYXJhbXMnLCBmdW5jdGlvbigkc3RhdGUsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHN0YXRlUGFyYW1zLmxhbmdDb2RlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsICdDb250ZW50UmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZSgkc3RhdGVQYXJhbXMuY29udGVudElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3dNYXNrOiB0cnVlIC8vIGVudGVyIGVkaXQgbW9kZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3Nob3cuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnREZXRhaWxzQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGFuZ1N3aXRjaGVyQGNvbnRlbnQuZWRpdCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy9sYW5nU3dpdGNoZXIuaHRtbCdcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50U2V0dGluZ3NAY29udGVudC5lZGl0Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3NldHRpbmdzLmh0bWwnXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LmVkaXQuaW5kZXgnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJycsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudFRhYic6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2RldGFpbHMuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LmVkaXQuZGV0YWlscycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2RldGFpbHMnLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnRUYWInOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnREZXRhaWxzRWRpdEN0cmwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3RhYnMvZGV0YWlsc0VkaXQuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gQ09OVEVOVCBUUkFTSENBTlxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC50cmFzaGNhbicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3RyYXNoY2FuP2lzQWN0aXZlJnR5cGUmcGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdFBhcmVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuQ2F0ZWdvcmllczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCBvcGVuIGNhdGVnb3JpZXMgZnJvbSBTdG9yYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1N0b3JhZ2UnLCBmdW5jdGlvbihTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBTdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdvcGVuQ2F0ZWdvcmllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICd0cmFzaGNhbi5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudFRyYXNoY2FuQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAncXVpY2tTaWRlYmFyTGVmdCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY2F0ZWdvcmllcy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudENhdGVnb3J5VHJlZUN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIENPTlRFTlQgQUREXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LmFkZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2FkZC97dHlwZX0nLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0UGFyZW50OiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1V0aWxzJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgZnVuY3Rpb24oVXRpbHMsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHN0b3JhZ2UgaGFzIGNhdGVnb3J5IGlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChVdGlscy5TdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkub25lKFV0aWxzLlN0b3JhZ2UuZ2V0U3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2FkZC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudEFkZEN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIENPTlRFTlQgQUREIFRSQU5TTEFUSU9OXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LmFkZFRyYW5zbGF0aW9uJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2NvbnRlbnRJZH0vYWRkLXRyYW5zbGF0aW9uL3tsYW5nQ29kZX0nLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsICdDb250ZW50UmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZSgkc3RhdGVQYXJhbXMuY29udGVudElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnYWRkVHJhbnNsYXRpb24uaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRBZGRUcmFuc2xhdGlvbkN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRBZGRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50QWRkQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50RGVsZXRlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50RGVsZXRlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50UmVzdG9yZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudFJlc3RvcmVDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50Q2F0ZWdvcnlUcmVlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50RGFzaGJvYXJkQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudERhc2hib2FyZEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERldGFpbHNDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50RGV0YWlsc0N0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERldGFpbHNFZGl0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudERldGFpbHNFZGl0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50SGlzdG9yeUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnRIaXN0b3J5Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50QmxvY2tzQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudEJsb2Nrc0N0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudExpc3RDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50TGlzdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudFRyYXNoY2FuQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudFRyYXNoY2FuQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50QWRkVHJhbnNsYXRpb25DdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRSb3V0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudFJvdXRlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdTZXRUcmFuc2xhdGlvbkFzQWN0aXZlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyZWN0aXZlcy9TZXRUcmFuc2xhdGlvbkFzQWN0aXZlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdUcmFuc2xhdGlvbkRlbGV0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvVHJhbnNsYXRpb25EZWxldGVDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRUb2dnbGVQcm9wZXJ0eUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudFRvZ2dsZVByb3BlcnR5Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50V2VpZ2h0RWRpdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudFdlaWdodEVkaXRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRUaGVtZUVkaXRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRUaGVtZUVkaXRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRQdWJsaXNoZWRBdEVkaXRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRQdWJsaXNoZWRBdEVkaXRDdHJsJykpXG4gICAgLmZhY3RvcnkoJ0NvbnRlbnRSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9Db250ZW50UmVwb3NpdG9yeS5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnREZWxldGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnRSZXN0b3JlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0NvbnRlbnRSZXN0b3JlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudEVkaXRSb3V0ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Db250ZW50RWRpdFJvdXRlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnc2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9TZXRUcmFuc2xhdGlvbkFzQWN0aXZlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgndHJhbnNsYXRpb25EZWxldGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvVHJhbnNsYXRpb25EZWxldGVCdXR0b24uanMnKSlcbiAgICAuZGlyZWN0aXZlKCdjb250ZW50VG9nZ2xlUHJvcGVydHlCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudFRvZ2dsZVByb3BlcnR5QnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudFB1Ymxpc2hlZEF0RWRpdEJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Db250ZW50UHVibGlzaGVkQXRFZGl0QnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudEFjdGlvbnNEcm9wZG93bicsIFsnJGRyb3Bkb3duJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0NvbnRlbnRBY3Rpb25zRHJvcGRvd24uanMnKV0pXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudFdlaWdodEVkaXRCdXR0b24nLCBbJyRkcm9wZG93bicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Db250ZW50V2VpZ2h0RWRpdEJ1dHRvbi5qcycpXSlcbiAgICAuZGlyZWN0aXZlKCdjb250ZW50VGhlbWVFZGl0QnV0dG9uJywgWyckZHJvcGRvd24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudFRoZW1lRWRpdEJ1dHRvbi5qcycpXSlcbiAgICAuZGlyZWN0aXZlKCdjaGFyYWN0ZXJzQ291bnRlcicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9DaGFyYWN0ZXJzQ291bnRlci5qcycpKVxuICAgIC5ydW4oW1xuICAgICAgICAnTmF2QmFyJyxcbiAgICAgICAgZnVuY3Rpb24oTmF2QmFyKSB7XG4gICAgICAgICAgICBOYXZCYXIuYWRkKFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdDT05URU5UJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnY29udGVudC5saXN0JyxcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWZpbGUtdGV4dC1vJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvL05hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgICAvLyAgICAnQ09OVEVOVCcsXG4gICAgICAgICAgICAvLyAgICB7XG4gICAgICAgICAgICAvLyAgICAgICAgdGl0bGU6ICdBTExfQ09OVEVOVFMnLFxuICAgICAgICAgICAgLy8gICAgICAgIGFjdGlvbjogJ2NvbnRlbnQubGlzdCcsXG4gICAgICAgICAgICAvLyAgICAgICAgaWNvbjogJ2ZhIGZhLXRoJ1xuICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgLy8pO1xuICAgICAgICAgICAgLy9OYXZCYXIuYWRkTGFzdENoaWxkKFxuICAgICAgICAgICAgLy8gICAgJ0NPTlRFTlQnLFxuICAgICAgICAgICAgLy8gICAge1xuICAgICAgICAgICAgLy8gICAgICAgIHRpdGxlOiAnQUREX0NPTlRFTlQnLFxuICAgICAgICAgICAgLy8gICAgICAgIGFjdGlvbjogJ2NvbnRlbnQuYWRkKHsgdHlwZTogXCJjb250ZW50XCIgfSknLFxuICAgICAgICAgICAgLy8gICAgICAgIGljb246ICdmYSBmYS1maWxlLXRleHQtbydcbiAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgIC8vKTtcbiAgICAgICAgICAgIC8vTmF2QmFyLmFkZExhc3RDaGlsZChcbiAgICAgICAgICAgIC8vICAgICdDT05URU5UJyxcbiAgICAgICAgICAgIC8vICAgIHtcbiAgICAgICAgICAgIC8vICAgICAgICB0aXRsZTogJ0FERF9DQVRFR09SWScsXG4gICAgICAgICAgICAvLyAgICAgICAgYWN0aW9uOiAnY29udGVudC5hZGQoeyB0eXBlOiBcImNhdGVnb3J5XCIgfSknLFxuICAgICAgICAgICAgLy8gICAgICAgIGljb246ICdmYSBmYS1maWxlLXRleHQnXG4gICAgICAgICAgICAvLyAgICB9XG4gICAgICAgICAgICAvLyk7XG4gICAgICAgIH1cbiAgICBdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFJlcG9zaXRvcnkoUmVzdGFuZ3VsYXIpIHtcbiAgICB2YXIgYXBpID0gJ2FkbWluL2NvbnRlbnRzJztcbiAgICB2YXIgY29udGVudHMgPSBSZXN0YW5ndWxhci5hbGwoYXBpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvbmU6IGZ1bmN0aW9uKGlkLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuZ2V0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHRyZWU6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGkpLmdldExpc3QoJ3RyZWUnLCBwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0OiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250ZW50cy5nZXRMaXN0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGV0ZWQ6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGkpLmdldExpc3QoJ2RlbGV0ZWQnLCBwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogZnVuY3Rpb24oaWQsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5nZXRMaXN0KCdjaGlsZHJlbicsIHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIG5ld0NvbnRlbnQ6IGZ1bmN0aW9uKG5ld0NvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250ZW50cy5wb3N0KG5ld0NvbnRlbnQpO1xuICAgICAgICB9LFxuICAgICAgICB1cGRhdGVDb250ZW50OiBmdW5jdGlvbihpZCwgY29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5jdXN0b21QVVQoY29udGVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIG5ld0NvbnRlbnRUcmFuc2xhdGlvbjogZnVuY3Rpb24oaWQsIG5ld1RyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmFsbCgndHJhbnNsYXRpb25zJykucG9zdChuZXdUcmFuc2xhdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIG5ld0NvbnRlbnRSb3V0ZTogZnVuY3Rpb24oaWQsIG5ld1JvdXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmFsbCgncm91dGUnKS5wb3N0KG5ld1JvdXRlKTtcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNsYXRpb25zOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmFsbCgndHJhbnNsYXRpb25zJykuZ2V0TGlzdChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGVUcmFuc2xhdGlvbjogZnVuY3Rpb24oY29udGVudElkLCB0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgY29udGVudElkKS5vbmUoJ3RyYW5zbGF0aW9ucycsIHRyYW5zbGF0aW9uSWQpLnJlbW92ZSgpO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGVDb250ZW50OiBmdW5jdGlvbihpZCwgZm9yY2VEZWxldGUpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkub25lKGZvcmNlRGVsZXRlKS5yZW1vdmUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdG9yZUNvbnRlbnQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSArICcvcmVzdG9yZScsIGlkKS5wdXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYW46IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5zdHJpcFJlc3Rhbmd1bGFyKGVsZW0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudFJlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFJlcG9zaXRvcnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvcmVDdHJsKCRzY29wZSwgVXRpbHMsIFRyYW5zbGF0aW9ucywgTmF2QmFyLCBUb3BOYXZCYXIpIHtcbiAgICAvLyBnZXQgdHJhbnNsYXRpb25zIGxhbmd1YWdlc1xuICAgIFRyYW5zbGF0aW9ucy5nZXRUcmFuc2xhdGlvbnMoKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICRzY29wZS5sYW5ncyA9IHJlc3BvbnNlLmxhbmdzO1xuICAgICAgICAkc2NvcGUuY3VycmVudExhbmcgPSAkc2NvcGUudHJhbnNMYW5nID0gcmVzcG9uc2UuY3VycmVudExhbmc7XG4gICAgICAgIFRyYW5zbGF0aW9ucy5zZWxlY3RBZG1pbkxhbmcoJHNjb3BlLmN1cnJlbnRMYW5nKTtcbiAgICAgICAgLy8gc2V0IENLRWRpdG9yIGxhbmd1YWdlXG4gICAgICAgIFV0aWxzLmNrT3B0aW9ucy5zZXRFZGl0b3JPcHRpb24oe2xhbmd1YWdlOiAkc2NvcGUuY3VycmVudExhbmcuY29kZX0pO1xuICAgIH0pO1xuXG4gICAgLy8gYWRtaW4gcGFuZWwgbGFuZ3VhZ2VcbiAgICAkc2NvcGUuc2VsZWN0QWRtaW5MYW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIFRyYW5zbGF0aW9ucy5zZWxlY3RBZG1pbkxhbmcoJHNjb3BlLmN1cnJlbnRMYW5nKTtcbiAgICAgICAgLy8gc2V0IENLRWRpdG9yIGxhbmd1YWdlXG4gICAgICAgIFV0aWxzLmNrT3B0aW9ucy5zZXRFZGl0b3JPcHRpb24oe2xhbmd1YWdlOiAkc2NvcGUuY3VycmVudExhbmcuY29kZX0pO1xuICAgIH07XG5cbiAgICAvLyB0cmFuc2xhdGlvbnMgbGFuZ3VhZ2VcbiAgICAkc2NvcGUuc2VsZWN0TGFuZ3VhZ2UgPSBmdW5jdGlvbihsYW5nKSB7XG4gICAgICAgICRzY29wZS50cmFuc0xhbmcgPSBsYW5nO1xuICAgIH07XG5cbiAgICAvLyByZWZyZXNoIGN1cnJlbnQgc3RhdGVcbiAgICAkc2NvcGUucmVmcmVzaEN1cnJlbnRTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgfTtcblxuICAgIC8vIHJlZGlyZWN0IHVzZXIgdG8gcHJldmlvdXMgc3RhdGVcbiAgICAkc2NvcGUucmVkaXJlY3RCYWNrID0gZnVuY3Rpb24oZGVmYXVsdFN0YXRlTmFtZSkge1xuICAgICAgICBVdGlscy5yZWRpcmVjdEJhY2soZGVmYXVsdFN0YXRlTmFtZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5uYXZCYXIgPSBOYXZCYXIuZ2V0SXRlbXMoKTtcbiAgICAkc2NvcGUudG9wTmF2QmFyID0gVG9wTmF2QmFyLmdldEl0ZW1zKCk7XG4gICAgLy8gaWYgbXVsdGkgbGFuZyBpcyBzZXRcbiAgICBpZiAodHlwZW9mIFV0aWxzLkNvbmZpZy5tdWx0aWxhbmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5pc011bHRpTGFuZ0VuYWJsZWQgPSAoVXRpbHMuQ29uZmlnLm11bHRpbGFuZyA9PT0gJ3RydWUnKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgYXZhaWxhYmxlIGVudGl0aWVzIHR5cGVzXG4gICAgXy5mb3JFYWNoKFV0aWxzLmdldEVudGl0aWVzVHlwZXMoKSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAkc2NvcGVba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgLy8gaWYgYmxvY2sgcmVnaW9ucyBhcmUgc2V0XG4gICAgaWYgKHR5cGVvZiBVdGlscy5Db25maWcuYmxvY2tSZWdpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBhZGQgZGlzYWJsZWQgcmVnaW9uIGFuZCBwYXNzIHRvIHZpZXdcbiAgICAgICAgJHNjb3BlLmJsb2NrUmVnaW9ucyA9IF8udW5pb24oW251bGxdLCBVdGlscy5Db25maWcuYmxvY2tSZWdpb25zKTtcbiAgICB9XG4gICAgLy8gaWYgY3VycmVudCB1c2VyIGlkIGlzIHNldFxuICAgIGlmICh0eXBlb2YgVXRpbHMuQ29uZmlnLmN1cnJlbnRVc2VySWQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5jdXJyZW50VXNlcklkID0gVXRpbHMuQ29uZmlnLmN1cnJlbnRVc2VySWQ7XG4gICAgfVxuICAgIC8vIE9mZiBjYW52YXMgc2lkZWJhclxuICAgICRzY29wZS5zaG93U2lkZWJhciA9IGZhbHNlO1xuICAgIC8vIGNvbnRlbnQgdHJhbnNsYXRpb25zIGxhbmd1YWdlIHN3aXRjaGVyXG4gICAgJHNjb3BlLnNob3dUcmFuc0xhbmdTd2l0Y2hlciA9IGZhbHNlO1xuICAgIC8vIGFkbWluIGxhbmd1YWdlIHN3aXRjaGVyXG4gICAgJHNjb3BlLnNob3dBZG1pbkxhbmdTd2l0Y2hlciA9IHRydWU7XG4gICAgLy8gcGFzcyBzdGF0ZSB0byB2aWV3XG4gICAgJHNjb3BlLiRzdGF0ZSA9IFV0aWxzLiRzdGF0ZTtcblxuICAgIC8vIGNoZWNrIGZvciBlZGl0IHN0YXRlXG4gICAgJHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbihldmVudCwgdG9TdGF0ZSkge1xuICAgICAgICBpZiAodHlwZW9mIHRvU3RhdGUuZGF0YSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGlmICh0b1N0YXRlLm5hbWUgIT09ICdjb250ZW50LmVkaXQuaW5kZXgnKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVkaXRTdGF0ZU5hbWUgPSB0b1N0YXRlLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuc2hvd01hc2sgPSB0b1N0YXRlLmRhdGEuc2hvd01hc2s7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdFN0YXRlTmFtZSA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd01hc2sgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gaWYgdGhlcmUgaXMgbGFuZ0NvZGUgcGFyYW0gdmFsaWRhdGUgaXRcbiAgICAkc2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIHNldCBjb250ZW50IHRyYW5zbGF0aW9ucyBsYW5ndWFnZSBzd2l0Y2hlclxuICAgICAgICAkc2NvcGUuc2hvd1RyYW5zTGFuZ1N3aXRjaGVyID0gVXRpbHMuc3RhdGVJbmNsdWRlcyhbJ2NvbnRlbnQubGlzdCcsICdjb250ZW50LnRyYXNoY2FuJywgJ2Jsb2Nrcy5saXN0JywgJ2ZpbGVzLmxpc3QnXSk7XG4gICAgICAgIC8vIGRpc2FibGUgYWRtaW4gbGFuZ3VhZ2Ugc3dpdGNoZXJcbiAgICAgICAgJHNjb3BlLnNob3dBZG1pbkxhbmdTd2l0Y2hlciA9IFV0aWxzLnN0YXRlSW5jbHVkZXMoWydjb250ZW50LmFkZCcsICdjb250ZW50LmVkaXQnLCAnY29udGVudC5hZGRUcmFuc2xhdGlvbiddKTtcbiAgICAgICAgaWYgKFV0aWxzLiRzdGF0ZVBhcmFtcy5oYXNPd25Qcm9wZXJ0eSgnbGFuZ0NvZGUnKSkge1xuICAgICAgICAgICAgVHJhbnNsYXRpb25zLmNoZWNrSWZMYW5ndWFnZUlzQXZhaWxhYmxlKFV0aWxzLiRzdGF0ZVBhcmFtcy5sYW5nQ29kZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuQ29yZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ1RyYW5zbGF0aW9ucycsICdOYXZCYXInLCAnVG9wTmF2QmFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvcmVDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTdGF0ZXNEcm9wZG93bigkZHJvcGRvd24pIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZToge3N0YXRlc0Ryb3Bkb3duOiAnPSd9LFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgIHZhciBkcm9wZG93biA9ICRkcm9wZG93bihlbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdnemVyby9hZG1pbi92aWV3cy9jb3JlL2RpcmVjdGl2ZXMvc3RhdGVzRHJvcGRvd24udHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbjogJ2FtLWZsaXAteCcsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnYm90dG9tLXJpZ2h0J1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZHJvcGRvd24uJHNjb3BlLmNvbnRlbnQgPSBzY29wZS5zdGF0ZXNEcm9wZG93bjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuU3RhdGVzRHJvcGRvd24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBTdGF0ZXNEcm9wZG93bjtcbiIsImFuZ3VsYXIubW9kdWxlKCdDb3JlRmlsdGVycycsIFtdKVxuICAgIC8qKlxuICAgICAqIEZpbHRlciByZXR1cm5zIHRyYW5zbGF0YWJsZSBzdHJpbmcgYmFzZWQgb24gcHJvdmlkZWQgbGFuZ3VhZ2UgY29kZVxuICAgICAqXG4gICAgICogQHBhcmFtIGxhbmdDb2RlICBsYW5ndWFnZSBjb2RlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSB0cmFuc2xhdGFibGUgc3RyaW5nXG4gICAgICovXG4gICAgLmZpbHRlcignbGFuZ05hbWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24obGFuZ0NvZGUpIHtcbiAgICAgICAgICAgIHJldHVybiAnTEFOR19OQU1FXycgKyBhbmd1bGFyLnVwcGVyY2FzZShsYW5nQ29kZSk7XG4gICAgICAgIH07XG4gICAgfSlcbiAgICAvKipcbiAgICAgKiBGaWx0ZXIgcmV0dXJucyB0aGUgdHJhbnNsYXRpb24gaW4gcHJvdmlkZWQgbGFuZ3VhZ2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0cmFuc2xhdGlvbnMgdGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyXG4gICAgICogQHBhcmFtIGxhbmdDb2RlICBsYW5ndWFnZSBjb2RlXG4gICAgICogQHBhcmFtIGZpZWxkICBmaWVsZCBuYW1lXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSB0cmFuc2xhdGlvbiBmaWVsZFxuICAgICAqL1xuICAgIC5maWx0ZXIoJ2dldFRyYW5zbGF0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRyYW5zbGF0aW9ucywgbGFuZ0NvZGUsIGZpZWxkKSB7XG4gICAgICAgICAgICB2YXIgY3VycmVudFRyYW5zbGF0aW9uID0gXy5maWx0ZXIodHJhbnNsYXRpb25zLCBmdW5jdGlvbih0cmFuc2xhdGlvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFuc2xhdGlvbi5sYW5nQ29kZSA9PT0gbGFuZ0NvZGU7XG4gICAgICAgICAgICB9KS5zaGlmdCgpO1xuICAgICAgICAgICAgaWYgKF8uaGFzKGN1cnJlbnRUcmFuc2xhdGlvbiwgZmllbGQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRUcmFuc2xhdGlvbltmaWVsZF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pXG4gICAgLyoqXG4gICAgICogRmlsdGVyIHJldHVybnMgdGhlIG9wdGlvbiB2YWx1ZSBpbiBwcm92aWRlZCBsYW5ndWFnZVxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXJcbiAgICAgKiBAcGFyYW0gbGFuZ0NvZGUgIGxhbmd1YWdlIGNvZGVcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IHZhbHVlIGZpZWxkXG4gICAgICovXG4gICAgLmZpbHRlcignZ2V0T3B0aW9uVmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWVzLCBsYW5nQ29kZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHZhbHVlcywgZnVuY3Rpb24odmFsdWUsIGNvZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29kZSA9PT0gbGFuZ0NvZGU7XG4gICAgICAgICAgICB9KS5zaGlmdCgpO1xuICAgICAgICB9O1xuICAgIH0pXG4gICAgLyoqXG4gICAgICogRmlsdGVyIGNoZWNrcyBpZiBzcGVjaWZpZWQgbm9kZSBleGlzdHMgaW4gcHJvdmlkZWQgcGF0aFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhdGggdGhlIG5vZGUgcGF0aCB0byBpdGVyYXRlIG92ZXJcbiAgICAgKiBAcGFyYW0gaWQgIG5vZGUgaWRcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtib29sfSB0cnVlIG9yIGZhbHNlXG4gICAgICovXG4gICAgLmZpbHRlcignbm9kZUluUGF0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihwYXRoLCBpZCkge1xuICAgICAgICAgICAgLy8gaWYgcGF0aCBleGlzdHMgYW5kIG5vdCBlbXB0eVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXRoICE9PSAndW5kZWZpbmVkJyAmJiBwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aC5pbmRleE9mKGlkKSA+IC0xO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSlcblxuICAgIC8qKlxuICAgICAqIFRoaXMgZmlsdGVyIGxldHMgeW91IG1hcmsgSFRNTCBhcyDigJxzYWZl4oCdIGZvciBhbmd1bGFyIHRvIHVzZSBhbmQgc2hvdyBvbiBhIHBhZ2UuXG4gICAgICogT3RoZXJ3aXNlLCBhbmd1bGFyIHdvdWxkIGp1c3Qgc2hvdyB0aGUgSFRNTCBhcyBwbGFpbiB0ZXh0LlxuICAgICAqL1xuICAgIC5maWx0ZXIoJ3RydXN0QXNIdG1sJywgZnVuY3Rpb24oJHNjZSkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiAkc2NlLnRydXN0QXNIdG1sO1xuICAgIH0pXG5cbiAgICAvKipcbiAgICAgKiBQYXJzZSBJU08gODYwMSBkYXRlIHRvIHNwZWNpZmllZCBmb3JtYXRcbiAgICAgKiBAcGFyYW0gZm9ybWF0IHN0cmluZyBleHBlY3RlZCBkYXRlIGZvcm1hdFxuICAgICAqL1xuICAgIC5maWx0ZXIoJ2Zvcm1hdERhdGUnLCBmdW5jdGlvbigkZmlsdGVyKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGVTVFIsIGZvcm1hdCkge1xuICAgICAgICAgICAgdmFyIGQgPSBEYXRlLnBhcnNlKGRhdGVTVFIpO1xuICAgICAgICAgICAgaWYgKCFmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSAneXl5eS1NTS1kZCBoaDptbTpzcyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJGZpbHRlcignZGF0ZScpKGQsIGZvcm1hdCk7XG4gICAgICAgIH07XG4gICAgfSlcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBodG1sIHRhZ3MsIGFuZCB0cmltIHN0cmluZyB0byBnaXZlbiBsZW5ndGggd2l0aG91dCBicmVha2luZyB3b3Jkc1xuICAgICAqIEBwYXJhbSBsZW4gZXhwZWN0ZWQgbGVuZ3RoXG4gICAgICovXG4gICAgLmZpbHRlcignc3RyaXBUYWdzQW5kVHJpbScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihzdHIsIGxlbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgvPFxcLz9bXj5dKyg+fCQpL2csICcnKS5zdWJzdHIoMCwgbGVuKTtcbiAgICAgICAgICAgICAgICBzdHIgPSBzdHIuc3Vic3RyKDAsIE1hdGgubWluKHN0ci5sZW5ndGgsIHN0ci5sYXN0SW5kZXhPZignICcpKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJy4vZmlsdGVycy9Db3JlRmlsdGVycy5qcycpO1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4uY29yZScsIFsnQ29yZUZpbHRlcnMnXSlcbiAgLmNvbmZpZyhbXG4gICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgIC5zdGF0ZSgnbG9nb3V0Jywge1xuICAgICAgICAgIHVybDogJy9sb2dvdXQnLFxuICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICdBcGlSZXBvc2l0b3J5JywgZnVuY3Rpb24oQXBpUmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICBBcGlSZXBvc2l0b3J5LmxvZ291dCgpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZ3plcm9fYXBpX3Rva2VuJyk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0pO1xuICAgIH1cbiAgXSlcbiAgLmNvbnRyb2xsZXIoJ0NvcmVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db3JlQ3RybC5qcycpKVxuICAuZmFjdG9yeSgnTGFuZ1JlcG9zaXRvcnknLCByZXF1aXJlKCcuL3NlcnZpY2VzL0xhbmdSZXBvc2l0b3J5LmpzJykpXG4gIC5mYWN0b3J5KCdBcGlSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9BcGlSZXBvc2l0b3J5LmpzJykpXG4gIC5mYWN0b3J5KCdOYXZCYXInLCByZXF1aXJlKCcuL3NlcnZpY2VzL05hdkJhci5qcycpKVxuICAuZmFjdG9yeSgnVG9wTmF2QmFyJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9Ub3BOYXZCYXIuanMnKSlcbiAgLmZhY3RvcnkoJ05vdGlmaWNhdGlvbnMnLCByZXF1aXJlKCcuLi9saWIvTm90aWZpY2F0aW9ucy5qcycpKVxuICAuZmFjdG9yeSgnY2tPcHRpb25zJywgcmVxdWlyZSgnLi4vbGliL2NrT3B0aW9ucy5qcycpKVxuICAuZmFjdG9yeSgnVHJhbnNsYXRpb25zJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9UcmFuc2xhdGlvbnMuanMnKSlcbiAgLmZhY3RvcnkoJ1N0b3JhZ2UnLCByZXF1aXJlKCcuLi9saWIvU3RvcmFnZS5qcycpKVxuICAuZmFjdG9yeSgnVXRpbHMnLCByZXF1aXJlKCcuL3NlcnZpY2VzL1V0aWxzLmpzJykpXG4gIC5kaXJlY3RpdmUoJ3N0YXRlc0Ryb3Bkb3duJywgWyckZHJvcGRvd24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvU3RhdGVzRHJvcGRvd24uanMnKV0pXG4gIC5ydW4oW1xuICAgICdUb3BOYXZCYXInLFxuICAgICdVc2VyUmVwb3NpdG9yeScsXG4gICAgJ1V0aWxzJyxcbiAgICBmdW5jdGlvbihUb3BOYXZCYXIsIFVzZXJSZXBvc2l0b3J5LCBVdGlscykge1xuXG4gICAgICBVc2VyUmVwb3NpdG9yeS5vbmUoVXRpbHMuQ29uZmlnLmN1cnJlbnRVc2VySWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgdmFyIHVzZXIgPSByZXNwb25zZTtcbiAgICAgICAgdXNlci5mdWxsTmFtZSA9IHVzZXIuZmlyc3ROYW1lICsgJyAnICsgdXNlci5sYXN0TmFtZTtcblxuICAgICAgICBUb3BOYXZCYXIuYWRkKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUEFHRV9QUkVWSUVXJyxcbiAgICAgICAgICAgIGFjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICB1cmw6ICcvJ1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgVG9wTmF2QmFyLmFkZChcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogdXNlci5mdWxsTmFtZSxcbiAgICAgICAgICAgIGFjdGlvbjogJ2NvbnRlbnQubGlzdCdcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFRvcE5hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgdXNlci5mdWxsTmFtZSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ1BST0ZJTEUnLFxuICAgICAgICAgICAgYWN0aW9uOiAndXNlci5lZGl0KHt1c2VySWQ6ICcgKyB1c2VyLmlkICsgJ30pJ1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgVG9wTmF2QmFyLmFkZExhc3RDaGlsZChcbiAgICAgICAgICB1c2VyLmZ1bGxOYW1lLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnTE9HX09VVCcsXG4gICAgICAgICAgICBhY3Rpb246ICdsb2dvdXQnXG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICB9XG4gIF0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBBcGlSZXBvc2l0b3J5KFJlc3Rhbmd1bGFyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbG9naW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZSgnL2xvZ2luJykucG9zdCgpO1xuICAgICAgICB9LFxuICAgICAgICBsb2dvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZSgnL2xvZ291dCcpLnBvc3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYW46IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5zdHJpcFJlc3Rhbmd1bGFyKGVsZW0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQXBpUmVwb3NpdG9yeS4kaW5qZWN0ID0gWydSZXN0YW5ndWxhciddO1xubW9kdWxlLmV4cG9ydHMgPSBBcGlSZXBvc2l0b3J5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBMYW5nUmVwb3NpdG9yeShSZXN0YW5ndWxhcikge1xuICAgIC8qKlxuICAgICAqIEN1c3RvbSBtZXRob2RzXG4gICAgICovXG4gICAgUmVzdGFuZ3VsYXIuZXh0ZW5kTW9kZWwoJ2xhbmdzJywgZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgbW9kZWwudGVzdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICd0ZXN0JztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH0pO1xuXG4gICAgdmFyIGFwaSA9IFJlc3Rhbmd1bGFyLmFsbCgnYWRtaW4vbGFuZ3MnKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvbmU6IGZ1bmN0aW9uKGNvZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBhcGkuZ2V0KGNvZGUpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBhcGkuZ2V0TGlzdCgpO1xuICAgICAgICB9LFxuICAgICAgICBjbGVhbjogZnVuY3Rpb24oZWxlbSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLnN0cmlwUmVzdGFuZ3VsYXIoZWxlbSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5MYW5nUmVwb3NpdG9yeS4kaW5qZWN0ID0gWydSZXN0YW5ndWxhciddO1xubW9kdWxlLmV4cG9ydHMgPSBMYW5nUmVwb3NpdG9yeTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTmF2QmFyKCkge1xuICAgIC8qKiBAdmFyIE5hdmlnYXRpb24gKi9cbiAgICByZXR1cm4gcmVxdWlyZSgnLi4vLi4vbGliL25hdmlnYXRpb24uanMnKSgpO1xufVxuXG5tb2R1bGUuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBOYXZCYXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRvcE5hdkJhcigpIHtcbiAgICAvKiogQHZhciBOYXZpZ2F0aW9uICovXG4gICAgcmV0dXJuIHJlcXVpcmUoJy4uLy4uL2xpYi9uYXZpZ2F0aW9uLmpzJykoKTtcbn1cblxubW9kdWxlLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gVG9wTmF2QmFyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUcmFuc2xhdGlvbnMoJHEsICR0cmFuc2xhdGUsIExhbmdSZXBvc2l0b3J5LCBVdGlscykge1xuICAgIC8vY3JlYXRlIGRlZmVycmVkIHByb21pc2VcbiAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgIHZhciBsYW5ndWFnZXMgPSB7fTtcblxuICAgIC8vZ2V0IGxhbmd1YWdlc1xuICAgIExhbmdSZXBvc2l0b3J5Lmxpc3QoKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIGxhbmd1YWdlcy5sYW5ncyA9IHJlc3BvbnNlO1xuICAgICAgICBsYW5ndWFnZXMuY3VycmVudExhbmcgPSBsYW5ndWFnZXMudHJhbnNMYW5nID0gcmVzcG9uc2VbMF07XG4gICAgICAgIC8vIHJlc29sdmUgdGhlIHByb21pc2VcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShsYW5ndWFnZXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJldHVybnMgdGhlIG9iamVjdCBvZiBsYW5ndWFnZXNcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGdldFRyYW5zbGF0aW9uczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNldHMgdGhlIGxhbmd1YWdlIG9mIHRoZSB0cmFuc2xhdGlvbiBmb3IgdGhlIGFuZ3VsYXItdHJhbnNsYXRlIG1vZHVsZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbGFuZyBvYmplY3QgdGhhdCB3aWxsIGJlIHVzZWQgdG8gdHJhbnNsYXRlXG4gICAgICAgICAqL1xuICAgICAgICBzZWxlY3RBZG1pbkxhbmc6IGZ1bmN0aW9uKGxhbmcpIHtcbiAgICAgICAgICAgICR0cmFuc2xhdGUuZmFsbGJhY2tMYW5ndWFnZShbJ2VuX1VTJ10pO1xuICAgICAgICAgICAgJHRyYW5zbGF0ZS51c2UobGFuZy5pMThuKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlZGlyZWN0IGlmIHVzZXIgdHJ5IHRvIGFjY2VzcyBub24gZXhpc3RpbmcgbGFuZ3VhZ2VcbiAgICAgICAgICogQHBhcmFtIGxhbmdDb2RlXG4gICAgICAgICAqL1xuICAgICAgICBjaGVja0lmTGFuZ3VhZ2VJc0F2YWlsYWJsZTogZnVuY3Rpb24obGFuZ0NvZGUpIHtcbiAgICAgICAgICAgIHZhciBhdmFpbGFibGUgPSBbXTtcbiAgICAgICAgICAgIGlmIChsYW5ndWFnZXMgPT09IHt9KSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGxhbmd1YWdlcywgZnVuY3Rpb24odiwgaykge1xuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGUucHVzaCh2LmNvZGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChhdmFpbGFibGUuaW5kZXhPZihsYW5nQ29kZSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ0xBTkdVQUdFX05PVF9GT1VORCcpO1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIExhbmdSZXBvc2l0b3J5Lmxpc3QoKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChMYW5nUmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSksIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZS5wdXNoKHYuY29kZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXZhaWxhYmxlLmluZGV4T2YobGFuZ0NvZGUpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRFcnJvcignTEFOR1VBR0VfTk9UX0ZPVU5EJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn1cblRyYW5zbGF0aW9ucy4kaW5qZWN0ID0gWyckcScsICckdHJhbnNsYXRlJywgJ0xhbmdSZXBvc2l0b3J5JywgJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zbGF0aW9ucztcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVdGlscyhOb3RpZmljYXRpb25zLCBTdG9yYWdlLCAkc3RhdGUsICRwcmV2aW91c1N0YXRlLCAkc3RhdGVQYXJhbXMsIGNrT3B0aW9ucywgaG90a2V5cywgJGZpbHRlcikgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuICAgIHJldHVybiB7XG4gICAgICAgIE5vdGlmaWNhdGlvbnM6IE5vdGlmaWNhdGlvbnMsXG4gICAgICAgIFN0b3JhZ2U6IFN0b3JhZ2UsXG4gICAgICAgICRzdGF0ZTogJHN0YXRlLFxuICAgICAgICAkc3RhdGVQYXJhbXM6ICRzdGF0ZVBhcmFtcyxcbiAgICAgICAgJHByZXZpb3VzU3RhdGU6ICRwcmV2aW91c1N0YXRlLFxuICAgICAgICBDb25maWc6IENvbmZpZyxcbiAgICAgICAgY2tPcHRpb25zOiBja09wdGlvbnMsXG4gICAgICAgIGhvdGtleXM6IGhvdGtleXMsXG4gICAgICAgICRmaWx0ZXI6ICRmaWx0ZXIsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWRpcmVjdCB1c2VyIHRvIHByZXZpb3VzIHN0YXRlXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZWZhdWx0U3RhdGVOYW1lIGRlZmF1bHQgc3RhdGUgbmFtZVxuICAgICAgICAgKi9cbiAgICAgICAgcmVkaXJlY3RCYWNrOiBmdW5jdGlvbihkZWZhdWx0U3RhdGVOYW1lKSB7XG4gICAgICAgICAgICAvLyBnZXRzIGEgcmVmZXJlbmNlIHRvIHRoZSBwcmV2aW91cyBzdGF0ZS5cbiAgICAgICAgICAgIHZhciBwcmV2aW91c1N0YXRlID0gJHByZXZpb3VzU3RhdGUuZ2V0KCk7XG4gICAgICAgICAgICAvLyBzZXQgZGVmYXVsdCBuYW1lIGZvciB0aGUgcmVkaXJlY3QgaWYgaXQgaXMgaXMgbm90IHNwZWNpZmllZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBkZWZhdWx0U3RhdGVOYW1lID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGRlZmF1bHRTdGF0ZU5hbWUgPSAnaG9tZSc7IC8vIFJlZGlyZWN0IHRvIGhvbWVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgYSBwcmV2aW91c1N0YXRlXG4gICAgICAgICAgICBpZiAocHJldmlvdXNTdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIHJlZGlyZWN0ZWQgYmFjayB0byB0aGUgc3RhdGUgd2UgY2FtZSBmcm9tXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHByZXZpb3VzU3RhdGUuc3RhdGUubmFtZSwgcHJldmlvdXNTdGF0ZS5wYXJhbXMsIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGdvIHRvIGRlZmF1bHQgc3RhdGVcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oZGVmYXVsdFN0YXRlTmFtZSwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGZ1bmN0aW9uIGNoZWNrcyBpZiBvbmUgb2YgcHJvdmlkZWQgc3RhdGUgbmFtZXMgaXMgaW5jbHVkZWQgaW4gY3VycmVudCBzdGF0ZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge2FycmF5fSBzdGF0ZU5hbWVzIHRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3ZlclxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbH0gd2hldGhlciBhbnkgb2Ygc3RhdGUgZXhpc3RzXG4gICAgICAgICAqL1xuICAgICAgICBzdGF0ZUluY2x1ZGVzOiBmdW5jdGlvbihzdGF0ZU5hbWVzKSB7XG4gICAgICAgICAgICB2YXIgaW5jbHVkZXMgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdGVOYW1lcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goc3RhdGVOYW1lcywgZnVuY3Rpb24oc3RhdGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkc3RhdGUuaW5jbHVkZXMoc3RhdGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBpbmNsdWRlcztcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiB0cmFuc2xhdGlvbiB3aXRoIHNwZWNpZmllZCBsYW5nIHByb3BlcnR5IGZyb20gdHJhbnNsYXRpb25zIGFycmF5XG4gICAgICAgICAqIGFuZCBmZXRjaCBsYW5nIHByb3BlcnR5XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0cmFuc2xhdGlvbnMgVHJhbnNsYXRpb25zIGFycmF5XG4gICAgICAgICAqIEBwYXJhbSBsYW5nQ29kZSBsYW5ndWFnZSBjb2RlXG4gICAgICAgICAqIEByZXR1cm5zIE9iamVjdCB8IGZhbHNlXG4gICAgICAgICAqL1xuICAgICAgICBnZXRUcmFuc2xhdGlvbkJ5TGFuZzogZnVuY3Rpb24odHJhbnNsYXRpb25zLCBsYW5nQ29kZSkge1xuICAgICAgICAgICAgdmFyIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgIGlmICghdHJhbnNsYXRpb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0cmFuc2xhdGlvbi5sYW5nQ29kZSA9PT0gbGFuZ0NvZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNsYXRpb247XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFRyYW5zbGF0aW9uQnlMYW5nKHRyYW5zbGF0aW9ucywgbGFuZ0NvZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIGFsbCBhdmFpbGFibGUgZW50aXRpZXMgdHlwZXMgb2JqZWN0IGZyb20gY29uZmlnXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIE9iamVjdCBhdmFpbGFibGUgZW50aXRpZXMgdHlwZXNcbiAgICAgICAgICovXG4gICAgICAgIGdldEVudGl0aWVzVHlwZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBjb250ZW50VHlwZXM6IHRoaXMuQ29uZmlnLmNvbnRlbnRUeXBlcyxcbiAgICAgICAgICAgICAgICBibG9ja1R5cGVzOiB0aGlzLkNvbmZpZy5ibG9ja1R5cGVzLFxuICAgICAgICAgICAgICAgIGZpbGVUeXBlczogdGhpcy5Db25maWcuZmlsZVR5cGVzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcblxufVxuXG5tb2R1bGUuJGluamVjdCA9IFtcbiAgICAnTm90aWZpY2F0aW9ucycsXG4gICAgJ1N0b3JhZ2UnLFxuICAgICckc3RhdGUnLFxuICAgICckcHJldmlvdXNTdGF0ZScsXG4gICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgJ2NrT3B0aW9ucycsXG4gICAgJ2hvdGtleXMnLFxuICAgICckZmlsdGVyJ1xuXTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlscztcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsZXNBZGRDdHJsKCRxLCAkc2NvcGUsIFV0aWxzLCB0eXBlLCBVcGxvYWQsIEZpbGVzUmVwb3NpdG9yeSwgRmlsZVNlcnZpY2UpIHsgLy9qc2hpbnQgaWdub3JlOmxpbmVcbiAgICAkc2NvcGUuZmlsZXMgPSBbXTtcbiAgICAkc2NvcGUucHJvZ3Jlc3MgPSBbXTtcbiAgICAkc2NvcGUuaXNCdXN5ID0gZmFsc2U7XG4gICAgLy8gZGVmYXVsdCBmaWxlIHJlY29yZCB2YWx1ZXNcbiAgICAkc2NvcGUubmV3RmlsZURlZmF1bHRzID0ge1xuICAgICAgICBpc0FjdGl2ZTogMSxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICBsYW5nQ29kZTogVXRpbHMuQ29uZmlnLmRlZmF1bHRMYW5nQ29kZVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIHNldCB0cmFuc2xhdGlvbnMgbGFuZyBjb2RlXG4gICAgaWYgKHR5cGVvZiAkc2NvcGUudHJhbnNMYW5nICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubmV3RmlsZURlZmF1bHRzLnRyYW5zbGF0aW9ucy5sYW5nQ29kZSA9ICRzY29wZS50cmFuc0xhbmcuY29kZTtcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgZmlsZSBmcm9tIGZpbGVzIHF1ZXVlXG4gICAgJHNjb3BlLnJlbW92ZUZpbGUgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAkc2NvcGUuZmlsZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgJHNjb3BlLnByb2dyZXNzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcblxuICAgIC8qIFNldCB0aGUgZGVmYXVsdCB2YWx1ZXMgZm9yIG5nZi1zZWxlY3QgYW5kIG5nZi1kcm9wIGRpcmVjdGl2ZXMqL1xuICAgICRzY29wZS5pbnZhbGlkRmlsZXMgPSBbXTtcbiAgICBVcGxvYWQuc2V0RGVmYXVsdHMoe1xuICAgICAgICBuZ2ZNYXhUb3RhbFNpemU6ICc1TUInLCAvL0BUT0RPIGFsbG93ZWQgdG90YWwgZmlsZXMgc2l6ZVxuICAgICAgICBuZ2ZLZWVwOiAnXCJkaXN0aW5jdFwiJyxcbiAgICAgICAgbmdmTWF4RmlsZXM6IDEwLCAvL0BUT0RPIGFsbG93ZWQgbWF4IGZpbGVzIG51bWJlclxuICAgICAgICBuZ2ZWYWxpZGF0ZToge3BhdHRlcm46IEZpbGVTZXJ2aWNlLmdldFR5cGVFeHRlbnNpb25zUGF0dGVybih0eXBlKX0sIC8vYWxsb3dlZCB0eXBlIGZpbGVzIGV4dGVuc2lvbnNcbiAgICAgICAgbmdmTW9kZWxJbnZhbGlkOiAnaW52YWxpZEZpbGVzJ1xuICAgIH0pO1xuXG4gICAgLy8gZmlsZSBQT1NUIGFjdGlvblxuICAgICRzY29wZS5zYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5pc0J1c3kgPSB0cnVlO1xuICAgICAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICAgICAgXy5lYWNoKCRzY29wZS5maWxlcywgZnVuY3Rpb24oZmlsZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IF8uY2xvbmVEZWVwKCRzY29wZS5uZXdGaWxlRGVmYXVsdHMpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSBGaWxlU2VydmljZS5wcmVwYXJlUmVxdWVzdERhdGEoZmlsZSwgZGVmYXVsdHMpO1xuICAgICAgICAgICAgcHJvbWlzZXMucHVzaChGaWxlc1JlcG9zaXRvcnkuY3JlYXRlKGRhdGEpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVtb3ZlRmlsZShpbmRleCk7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdGSUxFX0NSRUFURUQnLCB7ZmlsZU5hbWU6IGZpbGUubmFtZX0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvZ3Jlc3NbaW5kZXhdID0gMDtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioe2ZpbGVOYW1lOiBmaWxlLm5hbWV9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgICAgIC8vIHByb2dyZXNzIG5vdGlmeVxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9ncmVzc1tpbmRleF0gPSBwYXJzZUludCgxMDAuMCAqIGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcS5hbGwocHJvbWlzZXMpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNCdXN5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgLy8gaWYgYW55IG9mIHRoZSBmaWxlIHByb2Nlc3NpbmcgcHJvZHVjZWQgYW4gZXJyb3JcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2ZpbGVzLmxpc3QnLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgICRzY29wZS5pc0J1c3kgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZEVycm9yKCdGSUxFX0NSRUFURV9FUlJPUicsIGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG59XG5cbkZpbGVzQWRkQ3RybC4kaW5qZWN0ID0gWyckcScsICckc2NvcGUnLCAnVXRpbHMnLCAndHlwZScsICdVcGxvYWQnLCAnRmlsZXNSZXBvc2l0b3J5JywgJ0ZpbGVTZXJ2aWNlJ107XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZXNBZGRDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWxlc0FkZFRyYW5zbGF0aW9uQ3RybCgkc2NvcGUsIFV0aWxzLCBGaWxlc1JlcG9zaXRvcnkpIHtcbiAgICAvLyBkZWZhdWx0IHRyYW5zbGF0aW9ucyBsYW5nIGNvZGVcbiAgICAkc2NvcGUubmV3RmlsZVRyYW5zbGF0aW9uID0ge1xuICAgICAgICBsYW5nQ29kZTogVXRpbHMuJHN0YXRlUGFyYW1zLmxhbmdDb2RlXG4gICAgfTtcblxuICAgIC8vIGNvbnRlbnRzIFBPU1QgYWN0aW9uXG4gICAgJHNjb3BlLmFkZEZpbGVUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBGaWxlc1JlcG9zaXRvcnkubmV3VHJhbnNsYXRpb24oVXRpbHMuJHN0YXRlUGFyYW1zLmZpbGVJZCwgJHNjb3BlLm5ld0ZpbGVUcmFuc2xhdGlvbikudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgLy8gUmVkaXJlY3QgdXNlciB0byBwcmV2aW91cyBzdGF0ZSBvciBmaWxlcyBsaXN0XG4gICAgICAgICAgICBVdGlscy5yZWRpcmVjdEJhY2soJ2ZpbGVzLmxpc3QnKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cbkZpbGVzQWRkVHJhbnNsYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdGaWxlc1JlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZXNBZGRUcmFuc2xhdGlvbkN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVzRGV0YWlsc0N0cmwoJHNjb3BlLCBmaWxlLCBsYW5nQ29kZSwgRmlsZXNSZXBvc2l0b3J5LCBVdGlscykge1xuXG4gICAgLy8gVE9ETzogZ2V0IHJlZ2lzdGVyZWQgdGFic1xuICAgICRzY29wZS50YWJzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ1BSRVZJRVcnLFxuICAgICAgICAgICAgYWN0aW9uOiAnZGV0YWlscycsXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlIC8vIGRlZmF1bHQgYWN0aXZlIHRhYiBpbiBzZXR0aW5ncyBlZGl0IG1vZGVcbiAgICAgICAgfVxuICAgICAgICAvLyB7XG4gICAgICAgIC8vICAgICB0aXRsZTogJ0JMT0NLUycsXG4gICAgICAgIC8vICAgICBhY3Rpb246ICdibG9ja3MnXG4gICAgICAgIC8vIH1cbiAgICBdO1xuXG4gICAgLy8gaWYgbGFuZyBjb2RlIGV4aXN0c1xuICAgIGlmICh0eXBlb2YgbGFuZ0NvZGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5sYW5nQ29kZSA9IGxhbmdDb2RlO1xuICAgIH1cblxuICAgIC8vIGlmIGZpbGUgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBmaWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUuZmlsZSA9IEZpbGVzUmVwb3NpdG9yeS5jbGVhbihmaWxlKTtcbiAgICAgICAgJHNjb3BlLmFjdGl2ZVRyYW5zbGF0aW9uID0gVXRpbHMuZ2V0VHJhbnNsYXRpb25CeUxhbmcoKGZpbGUudHJhbnNsYXRpb25zLnNsaWNlKDApKSwgbGFuZ0NvZGUpO1xuICAgIH1cbn1cbkZpbGVzRGV0YWlsc0N0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2ZpbGUnLCAnbGFuZ0NvZGUnLCAnRmlsZXNSZXBvc2l0b3J5JywgJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVzRGV0YWlsc0N0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVzRGV0YWlsc0VkaXRDdHJsKCRzY29wZSwgZmlsZSwgbGFuZ0NvZGUsIEZpbGVzUmVwb3NpdG9yeSwgVXRpbHMpIHtcblxuICAgIC8vIGlmIGZpbGUgdHJhbnNsYXRpb24gaXMgbm90IHNldFxuICAgIGlmICh0eXBlb2YgJHNjb3BlLmFjdGl2ZVRyYW5zbGF0aW9uID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUuYWN0aXZlVHJhbnNsYXRpb24gPSBVdGlscy5nZXRUcmFuc2xhdGlvbkJ5TGFuZygoZmlsZS50cmFuc2xhdGlvbnMuc2xpY2UoMCkpLCBsYW5nQ29kZSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnNhdmVGaWxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIEZpbGVzUmVwb3NpdG9yeS5uZXdUcmFuc2xhdGlvbigkc2NvcGUuZmlsZS5pZCwgJHNjb3BlLmFjdGl2ZVRyYW5zbGF0aW9uKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdmaWxlcy5zaG93LmRldGFpbHMnLCB7XG4gICAgICAgICAgICAgICAgZmlsZUlkOiBmaWxlLmlkLFxuICAgICAgICAgICAgICAgIGxhbmdDb2RlOiBsYW5nQ29kZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ1RIRV9DSEFOR0VTX0hBVkVfQkVFTl9TQVZFRCcpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG59XG5GaWxlc0RldGFpbHNFZGl0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZmlsZScsICdsYW5nQ29kZScsICdGaWxlc1JlcG9zaXRvcnknLCAnVXRpbHMnXTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZXNEZXRhaWxzRWRpdEN0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgRmlsZUNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsZXNMaXN0Q3RybCgkc2NvcGUsIFV0aWxzLCBGaWxlc1JlcG9zaXRvcnksIE5nVGFibGVQYXJhbXMpIHtcbiAgICAvLyBUT0RPOiBmaWxlIGFkZCBidXR0b24gbGlua3MgZm9yIG90aGVyIHR5cGVzXG4gICAgJHNjb3BlLmZpbGVBZGRCdXR0b25MaW5rcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ0FERF9JTUFHRVMnLFxuICAgICAgICAgICAgaHJlZjogJ2ZpbGVzLmFkZCh7IHR5cGU6IFwiaW1hZ2VcIiB9KScsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtZmlsZS1pbWFnZS1vJ1xuXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdBRERfRE9DVU1FTlRTJyxcbiAgICAgICAgICAgIGhyZWY6ICdmaWxlcy5hZGQoeyB0eXBlOiBcImRvY3VtZW50XCIgfSknLFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWZpbGUtcGRmLW8nXG4gICAgICAgIH1cbiAgICBdO1xuXG4gICAgJHNjb3BlLnRhYmxlUGFyYW1zID0gbmV3IE5nVGFibGVQYXJhbXMoe1xuICAgICAgICBjb3VudDogMjUsIC8vIGNvdW50IHBlciBwYWdlXG4gICAgICAgIHNvcnRpbmc6IHtcbiAgICAgICAgICAgICd0cmFuc2xhdGlvbnMudGl0bGUnOiAnYXNjJyAvLyBpbml0aWFsIHNvcnRpbmdcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAgdG90YWw6IDAsIC8vIGxlbmd0aCBvZiBkYXRhXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCRkZWZlciwgcGFyYW1zKSB7XG4gICAgICAgICAgICAkc2NvcGUucmVxdWVzdFBlbmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgLy8gcHJlcGFyZSBvcHRpb25zIHRvIGJlIHNlbnQgdG8gYXBpXG4gICAgICAgICAgICB2YXIgcXVlcnlPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGxhbmc6IFV0aWxzLkNvbmZpZy5kZWZhdWx0TGFuZ0NvZGVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGxhbmcgc29ydCBvcHRpb25zXG4gICAgICAgICAgICBpZiAodHlwZW9mICRzY29wZS50cmFuc0xhbmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLmxhbmcgPSAkc2NvcGUudHJhbnNMYW5nLmNvZGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVdGlscy4kc3RhdGVQYXJhbXMgLSBmaWx0ZXJzIGZyb20gc3RhdGUgcGFyYW1zXG4gICAgICAgICAgICB2YXIgZmlsdGVycyA9IFV0aWxzLiRzdGF0ZVBhcmFtcztcbiAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucyA9IF8ubWVyZ2UocXVlcnlPcHRpb25zLCBmaWx0ZXJzKTtcbiAgICAgICAgICAgICRzY29wZS5hY3RpdmVGaWx0ZXIgPSBmaWx0ZXJzO1xuXG4gICAgICAgICAgICAvLyBnZXQgbGlzdCBieSBkZWZhdWx0XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IEZpbGVzUmVwb3NpdG9yeS5saXN0KHF1ZXJ5T3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIFByb21pc2UgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlcXVlc3RQZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKEZpbGVzUmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5tZXRhID0gcmVzcG9uc2UubWV0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbkZpbGVzTGlzdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ0ZpbGVzUmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJ107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVzTGlzdEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVzRGVsZXRlQ3RybCgkc2NvcGUsIFV0aWxzLCBGaWxlc1JlcG9zaXRvcnksICRtb2RhbCkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2ZpbGVzL2RpcmVjdGl2ZXMvJztcbiAgICAvLyBEZWxldGUgbW9kYWxcbiAgICB2bS5kZWxldGVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdmaWxlRGVsZXRlTW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEJpbmQgaG90a2V5c1xuICAgICAgICAgICAgVXRpbHMuaG90a2V5cy5hZGQoe1xuICAgICAgICAgICAgICAgIGNvbWJvOiAnZW50ZXInLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBVdGlscy4kZmlsdGVyKCd0cmFuc2xhdGUnKSgnQ09ORklSTV9ERUxFVEUnKSxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZGVsZXRlRmlsZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBGaWxlSWQgRmlsZSBpZCB0byBiZSByZW1vdmVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oRmlsZUlkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5GaWxlSWQgPSBGaWxlSWQ7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnREVMRVRFX0ZJTEVfUVVFU1RJT04nKTtcbiAgICAgICAgICAgIFV0aWxzLmhvdGtleXMuZGVsKCdlbnRlcicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBERUxFVEUgYWN0aW9uIGZvciBGaWxlIGlkIGluIHNjb3BlXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBkZWxldGVGaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIC8vIEZvcmNlIGRlbGV0ZSBGaWxlXG4gICAgICAgICAgICBGaWxlc1JlcG9zaXRvcnkuZGVsZXRlKHZtLkZpbGVJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbyhVdGlscy4kc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ0ZJTEVfSEFTX0JFRU5fREVMRVRFRCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5GaWxlc0RlbGV0ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ0ZpbGVzUmVwb3NpdG9yeScsICckbW9kYWwnXTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZXNEZWxldGVDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIEZpbGVzRGVsZXRlVHJhbnNsYXRpb25DdHJsXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVzRGVsZXRlVHJhbnNsYXRpb25DdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgRmlsZXNSZXBvc2l0b3J5KSB7XG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvZmlsZXMvZGlyZWN0aXZlcy8nO1xuICAgIC8vIERlbGV0ZSBtb2RhbFxuICAgIHZtLmRlbGV0ZU1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZXMgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3RyYW5zbGF0aW9uRGVsZXRlTW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGZpbGVJZCBmaWxlcyBpZFxuICAgICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25JZCB0cmFuc2xhdGlvbiBpZFxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihmaWxlSWQsIHRyYW5zbGF0aW9uSWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmZpbGVJZCA9IGZpbGVJZDtcbiAgICAgICAgICAgIHZtLnRyYW5zbGF0aW9uSWQgPSB0cmFuc2xhdGlvbklkO1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ0RFTEVURV9UUkFOU0xBVElPTl9RVUVTVElPTicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBERUxFVEUgYWN0aW9uIGZvciB0cmFuc2xhdGlvbiBpZCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgZGVsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgRmlsZXNSZXBvc2l0b3J5LmRlbGV0ZVRyYW5zbGF0aW9uKHZtLmZpbGVJZCwgdm0udHJhbnNsYXRpb25JZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ1RSQU5TTEFUSU9OX0hBU19CRUVOX0RFTEVURUQnKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUucmVsb2FkKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5GaWxlc0RlbGV0ZVRyYW5zbGF0aW9uQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0ZpbGVzUmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlc0RlbGV0ZVRyYW5zbGF0aW9uQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBGaWxlc1RvZ2dsZVByb3BlcnR5Q3RybFxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWxlc1RvZ2dsZVByb3BlcnR5Q3RybChVdGlscywgRmlsZXNSZXBvc2l0b3J5KSB7XG4gICAgdmFyIHZtID0gdGhpcztcblxuICAgIHZtLnRvZ2dsZVByb3BlcnR5ID0ge1xuXG4gICAgICAgIHRvZ2dsZVByb3BlcnR5OiBmdW5jdGlvbihmaWxlSWQsIHByb3BlcnR5TmFtZSwgY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSAhY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgdmFyIGZpbGUgPSB7fTtcbiAgICAgICAgICAgIGZpbGVbcHJvcGVydHlOYW1lXSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgRmlsZXNSZXBvc2l0b3J5LnVwZGF0ZShmaWxlSWQsIGZpbGUpLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG59XG5GaWxlc1RvZ2dsZVByb3BlcnR5Q3RybC4kaW5qZWN0ID0gWydVdGlscycsICdGaWxlc1JlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZXNUb2dnbGVQcm9wZXJ0eUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVEZWxldGVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdGaWxlc0RlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsLy8gYmVjYXVzZSB0aGUgc2NvcGUgaXMgaXNvbGF0ZWRcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBGaWxlc0RlbGV0ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIEZpbGVzRGVsZXRlQ3RybC5kZWxldGVNb2RhbC5zaG93TW9kYWwoYXR0cnMuZmlsZUlkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuRmlsZURlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVEZWxldGVCdXR0b247XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgRmlsZVRvZ2dsZVByb3BlcnR5QnV0dG9uXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVUb2dnbGVQcm9wZXJ0eUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0ZpbGVzVG9nZ2xlUHJvcGVydHlDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIEZpbGVzVG9nZ2xlUHJvcGVydHlDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIEZpbGVzVG9nZ2xlUHJvcGVydHlDdHJsLnRvZ2dsZVByb3BlcnR5LnRvZ2dsZVByb3BlcnR5KFxuICAgICAgICAgICAgICAgICAgICBhdHRycy5maWxlSWQsXG4gICAgICAgICAgICAgICAgICAgIGF0dHJzLnByb3BlcnR5TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgU3RyaW5nKGF0dHJzLnZhbHVlKSAhPT0gJ2ZhbHNlJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkZpbGVUb2dnbGVQcm9wZXJ0eUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVUb2dnbGVQcm9wZXJ0eUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsZVRyYW5zbGF0aW9uRGVsZXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnRmlsZXNEZWxldGVUcmFuc2xhdGlvbkN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgVHJhbnNsYXRpb25EZWxldGVDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFRyYW5zbGF0aW9uRGVsZXRlQ3RybC5kZWxldGVNb2RhbC5zaG93TW9kYWwoYXR0cnMuZmlsZUlkLCBhdHRycy50cmFuc2xhdGlvbklkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuRmlsZVRyYW5zbGF0aW9uRGVsZXRlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZVRyYW5zbGF0aW9uRGVsZXRlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4uZmlsZXMnLCBbJ25nVGFibGUnXSlcbiAgICAuY29uZmlnKFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgICAgICdSZXN0YW5ndWxhclByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgUmVzdGFuZ3VsYXJQcm92aWRlcikge1xuXG4gICAgICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvZmlsZXMvJztcblxuICAgICAgICAgICAgLy8gTm93IHNldCB1cCB0aGUgc3RhdGVzXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnZmlsZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9maWxlJyxcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2luZGV4Lmh0bWwnXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2ZpbGVzLmxpc3QnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9saXN0P3R5cGUmaXNBY3RpdmUmcGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdsaXN0Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdGaWxlc0xpc3RDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBGSUxFIFNIT1dcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2ZpbGVzLnNob3cnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy97ZmlsZUlkfS9zaG93L3tsYW5nQ29kZX0nLFxuICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgdG8gYWN0aXZlIHRhYiBvbiBsYW5ndWFnZSBjaGFuZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCBmdW5jdGlvbigkc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXy5zdGFydHNXaXRoKCRzdGF0ZS5jdXJyZW50Lm5hbWUsICdmaWxlcy5zaG93JykgPyAkc3RhdGUuY3VycmVudC5uYW1lIDogJy5kZXRhaWxzJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFuZ0NvZGU6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzdGF0ZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMubGFuZ0NvZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJywgJ0ZpbGVzUmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgRmlsZXNSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBGaWxlc1JlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5maWxlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdzaG93Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdGaWxlc0RldGFpbHNDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdsYW5nU3dpdGNoZXJAZmlsZXMuc2hvdyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy9sYW5nU3dpdGNoZXIuaHRtbCdcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdmaWxlU2V0dGluZ3NAZmlsZXMuc2hvdyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy9zZXR0aW5ncy5odG1sJ1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnZmlsZXMuc2hvdy5kZXRhaWxzJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZGV0YWlscycsXG4gICAgICAgICAgICAgICAgICAgIGRlZXBTdGF0ZVJlZGlyZWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzdGlja3k6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnZmlsZVRhYic6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2RldGFpbHMuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gRklMRSBFRElUXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdmaWxlcy5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2ZpbGVJZH0vZWRpdC97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgYWJzdHJhY3Q6ICcuaW5kZXgnLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYW5nQ29kZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24oJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy5sYW5nQ29kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnRmlsZXNSZXBvc2l0b3J5JywgZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBGaWxlc1JlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEZpbGVzUmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLmZpbGVJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93TWFzazogdHJ1ZSAvLyBlbnRlciBlZGl0IG1vZGVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdzaG93Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdGaWxlc0RldGFpbHNDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdsYW5nU3dpdGNoZXJAZmlsZXMuZWRpdCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy9sYW5nU3dpdGNoZXIuaHRtbCdcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdmaWxlU2V0dGluZ3NAZmlsZXMuZWRpdCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy9zZXR0aW5ncy5odG1sJ1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnZmlsZXMuZWRpdC5pbmRleCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdmaWxlVGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3RhYnMvZGV0YWlscy5odG1sJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2ZpbGVzLmVkaXQuZGV0YWlscycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2RldGFpbHMnLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2ZpbGVUYWInOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0ZpbGVzRGV0YWlsc0VkaXRDdHJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2RldGFpbHNFZGl0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIEZJTEUgQUREXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdmaWxlcy5hZGQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9hZGQve3R5cGV9JyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdhZGQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0ZpbGVzQWRkQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24oJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy50eXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gRklMRSBBREQgVFJBTlNMQVRJT05cbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2ZpbGVzLmFkZFRyYW5zbGF0aW9uJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2ZpbGVJZH0vYWRkLXRyYW5zbGF0aW9uL3tsYW5nQ29kZX0nLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2FkZFRyYW5zbGF0aW9uLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdGaWxlc0FkZFRyYW5zbGF0aW9uQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSlcbiAgICAuY29udHJvbGxlcignRmlsZXNBZGRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9GaWxlc0FkZEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignRmlsZXNMaXN0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvRmlsZXNMaXN0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdGaWxlc0RldGFpbHNDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9GaWxlc0RldGFpbHNDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0ZpbGVzRGV0YWlsc0VkaXRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9GaWxlc0RldGFpbHNFZGl0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdGaWxlc0FkZFRyYW5zbGF0aW9uQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvRmlsZXNBZGRUcmFuc2xhdGlvbkN0cmwnKSlcbiAgICAuY29udHJvbGxlcignRmlsZXNEZWxldGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0ZpbGVzRGVsZXRlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdGaWxlc1RvZ2dsZVByb3BlcnR5Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyZWN0aXZlcy9GaWxlc1RvZ2dsZVByb3BlcnR5Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdGaWxlc0RlbGV0ZVRyYW5zbGF0aW9uQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyZWN0aXZlcy9GaWxlc0RlbGV0ZVRyYW5zbGF0aW9uQ3RybCcpKVxuICAgIC5zZXJ2aWNlKCdGaWxlU2VydmljZScsIHJlcXVpcmUoJy4vc2VydmljZXMvRmlsZVNlcnZpY2UuanMnKSlcbiAgICAuZmFjdG9yeSgnRmlsZXNSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9GaWxlc1JlcG9zaXRvcnkuanMnKSlcbiAgICAuZGlyZWN0aXZlKCdmaWxlRGVsZXRlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0ZpbGVEZWxldGVCdXR0b24uanMnKSlcbiAgICAuZGlyZWN0aXZlKCdmaWxlVG9nZ2xlUHJvcGVydHlCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvRmlsZVRvZ2dsZVByb3BlcnR5QnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnZmlsZVRyYW5zbGF0aW9uRGVsZXRlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0ZpbGVUcmFuc2xhdGlvbkRlbGV0ZUJ1dHRvbi5qcycpKVxuICAgIC5ydW4oW1xuICAgICAgICAnTmF2QmFyJyxcbiAgICAgICAgZnVuY3Rpb24oTmF2QmFyKSB7XG4gICAgICAgICAgICBOYXZCYXIuYWRkKHtcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0ZJTEVTJywgYWN0aW9uOiAnZmlsZXMubGlzdCcsIGljb246ICdmYSBmYS1maWxlcy1vJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsZVNlcnZpY2UoVXRpbHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyBtZXJnZWQgZmlsZSBkYXRhIHdpdGggcHJvdmlkZWQgZGVmYXVsdHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGZpbGUgZmlsZSBkYXRhXG4gICAgICAgICAqIEBwYXJhbSBkZWZhdWx0cyBkZWZhdWx0IGZpbGUgc2V0dGluZ3MgdG8gbWVyZ2Ugd2l0aFxuICAgICAgICAgKiBAcmV0dXJucyBPYmplY3QgbWVyZ2VkIGZpbGUgZGF0YSB3aXRoIGRlZmF1bHRzXG4gICAgICAgICAqL1xuICAgICAgICBwcmVwYXJlUmVxdWVzdERhdGE6IGZ1bmN0aW9uKGZpbGUsIGRlZmF1bHRzKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0ge1xuICAgICAgICAgICAgICAgIGZpbGU6IGZpbGVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBzZXQgdHJhbnNsYXRpb25zIGlmIHRoZXJlIGFueSBvZiB0aGVtIGlzIGZpbGxlZCwgYmVjYXVzZSB0cmFuc2xhdGlvbnMgYXJlIG5vdCByZXF1aXJlZC5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZmlsZS50cmFuc2xhdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnRyYW5zbGF0aW9ucyA9IGZpbGUudHJhbnNsYXRpb25zO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWZhdWx0cyA9IF8ub21pdChkZWZhdWx0cywgWyd0cmFuc2xhdGlvbnMnXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gXy5tZXJnZShkZWZhdWx0cywgb3V0cHV0KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgZmlsZSBleHRlbnNpb25zIHBhdHRlcm4gZm9yIG5nLWZpbGUtdXBsb2FkIHZhbGlkYXRvciBlLmcuICcucG5nLC5qcGcsLmpwZWcsLnRpZidcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHR5cGUgZmlsZSB0eXBlXG4gICAgICAgICAqIEByZXR1cm5zIHN0cmluZyB0eXBlIGZpbGUgZXh0ZW5zaW9ucyBwYXR0ZXJuIGZvciBuZy1maWxlLXVwbG9hZCB2YWxpZGF0b3JcbiAgICAgICAgICovXG4gICAgICAgIGdldFR5cGVFeHRlbnNpb25zUGF0dGVybjogZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuICcuJyArIF8uam9pbihVdGlscy5Db25maWcuZmlsZUV4dGVuc2lvbnNbdHlwZV0sICcsLicpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuRmlsZVNlcnZpY2UuJGluamVjdCA9IFsnVXRpbHMnXTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZVNlcnZpY2U7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgRmlsZUNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsZXNSZXBvc2l0b3J5KFJlc3Rhbmd1bGFyLCBVcGxvYWQpIHtcbiAgICB2YXIgYXBpID0gJ2FkbWluL2ZpbGVzJztcbiAgICB2YXIgdXNlcnMgPSBSZXN0YW5ndWxhci5hbGwoYXBpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvbmU6IGZ1bmN0aW9uKGlkLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuZ2V0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGxpc3Q6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIHVzZXJzLmdldExpc3QocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYW46IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5zdHJpcFJlc3Rhbmd1bGFyKGVsZW0pO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGU6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLnJlbW92ZSgpO1xuICAgICAgICB9LFxuICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uKGlkLCB1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmN1c3RvbVBVVCh1c2VyKTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbihuZXdGaWxlKSB7XG4gICAgICAgICAgICByZXR1cm4gVXBsb2FkLnVwbG9hZCh7XG4gICAgICAgICAgICAgICAgdXJsOiBSZXN0YW5ndWxhci5jb25maWd1cmF0aW9uLmJhc2VVcmwgKyAnLycgKyBhcGksXG4gICAgICAgICAgICAgICAgaGVhZGVycyA6IFJlc3Rhbmd1bGFyLmNvbmZpZ3VyYXRpb24uZGVmYXVsdEhlYWRlcnMsXG4gICAgICAgICAgICAgICAgd2l0aENyZWRlbnRpYWxzOiBSZXN0YW5ndWxhci5jb25maWd1cmF0aW9uLmRlZmF1bHRIdHRwRmllbGRzLndpdGhDcmVkZW50aWFscyxcbiAgICAgICAgICAgICAgICBkYXRhOiBuZXdGaWxlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV3VHJhbnNsYXRpb246IGZ1bmN0aW9uKGlkLCBuZXdUcmFuc2xhdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5hbGwoJ3RyYW5zbGF0aW9ucycpLnBvc3QobmV3VHJhbnNsYXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGVUcmFuc2xhdGlvbjogZnVuY3Rpb24oZmlsZUlkLCB0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgZmlsZUlkKS5vbmUoJ3RyYW5zbGF0aW9ucycsIHRyYW5zbGF0aW9uSWQpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuRmlsZXNSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJywgJ1VwbG9hZCddO1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlc1JlcG9zaXRvcnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE5vdGlmaWNhdGlvbnMoJHRyYW5zbGF0ZSkge1xuICAgIC8vIE5vdGlmaWNhdGlvbnMgc3RhY2tcbiAgICB2YXIgc3RhY2tCb3R0b21SaWdodCA9IHsnZGlyMSc6ICd1cCcsICdkaXIyJzogJ2xlZnQnLCAnZmlyc3Rwb3MxJzogMjUsICdmaXJzdHBvczInOiAyNX07XG4gICAgLy8gTm90aWZpY2F0aW9ucyBvcHRpb25zXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIGFkZGNsYXNzOiAnc3RhY2stYm90dG9tcmlnaHQnLFxuICAgICAgICBzdGFjazogc3RhY2tCb3R0b21SaWdodCxcbiAgICAgICAgc2hhZG93OiBmYWxzZSxcbiAgICAgICAgYnV0dG9uczoge1xuICAgICAgICAgICAgc3RpY2tlcjogZmFsc2VcbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gd2hpY2ggc2hvd3MgbWVzc2FnZXMgb2YgZ2l2ZW4gdHlwZVxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uIHVzZWQgdG8gc2hvdyBlYWNoIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gbWVzc2FnZXMgbWVzc2FnZXMgdG8gc2hvd1xuICAgICAqL1xuICAgIHZhciBhZGRNZXNzYWdlcyA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBtZXNzYWdlcykge1xuICAgICAgICBfLmZvckVhY2gobWVzc2FnZXMsIGZ1bmN0aW9uKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhtZXNzYWdlc1swXSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIG11bHRpcGxlIEFuZ3VsYXJTdHJhcCBpbmZvIHR5cGUgYWxlcnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlcyB0cmFuc2xhdGFibGUgbWVzc2FnZXMgdG8gc2hvd1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkSW5mb3M6IGZ1bmN0aW9uKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBhZGRNZXNzYWdlcyhzZWxmLmFkZEluZm8sIG1lc3NhZ2VzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIG11bHRpcGxlIEFuZ3VsYXJTdHJhcCBkYW5nZXIgdHlwZSBhbGVydHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2VzIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyB0byBzaG93XG4gICAgICAgICAqL1xuICAgICAgICBhZGRFcnJvcnM6IGZ1bmN0aW9uKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBhZGRNZXNzYWdlcyhzZWxmLmFkZEVycm9yLCBtZXNzYWdlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyBtdWx0aXBsZSBBbmd1bGFyU3RyYXAgd2FybmluZyB0eXBlIGFsZXJ0c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZXMgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIHRvIHNob3dcbiAgICAgICAgICovXG4gICAgICAgIGFkZFdhcm5pbmdzOiBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgYWRkTWVzc2FnZXMoc2VsZi5hZGRXYXJuaW5nLCBtZXNzYWdlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyBtdWx0aXBsZSBBbmd1bGFyU3RyYXAgc3VjY2VzcyB0eXBlIGFsZXJ0c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZXMgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIHRvIHNob3dcbiAgICAgICAgICovXG4gICAgICAgIGFkZFN1Y2Nlc3NlczogZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGFkZE1lc3NhZ2VzKHNlbGYuYWRkU3VjY2VzcywgbWVzc2FnZXMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBpbmZvIHR5cGUgYWxlcnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2Ugc3RyaW5nIGVnLiAnQ09NTU9OX0VSUk9SJ1xuICAgICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25QYXJhbXMgZHluYW1pYyBwYXJhbXMgZm9yIHRoZSB0cmFuc2xhdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgYWRkSW5mbzogZnVuY3Rpb24obWVzc2FnZSwgdHJhbnNsYXRpb25QYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUE5vdGlmeShfLm1lcmdlKG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICB0ZXh0OiAkdHJhbnNsYXRlLmluc3RhbnQobWVzc2FnZSwgdHJhbnNsYXRpb25QYXJhbXMpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdpbmZvJ1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBkYW5nZXIgdHlwZSBhbGVydFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZSBzdHJpbmcgZWcuICdDT01NT05fRVJST1InXG4gICAgICAgICAqIEBwYXJhbSB0cmFuc2xhdGlvblBhcmFtcyBkeW5hbWljIHBhcmFtcyBmb3IgdGhlIHRyYW5zbGF0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBhZGRFcnJvcjogZnVuY3Rpb24obWVzc2FnZSwgdHJhbnNsYXRpb25QYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUE5vdGlmeShfLm1lcmdlKG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICB0ZXh0OiAkdHJhbnNsYXRlLmluc3RhbnQobWVzc2FnZSwgdHJhbnNsYXRpb25QYXJhbXMpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLXRpbWVzJ1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCB3YXJuaW5nIHR5cGUgYWxlcnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2Ugc3RyaW5nIGVnLiAnQ09NTU9OX0VSUk9SJ1xuICAgICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25QYXJhbXMgZHluYW1pYyBwYXJhbXMgZm9yIHRoZSB0cmFuc2xhdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgYWRkV2FybmluZzogZnVuY3Rpb24obWVzc2FnZSwgdHJhbnNsYXRpb25QYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUE5vdGlmeShfLm1lcmdlKG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICB0ZXh0OiAkdHJhbnNsYXRlLmluc3RhbnQobWVzc2FnZSwgdHJhbnNsYXRpb25QYXJhbXMpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICd3YXJuaW5nJ1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBzdWNjZXNzIHR5cGUgYWxlcnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2Ugc3RyaW5nIGVnLiAnQ09NTU9OX0VSUk9SJ1xuICAgICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25QYXJhbXMgZHluYW1pYyBwYXJhbXMgZm9yIHRoZSB0cmFuc2xhdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgYWRkU3VjY2VzczogZnVuY3Rpb24obWVzc2FnZSwgdHJhbnNsYXRpb25QYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUE5vdGlmeShfLm1lcmdlKG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICB0ZXh0OiAkdHJhbnNsYXRlLmluc3RhbnQobWVzc2FnZSwgdHJhbnNsYXRpb25QYXJhbXMpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJ1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxubW9kdWxlLiRpbmplY3QgPSBbJyR0cmFuc2xhdGUnXTtcbm1vZHVsZS5leHBvcnRzID0gTm90aWZpY2F0aW9ucztcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3RvcmFnZSgpIHtcbiAgICB2YXIgc3RvcmFnZUl0ZW1zID0ge307XG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgc3BlY2lmaWVkIG9iamVjdCB0byB0aGUgc3RvcmFnZUl0ZW1zXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIHNldFN0b3JhZ2VJdGVtOiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJdGVtcyA9IF8ubWVyZ2Uoc3RvcmFnZUl0ZW1zLCBvYmplY3QsIGZ1bmN0aW9uKG9iamVjdFZhbHVlLCBzb3VyY2VWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkob2JqZWN0VmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJldHVybnMgdGhlIHNwZWNpZmllZCBvYmplY3QgZnJvbSB0aGUgc3RvcmFnZUl0ZW1zXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0U3RvcmFnZUl0ZW06IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gc3RvcmFnZUl0ZW1zW2luZGV4XTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJlbW92ZXMgc3BlY2lmaWVkIG9iamVjdCBmcm9tIHRoZSBzdG9yYWdlSXRlbXNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGluZGV4XG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVTdG9yYWdlSXRlbTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJdGVtcyA9IF8ub21pdChzdG9yYWdlSXRlbXMsIGluZGV4KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblN0b3JhZ2UuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBja09wdGlvbnMoKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICB0b29sYmFyR3JvdXBzOiBbXG4gICAgICAgICAgICB7bmFtZTogJ2NsaXBib2FyZCcsIGdyb3VwczogWydjbGlwYm9hcmQnLCAndW5kbyddfSxcbiAgICAgICAgICAgIHtuYW1lOiAnZWRpdGluZycsIGdyb3VwczogWydmaW5kJywgJ3NlbGVjdGlvbiddfSxcbiAgICAgICAgICAgIHtuYW1lOiAnbGlua3MnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnaW5zZXJ0J30sXG4gICAgICAgICAgICB7bmFtZTogJ3Rvb2xzJ30sXG4gICAgICAgICAgICB7bmFtZTogJ2RvY3VtZW50JywgZ3JvdXBzOiBbJ21vZGUnLCAnZG9jdW1lbnQnLCAnZG9jdG9vbHMnXX0sXG4gICAgICAgICAgICB7bmFtZTogJ290aGVycyd9LFxuICAgICAgICAgICAgJy8nLFxuICAgICAgICAgICAge25hbWU6ICdiYXNpY3N0eWxlcycsIGdyb3VwczogWydiYXNpY3N0eWxlcycsICdjbGVhbnVwJ119LFxuICAgICAgICAgICAge25hbWU6ICdwYXJhZ3JhcGgnLCBncm91cHM6IFsnbGlzdCcsICdpbmRlbnQnLCAnYmxvY2tzJywgJ2JpZGknXX0sXG4gICAgICAgICAgICB7bmFtZTogJ2FsaWduJ30sXG4gICAgICAgICAgICB7bmFtZTogJ3N0eWxlcyd9XG4gICAgICAgIF0sXG4gICAgICAgIGhlaWdodDogJzUwMHB4J1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBzcGVjaWZpZWQgb2JqZWN0IHRvIHRoZSBDS0VkaXRvciBvcHRpb25zXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIHNldEVkaXRvck9wdGlvbjogZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgICAgICBkZWZhdWx0cyA9IF8ubWVyZ2UoZGVmYXVsdHMsIG9iamVjdCwgZnVuY3Rpb24ob2JqZWN0VmFsdWUsIHNvdXJjZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheShvYmplY3RWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZVZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcmV0dXJucyBDS0VkaXRvciBvcHRpb25zXG4gICAgICAgICAqIEBwYXJhbSBjdXN0b20gY3VzdG9tIG9wdGlvbiB0byBpbmNsdWRlIGluIHJldHVybiBvYmplY3QsIG9ubHkgZm9yIHRoaXMgaW5zdGFuY2Ugb2YgZWRpdG9yXG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBnZXRFZGl0b3JPcHRpb25zOiBmdW5jdGlvbihjdXN0b20pIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBfLmNsb25lRGVlcChkZWZhdWx0cyk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY3VzdG9tLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbm1vZHVsZS4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IGNrT3B0aW9ucztcbiIsImZ1bmN0aW9uIE5hdmlnYXRpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIGl0ZW1zID0gW107XG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiBjaGVja3MgaWYgJ2l0ZW0nIHN0cnVjdHVyZSBpcyB2YWxpZFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgdmFyIGNoZWNrU3RydWN0dXJlID0gZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpZiAoXy5oYXMoaXRlbSwgJ2RpdmlkZXInKSkge1xuICAgICAgICAgICAgaWYgKGl0ZW0uZGl2aWRlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvcGVydHk6ICcgKyAnXFwnZGl2aWRlclxcJycgKyAnIG11c3QgYmUgc2V0IHRvIFxcJ3RydWVcXCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghXy5oYXMoaXRlbSwgJ3RpdGxlJykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvcGVydHk6ICcgKyAndGl0bGUnICsgJyBpcyBtaXNzaW5nJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIV8uaGFzKGl0ZW0sICdhY3Rpb24nKSAmJiAhXy5oYXMoaXRlbSwgJ2hyZWYnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9wZXJ0eTogJyArICdcXCdhY3Rpb25cXCcgb3IgXFwnaHJlZlxcJycgKyAnIGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gcmV0dXJucyBjaGlsZHJlbiBvZiBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIHZhciBnZXRDaGlsZHJlbiA9IGZ1bmN0aW9uKHRpdGxlKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdLFxuICAgICAgICAgICAgZm91bmRGbGFnID0gZmFsc2U7XG4gICAgICAgIF8uZm9yRWFjaChpdGVtcywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZiAodmFsdWUudGl0bGUgPT09IHRpdGxlKSB7XG4gICAgICAgICAgICAgICAgZm91bmRGbGFnID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoXy5oYXModmFsdWUsICdjaGlsZHJlbicpICYmIEFycmF5LmlzQXJyYXkodmFsdWUuY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuID0gdmFsdWUuY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChmb3VuZEZsYWcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BhcmVudDogXFwnJyArIHRpdGxlICsgJ1xcJyBoYXZlIG5vIGNoaWxkcmVuLCBiZWNhdXNlIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNoaWxkcmVuO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50IGFjY29yZGluZyB0byAncG9zaXRpb24nIGFyZ3VtZW50XG4gICAgICogcG9zaXRpb24gPSAnYmVmb3JlJyAtIGVsZW1lbnQgd2lsbCBiZSBhZGRlZCBiZWZvcmUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAqIHBvc2l0aW9uID0gJ2FmdGVyJyAtIGVsZW1lbnQgd2lsbCBiZSBhZGRlZCBhZnRlciBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICogQHBhcmFtIHBvc2l0aW9uIHN0cmluZ1xuICAgICAqL1xuICAgIHZhciBhZGRCZWZvcmVBZnRlciA9IGZ1bmN0aW9uKHRpdGxlLCBpdGVtLCBwb3NpdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIHBvc2l0aW9uID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBcXCdwb3NpdGlvblxcJyBpcyByZXF1aXJlZCwgdmFsdWVzOiBcXCdiZWZvcmVcXCcgb3IgXFwnYWZ0ZXJcXCcnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcG9zaXRpb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIG11c3QgYmUgb2Ygc3RyaW5nIHR5cGUsIHZhbHVlczogXFwnYmVmb3JlXFwnIG9yIFxcJ2FmdGVyXFwnJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoZWNrU3RydWN0dXJlKGl0ZW0pKSB7XG4gICAgICAgICAgICB2YXIgZm91bmRGbGFnID0gZmFsc2U7XG4gICAgICAgICAgICBfLmZvckVhY2goaXRlbXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS50aXRsZSA9PT0gdGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRGbGFnID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09PSAnYmVmb3JlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMuc3BsaWNlKGluZGV4LCAwLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ2FmdGVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMuc3BsaWNlKGluZGV4ICsgMSwgMCwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGZvdW5kRmxhZyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0VsZW1lbnQ6IFxcJycgKyB0aXRsZSArICdcXCcgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gYWRkcyBjaGlsZCBsaW5rIGFjY29yZGluZyB0byAncG9zaXRpb24nIGFyZ3VtZW50XG4gICAgICogcG9zaXRpb24gPSB0cnVlIC0gY2hpbGQgd2lsbCBiZSBhZGRlZCBhcyBmaXJzdCBlbGVtZW50XG4gICAgICogcG9zaXRpb24gPSBmYWxzZSAtIGNoaWxkIHdpbGwgYmUgYWRkZWQgYXMgbGFzdCBlbGVtZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyZW50IHN0cmluZ1xuICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiBib29sZWFuXG4gICAgICovXG4gICAgdmFyIGFkZENoaWxkID0gZnVuY3Rpb24ocGFyZW50LCBpdGVtLCBwb3NpdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIHBvc2l0aW9uID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcG9zaXRpb24gPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcG9zaXRpb24gIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBcXCdwb3NpdGlvblxcJyBtdXN0IGJlIG9mIGJvb2xlYW4gdHlwZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGVja1N0cnVjdHVyZShpdGVtKSkge1xuICAgICAgICAgICAgdmFyIGZvdW5kRmxhZyA9IGZhbHNlO1xuICAgICAgICAgICAgXy5mb3JFYWNoKGl0ZW1zLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUudGl0bGUgPT09IHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaGFzKHZhbHVlLCAnY2hpbGRyZW4nKSB8fCAhQXJyYXkuaXNBcnJheSh2YWx1ZS5jaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmNoaWxkcmVuID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5jaGlsZHJlbi51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUuY2hpbGRyZW4ucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3VuZEZsYWcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZm91bmRGbGFnID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGFyZW50OiBcXCcnICsgcGFyZW50ICsgJ1xcJyBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiBhZGRzIGNoaWxkIGxpbmsgYWNjb3JkaW5nIHRvICdwb3NpdGlvbicgYXJndW1lbnRcbiAgICAgKiBwb3NpdGlvbiA9ICdiZWZvcmUnIC0gY2hpbGQgd2lsbCBiZSBhZGRlZCBiZWZvcmUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAqIHBvc2l0aW9uID0gJ2FmdGVyJyAtIGNoaWxkIHdpbGwgYmUgYWRkZWQgYWZ0ZXIgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICogQHBhcmFtIHBvc2l0aW9uIHN0cmluZ1xuICAgICAqL1xuICAgIHZhciBhZGRCZWZvcmVBZnRlckNoaWxkID0gZnVuY3Rpb24ocGFyZW50LCB0aXRsZSwgaXRlbSwgcG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwb3NpdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgaXMgcmVxdWlyZWQsIHZhbHVlczogXFwnYmVmb3JlXFwnIG9yIFxcJ2FmdGVyXFwnJyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBvc2l0aW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBcXCdwb3NpdGlvblxcJyBtdXN0IGJlIG9mIHN0cmluZyB0eXBlLCB2YWx1ZXM6IFxcJ2JlZm9yZVxcJyBvciBcXCdhZnRlclxcJycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGVja1N0cnVjdHVyZShpdGVtKSkge1xuICAgICAgICAgICAgdmFyIGZvdW5kRmxhZyA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNoaWxkcmVuID0gZ2V0Q2hpbGRyZW4ocGFyZW50KTtcblxuICAgICAgICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGFyZW50OiBcXCcnICsgcGFyZW50ICsgJ1xcJyBoYXZlIG5vIGNoaWxkcmVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfLmZvckVhY2goY2hpbGRyZW4sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS50aXRsZSA9PT0gdGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRGbGFnID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09PSAnYmVmb3JlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW4uc3BsaWNlKGluZGV4LCAwLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ2FmdGVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW4uc3BsaWNlKGluZGV4ICsgMSwgMCwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGZvdW5kRmxhZyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NoaWxkOiBcXCcnICsgdGl0bGUgKyAnXFwnIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgZWxlbWVudCB0byB0aGUgZW5kIG9mIG1lbnVcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGQ6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChjaGVja1N0cnVjdHVyZShpdGVtKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGVsZW1lbnQgdG8gdGhlIG1lbnUgYXMgZmlyc3RcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRGaXJzdDogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgaWYgKGNoZWNrU3RydWN0dXJlKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMudW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgZWxlbWVudCAnaXRlbScgdG8gdGhlIG1lbnUgYmVmb3JlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZEJlZm9yZTogZnVuY3Rpb24odGl0bGUsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZEJlZm9yZUFmdGVyKHRpdGxlLCBpdGVtLCAnYmVmb3JlJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGVsZW1lbnQgJ2l0ZW0nIHRvIHRoZSBtZW51IGFmdGVyIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gbmV3SXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZEFmdGVyOiBmdW5jdGlvbih0aXRsZSwgbmV3SXRlbSkge1xuICAgICAgICAgICAgYWRkQmVmb3JlQWZ0ZXIodGl0bGUsIG5ld0l0ZW0sICdhZnRlcicpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBjaGlsZCBsaW5rIGFzIGZpcnN0IHRvIHRoZSBlbGVtZW50IHNwZWNpZmllZCBieSAncGFyZW50JyBhcmd1bWVudFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gcGFyZW50IHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZEZpcnN0Q2hpbGQ6IGZ1bmN0aW9uKHBhcmVudCwgaXRlbSkge1xuICAgICAgICAgICAgYWRkQ2hpbGQocGFyZW50LCBpdGVtLCB0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgY2hpbGQgbGluayBhcyBsYXN0IHRvIHRoZSBlbGVtZW50IHNwZWNpZmllZCBieSAncGFyZW50JyBhcmd1bWVudFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gcGFyZW50IHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZExhc3RDaGlsZDogZnVuY3Rpb24ocGFyZW50LCBpdGVtKSB7XG4gICAgICAgICAgICBhZGRDaGlsZChwYXJlbnQsIGl0ZW0sIGZhbHNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgbGluayB0byB0aGUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3BhcmVudCcgYmVmb3JlIGNoaWxkIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZEJlZm9yZUNoaWxkOiBmdW5jdGlvbihwYXJlbnQsIHRpdGxlLCBpdGVtKSB7XG4gICAgICAgICAgICBhZGRCZWZvcmVBZnRlckNoaWxkKHBhcmVudCwgdGl0bGUsIGl0ZW0sICdiZWZvcmUnKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgbGluayB0byB0aGUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3BhcmVudCcgYWZ0ZXIgY2hpbGQgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gcGFyZW50IHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQWZ0ZXJDaGlsZDogZnVuY3Rpb24ocGFyZW50LCB0aXRsZSwgaXRlbSkge1xuICAgICAgICAgICAgYWRkQmVmb3JlQWZ0ZXJDaGlsZChwYXJlbnQsIHRpdGxlLCBpdGVtLCAnYWZ0ZXInKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJldHVybiBpdGVtcyBmcm9tIG1lbnVcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0SXRlbXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gZXhwb3J0cyBsaW5rcyB0byAnZHJvcGRvd24nIG1lbnVcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAgICAgKi9cbiAgICAgICAgZXhwb3J0VG9Ecm9wZG93bk1lbnU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIHZhciBuZXdJdGVtID0ge307XG4gICAgICAgICAgICBfLmZvckVhY2goaXRlbXMsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JJbih2YWx1ZSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAndGl0bGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnRleHQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW1ba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKG5ld0l0ZW0pO1xuICAgICAgICAgICAgICAgIG5ld0l0ZW0gPSB7fTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgIH1cbiAgICB9O1xufVxubW9kdWxlLmV4cG9ydHMgPSBOYXZpZ2F0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTZXR0aW5nc0N0cmwoJHNjb3BlLCBVdGlscywgU2V0dGluZ3NSZXBvc2l0b3J5LCBjYXRlZ29yaWVzLCBzZXR0aW5ncykge1xuXG4gICAgLy8gZmllbGRzIHRoYXQgd2lsbCB1c2UgbnVtYmVyIHR5cGUgaW5wdXRcbiAgICAkc2NvcGUubnVtZXJpY0ZpZWxkcyA9IFsnZGVmYXVsdFBhZ2VTaXplJywgJ3Nlb0Rlc2NMZW5ndGgnXTtcblxuICAgIC8vIG9wdGlvbiBjYXRlZ29yeVxuICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLmtleSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmNhdGVnb3J5S2V5ID0gVXRpbHMuJHN0YXRlUGFyYW1zLmtleTtcbiAgICB9XG5cbiAgICAvLyBsYW5nIGNvZGUgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMubGFuZ0NvZGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5sYW5nQ29kZSA9IFV0aWxzLiRzdGF0ZVBhcmFtcy5sYW5nQ29kZTtcbiAgICB9XG5cbiAgICAvLyBjYXRlZ29yaWVzIGV4aXN0c1xuICAgIGlmICh0eXBlb2YgY2F0ZWdvcmllcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBTZXR0aW5nc1JlcG9zaXRvcnkuY2xlYW4oY2F0ZWdvcmllcyk7IC8vIG9wdGlvbnMgY2F0ZWdvcmllc1xuICAgIH1cblxuICAgIC8vIHNldHRpbmdzIGV4aXN0c1xuICAgIGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5zZXR0aW5ncyA9IFNldHRpbmdzUmVwb3NpdG9yeS5jbGVhbihzZXR0aW5ncyk7IC8vIGNhdGVnb3J5IHNldHRpbmdzXG4gICAgfVxuXG4gICAgLy8gd2UgbmVlZCBpbnRlZ2VyIHZhbHVlcyBmb3IgbnVtYmVyIHR5cGUgaW5wdXRzXG4gICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5udW1lcmljRmllbGRzLCBmdW5jdGlvbihwcm9wZXJ0eU5hbWUpe1xuICAgICAgICBpZiAoJHNjb3BlLnNldHRpbmdzLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuc2V0dGluZ3NbcHJvcGVydHlOYW1lXSwgZnVuY3Rpb24odiwgaykge1xuICAgICAgICAgICAgICAgICRzY29wZS5zZXR0aW5nc1twcm9wZXJ0eU5hbWVdW2tdID0gcGFyc2VJbnQodik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gc2F2ZSBzZXR0aW5ncyBjYXRlZ29yeSBvcHRpb25zXG4gICAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIC8vIHByZXBhcmUgb3B0aW9uIGRhdGFcbiAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHNhdmUgb3B0aW9uXG4gICAgICAgIFNldHRpbmdzUmVwb3NpdG9yeS51cGRhdGUoJHNjb3BlLmNhdGVnb3J5S2V5LCBkYXRhKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cblxuU2V0dGluZ3NDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdTZXR0aW5nc1JlcG9zaXRvcnknLCAnY2F0ZWdvcmllcycsICdzZXR0aW5ncyddO1xubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5nc0N0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNldHRpbmdDb3B5Q3RybCgkc2NvcGUsIFV0aWxzLCAkbW9kYWwsIFNldHRpbmdzUmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL3NldHRpbmdzL2RpcmVjdGl2ZXMvJztcbiAgICAvLyBDb3B5IG1vZGFsXG4gICAgdm0uY29weU1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZXMgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3NldHRpbmdDb3B5TW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGF0dHJzIGF0dHJpYnV0ZXMgZnJvbSBkaXJlY3RpdmVcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmF0dHJzID0gYXR0cnM7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnT1BUSU9OU19MQU5HLkNPUFlfT1BUSU9OX1FVRVNUSU9OJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYXBwbHkgc2V0dGluZyB2YWx1ZSB0byBvdGhlciBsYW5ndWFnZXMgYW5kIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBQVVQgYWN0aW9uIGZvciBvcHRpb24gdmFsdWVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIHNhdmVTZXR0aW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgLy8gcHJlcGFyZSBvcHRpb24gZGF0YVxuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAga2V5OiB2bS5hdHRycy5vcHRpb25LZXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IGFuZ3VsYXIuZnJvbUpzb24odm0uYXR0cnMub3B0aW9uVmFsdWUpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBzZXQgb3B0aW9uIHZhbHVlIHRvIGFsbCBvdGhlciBsYW5ndWFnZXNcbiAgICAgICAgICAgIF8uZm9yRWFjaChkYXRhLnZhbHVlLCBmdW5jdGlvbihuLCBrZXkpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnZhbHVlW2tleV0gPSB2bS5hdHRycy5vcHRpb25OZXdWYWx1ZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBzYXZlIG9wdGlvblxuICAgICAgICAgICAgU2V0dGluZ3NSZXBvc2l0b3J5LnVwZGF0ZSh2bS5hdHRycy5jYXRlZ29yeUtleSwgZGF0YSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ09QVElPTlNfTEFORy5DT1BZX0NPTkZJUk0nKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUucmVsb2FkKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5TZXR0aW5nQ29weUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJyRtb2RhbCcsICdTZXR0aW5nc1JlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ0NvcHlDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTZXR0aW5nQ29weUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogJz0nLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2V0dGluZ0NvcHlDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIFNldHRpbmdDb3B5Q3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBTZXR0aW5nQ29weUN0cmwuY29weU1vZGFsLnNob3dNb2RhbChhdHRycyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblNldHRpbmdDb3B5QnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ0NvcHlCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhZG1pbi5zZXR0aW5ncycsIFtdKVxuICAgIC5jb25maWcoW1xuICAgICAgICAnJHN0YXRlUHJvdmlkZXInLFxuICAgICAgICAnJHVybFJvdXRlclByb3ZpZGVyJyxcbiAgICAgICAgJ1Jlc3Rhbmd1bGFyUHJvdmlkZXInLFxuICAgICAgICBmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCBSZXN0YW5ndWxhclByb3ZpZGVyKSB7XG5cbiAgICAgICAgICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9zZXR0aW5ncy8nO1xuXG4gICAgICAgICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdzZXR0aW5ncycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3NldHRpbmdzL3trZXl9JyxcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnU2V0dGluZ3NDdHJsJyxcbiAgICAgICAgICAgICAgICAgICAgZGVlcFN0YXRlUmVkaXJlY3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2V0dGluZ3NSZXBvc2l0b3J5JywgZnVuY3Rpb24oU2V0dGluZ3NSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCB0cmVlIG9mIGFsbCBjYXRlZ29yaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBTZXR0aW5nc1JlcG9zaXRvcnkubGlzdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnU2V0dGluZ3NSZXBvc2l0b3J5JywgZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBTZXR0aW5nc1JlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFNldHRpbmdzUmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLmtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBTRVRUSU5HUyBTSE9XXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdzZXR0aW5ncy5zaG93Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2xhbmdDb2RlfScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudFRhYic6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnU2V0dGluZ3NDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5jb250cm9sbGVyKCdTZXR0aW5nc0N0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL1NldHRpbmdzQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdTZXR0aW5nQ29weUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvU2V0dGluZ0NvcHlDdHJsJykpXG4gICAgLmRpcmVjdGl2ZSgnc2V0dGluZ0NvcHlCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvU2V0dGluZ0NvcHlCdXR0b24uanMnKSlcbiAgICAuZmFjdG9yeSgnU2V0dGluZ3NSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9TZXR0aW5nc1JlcG9zaXRvcnkuanMnKSlcbiAgICAucnVuKFtcbiAgICAgICAgJ05hdkJhcicsXG4gICAgICAgIGZ1bmN0aW9uKE5hdkJhcikge1xuICAgICAgICAgICAgTmF2QmFyLmFkZCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICdTRVRUSU5HUycsIGFjdGlvbjogJ3NldHRpbmdzJywgaWNvbjogJ2ZhIGZhLWNvZ3MnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTZXR0aW5nc1JlcG9zaXRvcnkoUmVzdGFuZ3VsYXIpIHtcbiAgICB2YXIgYXBpID0gJ2FkbWluL29wdGlvbnMnO1xuICAgIHZhciBvcHRpb24gPSBSZXN0YW5ndWxhci5hbGwoYXBpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvbmU6IGZ1bmN0aW9uKGlkLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuZ2V0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGxpc3Q6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbi5nZXRMaXN0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuc3RyaXBSZXN0YW5ndWxhcihlbGVtKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlOiBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5yZW1vdmUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbihjYXRlZ29yeUtleSwgZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGNhdGVnb3J5S2V5KS5jdXN0b21QVVQoZGF0YSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5TZXR0aW5nc1JlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ3NSZXBvc2l0b3J5O1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlckRldGFpbHNDdHJsKCRzY29wZSwgVXRpbHMsIFVzZXJSZXBvc2l0b3J5KSB7XG4gICAgLy8gZ2V0IHNpbmdsZSB1c2VyXG4gICAgVXNlclJlcG9zaXRvcnkub25lKFV0aWxzLiRzdGF0ZVBhcmFtcy51c2VySWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBVc2VyUmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSk7XG4gICAgfSk7XG59XG5Vc2VyRGV0YWlsc0N0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ1VzZXJSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJEZXRhaWxzQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJEZXRhaWxzQ3RybCgkc2NvcGUsIFVzZXJSZXBvc2l0b3J5LCBVdGlscykge1xuICAgIC8vIGdldCBzaW5nbGUgdXNlclxuICAgIFVzZXJSZXBvc2l0b3J5Lm9uZShVdGlscy4kc3RhdGVQYXJhbXMudXNlcklkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICRzY29wZS51c2VyID0gVXNlclJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnNhdmVVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIFVzZXJSZXBvc2l0b3J5LnVwZGF0ZSgkc2NvcGUudXNlci5pZCwgJHNjb3BlLnVzZXIpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbygndXNlci5saXN0Jyk7XG4gICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ1RIRV9DSEFOR0VTX0hBVkVfQkVFTl9TQVZFRCcpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG59XG5Vc2VyRGV0YWlsc0N0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1VzZXJSZXBvc2l0b3J5JywgJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJEZXRhaWxzQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJMaXN0Q3RybCgkc2NvcGUsIFV0aWxzLCBVc2VyUmVwb3NpdG9yeSwgTmdUYWJsZVBhcmFtcykge1xuICAgICRzY29wZS50YWJsZVBhcmFtcyA9IG5ldyBOZ1RhYmxlUGFyYW1zKHtcbiAgICAgICAgY291bnQ6IDI1LCAvLyBjb3VudCBwZXIgcGFnZVxuICAgICAgICBzb3J0aW5nOiB7XG4gICAgICAgICAgICAnaWQnOiAnZGVzYycgLy8gaW5pdGlhbCBzb3J0aW5nXG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIHRvdGFsOiAwLCAvLyBsZW5ndGggb2YgZGF0YVxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigkZGVmZXIsIHBhcmFtcykge1xuICAgICAgICAgICAgJHNjb3BlLnJlcXVlc3RQZW5kaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAndXNlcidcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQgbGlzdCBieSBkZWZhdWx0XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IFVzZXJSZXBvc2l0b3J5Lmxpc3QocXVlcnlPcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gUHJvbWlzZSBpcyBhIFJFU1QgQW5ndWxhckpTIHNlcnZpY2UgdGhhdCB0YWxrcyB0byBhcGkgYW5kIHJldHVybiBwcm9taXNlXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVxdWVzdFBlbmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwYXJhbXMudG90YWwocmVzcG9uc2UubWV0YS50b3RhbCk7XG4gICAgICAgICAgICAgICAgJGRlZmVyLnJlc29sdmUoVXNlclJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLnVzZXJMaXN0QWN0aW9ucyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ1ZJRVcnLFxuICAgICAgICAgICAgdXJsOiAndXNlci5zaG93KHsgdXNlcklkOiByZWNvcmRfaWQgfSknLFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLXNlYXJjaCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ0VESVQnLFxuICAgICAgICAgICAgaHJlZjogJ3VzZXIuZWRpdCh7IHVzZXJJZDogcmVjb3JkX2lkIH0pJyxcbiAgICAgICAgICAgIGljb246ICdmYSBmYS1wZW5jaWwnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdERUxFVEUnLFxuICAgICAgICAgICAgY2xpY2s6ICdkZWxldGUnLCAvLyB0aGlzIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCBkZWxldGUgYWN0aW9uXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtdGltZXMnXG4gICAgICAgIH1cbiAgICBdO1xufVxuXG5Vc2VyTGlzdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ1VzZXJSZXBvc2l0b3J5JywgJ25nVGFibGVQYXJhbXMnXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlckxpc3RDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlckxpc3RDdHJsKCRzY29wZSwgVXRpbHMsIFVzZXJSZXBvc2l0b3J5LCAkbW9kYWwpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy91c2VyL2RpcmVjdGl2ZXMvJztcbiAgICBcbiAgICAvLyBEZWxldGUgbW9kYWxcbiAgICB2bS5kZWxldGVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICd1c2VyRGVsZXRlTW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEJpbmQgaG90a2V5c1xuICAgICAgICAgICAgVXRpbHMuaG90a2V5cy5hZGQoe1xuICAgICAgICAgICAgICAgIGNvbWJvOiAnZW50ZXInLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ09ORklSTV9ERUxFVEUnLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kZWxldGVVc2VyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIHVzZXJJZCBjb250ZW50IGlkIHRvIGJlIHJlbW92ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbih1c2VySWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLnVzZXJJZCA9IHVzZXJJZDtcbiAgICAgICAgICAgIGlmICh1c2VySWQgIT09IFV0aWxzLkNvbmZpZy5jdXJyZW50VXNlcklkKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ0RFTEVURV9VU0VSX1FVRVNUSU9OJyk7XG4gICAgICAgICAgICAgICAgVXRpbHMuaG90a2V5cy5kZWwoJ2VudGVyJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vWW91IGNhbiBub3QgZGVsZXRlIHlvdXIgb3duIGFjY291bnQhXG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRFcnJvcignREVMRVRFX1NFTEZfVVNFUl9FUlJPUicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBERUxFVEUgYWN0aW9uIGZvciB1c2VyIGlkIGluIHNjb3BlXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBkZWxldGVVc2VyOiBmdW5jdGlvbih1c2VySWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIFVzZXJSZXBvc2l0b3J5LmRlbGV0ZSh2bS51c2VySWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblVzZXJMaXN0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnVXNlclJlcG9zaXRvcnknLCAnJG1vZGFsJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJMaXN0Q3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlckFjdGlvbnNEcm9wZG93bigkZHJvcGRvd24pIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZToge3VzZXJBY3Rpb25zRHJvcGRvd246ICc9JywgcmVjb3JkOiAnPSd9LFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckRlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgVXNlckRlbGV0ZUN0cmwpIHtcbiAgICAgICAgICAgIHZhciBkcm9wZG93biA9ICRkcm9wZG93bihlbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdnemVyby9hZG1pbi92aWV3cy91c2VyL2RpcmVjdGl2ZXMvdXNlckFjdGlvbnNEcm9wZG93bi50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uOiAnYW0tZmxpcC14JyxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdib3R0b20tcmlnaHQnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGJldHRlciBwYXJhbXMgcmVwbGFjZW1lbnQgYW5kIGZ1bmN0aW9ucyBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIF8ubWFwVmFsdWVzKHNjb3BlLnVzZXJBY3Rpb25zRHJvcGRvd24sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBuLnVybCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlY29yZCBpZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG4udXJsLmluZGV4T2YoJ3JlY29yZF9pZCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4udXJsID0gbi51cmwucmVwbGFjZSgncmVjb3JkX2lkJywgc2NvcGUucmVjb3JkLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygbi5ocmVmICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVjb3JkIGlkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobi5ocmVmLmluZGV4T2YoJ3JlY29yZF9pZCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4uaHJlZiA9IG4uaHJlZi5yZXBsYWNlKCdyZWNvcmRfaWQnLCBzY29wZS5yZWNvcmQuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgZHJvcGRvd24uJHNjb3BlLnVzZXIgPSBzY29wZS51c2VyQWN0aW9uc0Ryb3Bkb3duO1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS5yZWNvcmQgPSBzY29wZS5yZWNvcmQ7IC8vIFBhc3MgdXNlciBpZCB0byB0aGUgdmlld1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS5kZWxldGVNb2RhbCA9IFVzZXJEZWxldGVDdHJsLmRlbGV0ZU1vZGFsOyAvLyBQYXNzIGRlbGV0ZSBhY3Rpb24gdG8gdGhlIHZpZXdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuVXNlckFjdGlvbnNEcm9wZG93bi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJBY3Rpb25zRHJvcGRvd247XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyRGVsZXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB1c2VySWQ6ICc9J1xuICAgICAgICB9LFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnVXNlckRlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgVXNlckRlbGV0ZUNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIFVzZXJEZWxldGVDb250cm9sbGVyLmRlbGV0ZU1vZGFsLnNob3dNb2RhbChzY29wZS51c2VySWQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Vc2VyRGVsZXRlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlckRlbGV0ZUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2FkbWluLnVzZXInLCBbJ25nVGFibGUnXSlcbiAgICAuY29uZmlnKFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgICAgICdSZXN0YW5ndWxhclByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgUmVzdGFuZ3VsYXJQcm92aWRlcikge1xuXG4gICAgICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvdXNlci8nO1xuXG4gICAgICAgICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgLnN0YXRlKCd1c2VyJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvdXNlcicsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdpbmRleC5odG1sJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCd1c2VyLnNob3cnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy97dXNlcklkfS9zaG93JyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdzaG93Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyRGV0YWlsc0N0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5zdGF0ZSgndXNlci5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve3VzZXJJZH0vZWRpdCcsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVXNlckVkaXRDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ3VzZXIubGlzdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2xpc3Q/cGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdsaXN0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSlcbiAgICAuY29udHJvbGxlcignVXNlckxpc3RDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Vc2VyTGlzdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignVXNlckRlbGV0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvVXNlckRlbGV0ZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignVXNlckVkaXRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Vc2VyRWRpdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignVXNlckRldGFpbHNDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Vc2VyRGV0YWlsc0N0cmwnKSlcbiAgICAuZmFjdG9yeSgnVXNlclJlcG9zaXRvcnknLCByZXF1aXJlKCcuL3NlcnZpY2VzL1VzZXJSZXBvc2l0b3J5LmpzJykpXG4gICAgLmRpcmVjdGl2ZSgndXNlckRlbGV0ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Vc2VyRGVsZXRlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgndXNlckFjdGlvbnNEcm9wZG93bicsIFsnJGRyb3Bkb3duJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL1VzZXJBY3Rpb25zRHJvcGRvd24uanMnKV0pXG4gICAgLnJ1bihbXG4gICAgICAgICdOYXZCYXInLFxuICAgICAgICBmdW5jdGlvbihOYXZCYXIpIHtcbiAgICAgICAgICAgIE5hdkJhci5hZGQoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAnVVNFUlMnLCBhY3Rpb246ICd1c2VyLmxpc3QnLCBpY29uOiAnZmEgZmEtdXNlcidcbiAgICAgICAgICAgICAgICAvL2NoaWxkcmVuOiBbXG4gICAgICAgICAgICAgICAgLy8gICAge1xuICAgICAgICAgICAgICAgIC8vICAgICAgICB0aXRsZTogJ1VTRVJfTElTVCcsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgIGFjdGlvbjogJ3VzZXIubGlzdCcsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgIGljb246ICdmYSBmYS10aCdcbiAgICAgICAgICAgICAgICAvLyAgICB9XG4gICAgICAgICAgICAgICAgLy9dXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlclJlcG9zaXRvcnkoUmVzdGFuZ3VsYXIpIHtcbiAgICB2YXIgYXBpID0gJ2FkbWluL3VzZXJzJztcbiAgICB2YXIgdXNlcnMgPSBSZXN0YW5ndWxhci5hbGwoYXBpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvbmU6IGZ1bmN0aW9uKGlkLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuZ2V0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHRyZWU6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGkpLmdldExpc3QoJ3RyZWUnLCBwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0OiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB1c2Vycy5nZXRMaXN0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuc3RyaXBSZXN0YW5ndWxhcihlbGVtKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlOiBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5yZW1vdmUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbihpZCwgdXNlcikge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5jdXN0b21QVVQodXNlcik7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Vc2VyUmVwb3NpdG9yeS4kaW5qZWN0ID0gWydSZXN0YW5ndWxhciddO1xubW9kdWxlLmV4cG9ydHMgPSBVc2VyUmVwb3NpdG9yeTtcbiJdfQ==
