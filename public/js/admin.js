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
                Utils.Notifications.addError(response.data.error.message);
            } else if (response.status === 403) {
                localStorage.removeItem('gzero_api_token');
                window.location.reload();
            }
            Utils.Notifications.addErrors(response.data.messages);
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
            Utils.Notifications.addErrors(response.data.messages);
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
                    Utils.Notifications.addErrors(response.data.messages);
                });
            } else {
                Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
                Utils.redirectBack('blocks.list');
            }

        }, function(response) {
            Utils.Notifications.addErrors(response.data.messages);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJzcmMvYXBwLmpzIiwic3JjL2Jsb2Nrcy9jb250cm9sbGVycy9CbG9ja3NBZGRDdHJsLmpzIiwic3JjL2Jsb2Nrcy9jb250cm9sbGVycy9CbG9ja3NFZGl0Q3RybC5qcyIsInNyYy9ibG9ja3MvY29udHJvbGxlcnMvQmxvY2tzTGlzdEN0cmwuanMiLCJzcmMvYmxvY2tzL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQmxvY2tzRGVsZXRlQ3RybC5qcyIsInNyYy9ibG9ja3MvZGlyZWN0aXZlcy9CbG9ja0RlbGV0ZUJ1dHRvbi5qcyIsInNyYy9ibG9ja3MvbW9kdWxlLmpzIiwic3JjL2Jsb2Nrcy9zZXJ2aWNlcy9CbG9ja1NlcnZpY2UuanMiLCJzcmMvYmxvY2tzL3NlcnZpY2VzL0Jsb2Nrc1JlcG9zaXRvcnkuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50QWRkQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRBZGRUcmFuc2xhdGlvbkN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50QmxvY2tzQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudERhc2hib2FyZEN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50RGV0YWlsc0N0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50RGV0YWlsc0VkaXRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudEhpc3RvcnlDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudExpc3RDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudFRyYXNoY2FuQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRQdWJsaXNoZWRBdEVkaXRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50UmVzdG9yZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRSb3V0ZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRUaGVtZUVkaXRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50VG9nZ2xlUHJvcGVydHlDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50V2VpZ2h0RWRpdEN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL1NldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9UcmFuc2xhdGlvbkRlbGV0ZUN0cmwuanMiLCJzcmMvY29udGVudC9kaXJlY3RpdmVzL0NoYXJhY3RlcnNDb3VudGVyLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50QWN0aW9uc0Ryb3Bkb3duLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50RGVsZXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50RWRpdFJvdXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50UHVibGlzaGVkQXRFZGl0QnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50UmVzdG9yZUJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudFRoZW1lRWRpdEJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudFRvZ2dsZVByb3BlcnR5QnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvZGlyZWN0aXZlcy9Db250ZW50V2VpZ2h0RWRpdEJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvVHJhbnNsYXRpb25EZWxldGVCdXR0b24uanMiLCJzcmMvY29udGVudC9tb2R1bGUuanMiLCJzcmMvY29udGVudC9zZXJ2aWNlcy9Db250ZW50UmVwb3NpdG9yeS5qcyIsInNyYy9jb3JlL2NvbnRyb2xsZXJzL0NvcmVDdHJsLmpzIiwic3JjL2NvcmUvZGlyZWN0aXZlcy9TdGF0ZXNEcm9wZG93bi5qcyIsInNyYy9jb3JlL2ZpbHRlcnMvQ29yZUZpbHRlcnMuanMiLCJzcmMvY29yZS9tb2R1bGUuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9BcGlSZXBvc2l0b3J5LmpzIiwic3JjL2NvcmUvc2VydmljZXMvTGFuZ1JlcG9zaXRvcnkuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9OYXZCYXIuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9Ub3BOYXZCYXIuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9UcmFuc2xhdGlvbnMuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9VdGlscy5qcyIsInNyYy9maWxlcy9jb250cm9sbGVycy9GaWxlc0FkZEN0cmwuanMiLCJzcmMvZmlsZXMvY29udHJvbGxlcnMvRmlsZXNBZGRUcmFuc2xhdGlvbkN0cmwuanMiLCJzcmMvZmlsZXMvY29udHJvbGxlcnMvRmlsZXNEZXRhaWxzQ3RybC5qcyIsInNyYy9maWxlcy9jb250cm9sbGVycy9GaWxlc0RldGFpbHNFZGl0Q3RybC5qcyIsInNyYy9maWxlcy9jb250cm9sbGVycy9GaWxlc0xpc3RDdHJsLmpzIiwic3JjL2ZpbGVzL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvRmlsZXNEZWxldGVDdHJsLmpzIiwic3JjL2ZpbGVzL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvRmlsZXNEZWxldGVUcmFuc2xhdGlvbkN0cmwuanMiLCJzcmMvZmlsZXMvY29udHJvbGxlcnMvZGlyZWN0aXZlcy9GaWxlc1RvZ2dsZVByb3BlcnR5Q3RybC5qcyIsInNyYy9maWxlcy9kaXJlY3RpdmVzL0ZpbGVEZWxldGVCdXR0b24uanMiLCJzcmMvZmlsZXMvZGlyZWN0aXZlcy9GaWxlVG9nZ2xlUHJvcGVydHlCdXR0b24uanMiLCJzcmMvZmlsZXMvZGlyZWN0aXZlcy9GaWxlVHJhbnNsYXRpb25EZWxldGVCdXR0b24uanMiLCJzcmMvZmlsZXMvbW9kdWxlLmpzIiwic3JjL2ZpbGVzL3NlcnZpY2VzL0ZpbGVTZXJ2aWNlLmpzIiwic3JjL2ZpbGVzL3NlcnZpY2VzL0ZpbGVzUmVwb3NpdG9yeS5qcyIsInNyYy9saWIvTm90aWZpY2F0aW9ucy5qcyIsInNyYy9saWIvU3RvcmFnZS5qcyIsInNyYy9saWIvY2tPcHRpb25zLmpzIiwic3JjL2xpYi9uYXZpZ2F0aW9uLmpzIiwic3JjL3NldHRpbmdzL2NvbnRyb2xsZXJzL1NldHRpbmdzQ3RybC5qcyIsInNyYy9zZXR0aW5ncy9jb250cm9sbGVycy9kaXJlY3RpdmVzL1NldHRpbmdDb3B5Q3RybC5qcyIsInNyYy9zZXR0aW5ncy9kaXJlY3RpdmVzL1NldHRpbmdDb3B5QnV0dG9uLmpzIiwic3JjL3NldHRpbmdzL21vZHVsZS5qcyIsInNyYy9zZXR0aW5ncy9zZXJ2aWNlcy9TZXR0aW5nc1JlcG9zaXRvcnkuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyRGV0YWlsc0N0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyRWRpdEN0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9Vc2VyTGlzdEN0cmwuanMiLCJzcmMvdXNlci9jb250cm9sbGVycy9kaXJlY3RpdmVzL1VzZXJEZWxldGVDdHJsLmpzIiwic3JjL3VzZXIvZGlyZWN0aXZlcy9Vc2VyQWN0aW9uc0Ryb3Bkb3duLmpzIiwic3JjL3VzZXIvZGlyZWN0aXZlcy9Vc2VyRGVsZXRlQnV0dG9uLmpzIiwic3JjL3VzZXIvbW9kdWxlLmpzIiwic3JjL3VzZXIvc2VydmljZXMvVXNlclJlcG9zaXRvcnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDanJEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbmZ1bmN0aW9uIGluaXQgKCkge1xuICB2YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbiAgfVxuXG4gIHJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxuICByZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcbn1cblxuaW5pdCgpXG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcblxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcbiAgLy8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuICAvLyByZXByZXNlbnQgb25lIGJ5dGVcbiAgLy8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG4gIC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2VcbiAgcGxhY2VIb2xkZXJzID0gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxuXG4gIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICBhcnIgPSBuZXcgQXJyKGxlbiAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogRHVlIHRvIHZhcmlvdXMgYnJvd3NlciBidWdzLCBzb21ldGltZXMgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiB3aWxsIGJlIHVzZWQgZXZlblxuICogd2hlbiB0aGUgYnJvd3NlciBzdXBwb3J0cyB0eXBlZCBhcnJheXMuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAgIC0gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLFxuICogICAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG5cbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5XG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCBiZWhhdmVzIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVCAhPT0gdW5kZWZpbmVkXG4gID8gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgOiB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbi8qXG4gKiBFeHBvcnQga01heExlbmd0aCBhZnRlciB0eXBlZCBhcnJheSBzdXBwb3J0IGlzIGRldGVybWluZWQuXG4gKi9cbmV4cG9ydHMua01heExlbmd0aCA9IGtNYXhMZW5ndGgoKVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHtfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH19XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDIgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgYXJyLnN1YmFycmF5KDEsIDEpLmJ5dGVMZW5ndGggPT09IDAgLy8gaWUxMCBoYXMgYnJva2VuIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGtNYXhMZW5ndGggKCkge1xuICByZXR1cm4gQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgICA/IDB4N2ZmZmZmZmZcbiAgICA6IDB4M2ZmZmZmZmZcbn1cblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgaWYgKGtNYXhMZW5ndGgoKSA8IGxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHR5cGVkIGFycmF5IGxlbmd0aCcpXG4gIH1cbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgaWYgKHRoYXQgPT09IG51bGwpIHtcbiAgICAgIHRoYXQgPSBuZXcgQnVmZmVyKGxlbmd0aClcbiAgICB9XG4gICAgdGhhdC5sZW5ndGggPSBsZW5ndGhcbiAgfVxuXG4gIHJldHVybiB0aGF0XG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmICEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdJZiBlbmNvZGluZyBpcyBzcGVjaWZpZWQgdGhlbiB0aGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKHRoaXMsIGFyZylcbiAgfVxuICByZXR1cm4gZnJvbSh0aGlzLCBhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbi8vIFRPRE86IExlZ2FjeSwgbm90IG5lZWRlZCBhbnltb3JlLiBSZW1vdmUgaW4gbmV4dCBtYWpvciB2ZXJzaW9uLlxuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIGZyb20gKHRoYXQsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXInKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgdmFsdWUgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodGhhdCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodGhhdCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICByZXR1cm4gZnJvbU9iamVjdCh0aGF0LCB2YWx1ZSlcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbShudWxsLCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG5pZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuICBCdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuICBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgJiZcbiAgICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICAgIC8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSlcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAodGhhdCwgc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2MobnVsbCwgc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlICh0aGF0LCBzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgKytpKSB7XG4gICAgICB0aGF0W2ldID0gMFxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKG51bGwsIHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKG51bGwsIHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJlbmNvZGluZ1wiIG11c3QgYmUgYSB2YWxpZCBzdHJpbmcgZW5jb2RpbmcnKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuZ3RoKVxuXG4gIHRoYXQud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKHRoYXQsIGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgYXJyYXkuYnl0ZUxlbmd0aCAvLyB0aGlzIHRocm93cyBpZiBgYXJyYXlgIGlzIG5vdCBhIHZhbGlkIEFycmF5QnVmZmVyXG5cbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ29mZnNldFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnbGVuZ3RoXFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBhcnJheVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0ID0gZnJvbUFycmF5TGlrZSh0aGF0LCBhcnJheSlcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW4pXG5cbiAgICBpZiAodGhhdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0XG4gICAgfVxuXG4gICAgb2JqLmNvcHkodGhhdCwgMCwgMCwgbGVuKVxuICAgIHJldHVybiB0aGF0XG4gIH1cblxuICBpZiAob2JqKSB7XG4gICAgaWYgKCh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIG9iai5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikgfHwgJ2xlbmd0aCcgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IGlzbmFuKG9iai5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIodGhhdCwgMClcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHRoYXQsIG9iailcbiAgICB9XG5cbiAgICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmouZGF0YSlcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgYXJyYXktbGlrZSBvYmplY3QuJylcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IGtNYXhMZW5ndGhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IHN0cmluZyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIGNhc2UgJ3Jhdyc6XG4gICAgICBjYXNlICdyYXdzJzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGUgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCBhbmQgYGlzLWJ1ZmZlcmAgKGluIFNhZmFyaSA1LTcpIHRvIGRldGVjdFxuLy8gQnVmZmVyIGluc3RhbmNlcy5cbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8IDBcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICBmb3IgKHZhciBpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBzcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpXG4gIH1cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAoaXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoIHwgMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIC8vIGxlZ2FjeSB3cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aCkgLSByZW1vdmUgaW4gdjAuMTNcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gICAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyArK2kpIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7ICsraSkge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyArK2kpIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG4gIHZhciBpXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yIChpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2UgaWYgKGxlbiA8IDEwMDAgfHwgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gYXNjZW5kaW5nIGNvcHkgZnJvbSBzdGFydFxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoY29kZSA8IDI1Nikge1xuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogdXRmOFRvQnl0ZXMobmV3IEJ1ZmZlcih2YWwsIGVuY29kaW5nKS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7ICsraSkge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXitcXC8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBpc25hbiAodmFsKSB7XG4gIHJldHVybiB2YWwgIT09IHZhbCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCJ2YXIgdG9TdHJpbmcgPSB7fS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBpcyBub3QgZGVmaW5lZCcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICB9XG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgfVxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi9jb3JlL21vZHVsZS5qcycpO1xucmVxdWlyZSgnLi9jb250ZW50L21vZHVsZS5qcycpO1xucmVxdWlyZSgnLi9ibG9ja3MvbW9kdWxlLmpzJyk7XG5yZXF1aXJlKCcuL3VzZXIvbW9kdWxlLmpzJyk7XG5yZXF1aXJlKCcuL2ZpbGVzL21vZHVsZS5qcycpO1xucmVxdWlyZSgnLi9zZXR0aW5ncy9tb2R1bGUuanMnKTtcblxudmFyIGRlcGVuZGVuY2llcyA9IFtcbiAgICAncmVzdGFuZ3VsYXInLFxuICAgICd1aS5yb3V0ZXInLFxuICAgICd1aS5yb3V0ZXIuZGVmYXVsdCcsXG4gICAgJ2N0LnVpLnJvdXRlci5leHRyYXMnLFxuICAgICduZ0FuaW1hdGUnLFxuICAgICdtZ2NyZWEubmdTdHJhcCcsXG4gICAgJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUnLFxuICAgICdja2VkaXRvcicsXG4gICAgJ2FuZ3VsYXItbG9hZGluZy1iYXInLFxuICAgICduZy5odHRwTG9hZGVyJyxcbiAgICAnY2ZwLmhvdGtleXMnLFxuICAgICdhZG1pbi5jb3JlJyxcbiAgICAnYWRtaW4uY29udGVudCcsXG4gICAgJ2FkbWluLmJsb2NrcycsXG4gICAgJ2FkbWluLmZpbGVzJyxcbiAgICAnYWRtaW4udXNlcicsXG4gICAgJ2FkbWluLnNldHRpbmdzJyxcbiAgICAnbmdGaWxlVXBsb2FkJyxcbiAgICAnbmdNZXNzYWdlcydcbl07XG5kZXBlbmRlbmNpZXMucHVzaC5hcHBseShkZXBlbmRlbmNpZXMsIG1vZHVsZXMpOyAvLyBPdGhlciBtb2R1bGVzIGFyZSBsb2FkZWQgYnkgdHdpZ1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4nLCBkZXBlbmRlbmNpZXMpLmNvbmZpZyhbXG4gICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAnJHVybFJvdXRlclByb3ZpZGVyJyxcbiAgICAnUmVzdGFuZ3VsYXJQcm92aWRlcicsXG4gICAgJyR0cmFuc2xhdGVQcm92aWRlcicsXG4gICAgJyR0cmFuc2xhdGVQYXJ0aWFsTG9hZGVyUHJvdmlkZXInLFxuICAgICdodHRwTWV0aG9kSW50ZXJjZXB0b3JQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgUmVzdGFuZ3VsYXJQcm92aWRlciwgJHRyYW5zbGF0ZVByb3ZpZGVyLCAkdHJhbnNsYXRlUGFydGlhbExvYWRlclByb3ZpZGVyLCBodHRwTWV0aG9kSW50ZXJjZXB0b3JQcm92aWRlcikge1xuICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvJztcblxuICAgICAgICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9zdGF0ZTFcbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuICAgICAgICAvLyBXaGl0ZWxpc3QgdGhlIGRvbWFpbnMgdGhhdCB0aGUgbG9hZGVyIHdpbCBzaG93IGZvclxuICAgICAgICBodHRwTWV0aG9kSW50ZXJjZXB0b3JQcm92aWRlci53aGl0ZWxpc3REb21haW4oQ29uZmlnLmRvbWFpbik7XG4gICAgICAgIC8vIE5vdyBzZXQgdXAgdGhlIHN0YXRlc1xuICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKCdob21lJywge1xuICAgICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdob21lLmh0bWwnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIudXNlTG9hZGVyKCckdHJhbnNsYXRlUGFydGlhbExvYWRlcicsIHtcbiAgICAgICAgICAgIHVybFRlbXBsYXRlOiAnZ3plcm8ve3BhcnR9L2xhbmcve2xhbmd9Lmpzb24nXG4gICAgICAgIH0pO1xuICAgICAgICAkdHJhbnNsYXRlUGFydGlhbExvYWRlclByb3ZpZGVyLmFkZFBhcnQoJ2FkbWluJyk7XG4gICAgICAgICR0cmFuc2xhdGVQcm92aWRlci5wcmVmZXJyZWRMYW5ndWFnZSgnZW5fVVMnKTtcblxuICAgICAgICAvLyBVc2VyIG1vcmUgc2VjdXJlIHZhcmlhbnQgc2FuaXRpemUgc3RyYXRlZ3kgZm9yIGVzY2FwaW5nO1xuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIudXNlU2FuaXRpemVWYWx1ZVN0cmF0ZWd5KCdlc2NhcGUnKTtcblxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldEJhc2VVcmwoQ29uZmlnLmFwaVVybCArICcvdjEnKTtcblxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldERlZmF1bHRIdHRwRmllbGRzKHtcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCByZXF1ZXN0IGhlYWRlcnNcbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5zZXREZWZhdWx0SGVhZGVycyh7XG4gICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCcsXG4gICAgICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiAnQmVhcmVyICcgKyBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZ3plcm9fYXBpX3Rva2VuJylcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVuYW1lIFJlc3Rhbmd1bGFyIHJvdXRlIGZpZWxkIHRvIHVzZSBhICQgcHJlZml4IGZvciBlYXN5IGRpc3RpbmN0aW9uIGJldHdlZW4gZGF0YSBhbmQgbWV0YWRhdGFcbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5zZXRSZXN0YW5ndWxhckZpZWxkcyh7cm91dGU6ICckcm91dGUnfSk7XG4gICAgICAgIC8vIEFkZCBhIHJlc3BvbnNlIGludGVyY2VwdG9yXG4gICAgICAgIFJlc3Rhbmd1bGFyUHJvdmlkZXIuYWRkUmVzcG9uc2VJbnRlcmNlcHRvcihmdW5jdGlvbihkYXRhLCBvcGVyYXRpb24pIHtcbiAgICAgICAgICAgIHZhciBleHRyYWN0ZWREYXRhO1xuICAgICAgICAgICAgLy8gLi4gdG8gbG9vayBmb3IgZ2V0TGlzdCBvcGVyYXRpb25zXG5cbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24gPT09ICdnZXRMaXN0Jykge1xuICAgICAgICAgICAgICAgIC8vIC4uIGFuZCBoYW5kbGUgdGhlIGRhdGEgYW5kIG1ldGEgZGF0YVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YS5kYXRhICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhLm1ldGEgPSBkYXRhLm1ldGE7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEucGFyYW1zID0gZGF0YS5wYXJhbXM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gb25seSBvbmUgaXRlbSBpbiBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHRyYWN0ZWREYXRhID0gZGF0YTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGV4dHJhY3RlZERhdGE7XG4gICAgICAgIH0pO1xuICAgIH1cbl0pLnJ1bihbXG4gICAgJ05hdkJhcicsXG4gICAgJyRyb290U2NvcGUnLFxuICAgICdSZXN0YW5ndWxhcicsXG4gICAgJ1V0aWxzJyxcbiAgICBmdW5jdGlvbihOYXZCYXIsICRyb290U2NvcGUsIFJlc3Rhbmd1bGFyLCBVdGlscykge1xuICAgICAgICBOYXZCYXIuYWRkRmlyc3Qoe3RpdGxlOiAnREFTSEJPQVJEJywgYWN0aW9uOiAnaG9tZScsIGljb246ICdmYSBmYS1ob21lJ30pO1xuICAgICAgICAkcm9vdFNjb3BlLmJhc2VVcmwgPSBVdGlscy5Db25maWcudXJsO1xuXG4gICAgICAgIFJlc3Rhbmd1bGFyLnNldEVycm9ySW50ZXJjZXB0b3IoZnVuY3Rpb24ocmVzcG9uc2UsIGRlZmVycmVkLCByZXNwb25zZUhhbmRsZXIpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ0NPTU1PTl9FUlJPUicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gZXJyb3IgaGFuZGxlZFxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDUwMCkge1xuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3IocmVzcG9uc2UuZGF0YS5lcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZ3plcm9fYXBpX3Rva2VuJyk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRFcnJvcnMocmVzcG9uc2UuZGF0YS5tZXNzYWdlcyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGVycm9yIG5vdCBoYW5kbGVkXG4gICAgICAgIH0pO1xuICAgIH1cbl0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBCbG9ja3NBZGRDdHJsKCRzY29wZSwgVXRpbHMsIGxhbmdDb2RlLCBCbG9ja3NSZXBvc2l0b3J5LCBCbG9ja1NlcnZpY2UpIHtcbiAgICAkc2NvcGUuY2tPcHRpb25zID0gVXRpbHMuY2tPcHRpb25zO1xuICAgICRzY29wZS5pc0VkaXRlZCA9IGZhbHNlO1xuICAgIC8vIGRlZmF1bHQgdmFsdWVzXG4gICAgJHNjb3BlLm5ld0Jsb2NrID0ge1xuICAgICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgICAgd2VpZ2h0OiAwLFxuICAgICAgICB0cmFuc2xhdGlvbnM6IHtcbiAgICAgICAgICAgIGxhbmdDb2RlOiBsYW5nQ29kZVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIGlmIGJsb2NrIHR5cGVzIGFyZSBzZXRcbiAgICBpZiAodHlwZW9mICRzY29wZS5ibG9ja1R5cGVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubmV3QmxvY2sudHlwZSA9ICRzY29wZS5ibG9ja1R5cGVzWzBdO1xuICAgIH1cblxuICAgIC8vIGlmIGJsb2NrIHJlZ2lvbnMgYXJlIHNldFxuICAgIGlmICh0eXBlb2YgJHNjb3BlLmJsb2NrUmVnaW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLm5ld0Jsb2NrLnJlZ2lvbiA9ICRzY29wZS5ibG9ja1JlZ2lvbnNbMF07XG4gICAgfVxuXG4gICAgLy8gYmxvY2sgUE9TVCBhY3Rpb25cbiAgICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uKG5ld0Jsb2NrKSB7XG4gICAgICAgIG5ld0Jsb2NrID0gQmxvY2tTZXJ2aWNlLnByZXBhcmVSZXF1ZXN0RGF0YShuZXdCbG9jayk7XG4gICAgICAgIEJsb2Nrc1JlcG9zaXRvcnkuY3JlYXRlKG5ld0Jsb2NrKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ0JMT0NLX0NSRUFURUQnKTtcbiAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbygnYmxvY2tzLmxpc3QnLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRFcnJvcnMocmVzcG9uc2UuZGF0YS5tZXNzYWdlcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbkJsb2Nrc0FkZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ2xhbmdDb2RlJywgJ0Jsb2Nrc1JlcG9zaXRvcnknLCAnQmxvY2tTZXJ2aWNlJ107XG5tb2R1bGUuZXhwb3J0cyA9IEJsb2Nrc0FkZEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJsb2Nrc0VkaXRDdHJsKCRzY29wZSwgVXRpbHMsIGxhbmdDb2RlLCBibG9jaywgQmxvY2tzUmVwb3NpdG9yeSwgQmxvY2tTZXJ2aWNlKSB7XG4gICAgJHNjb3BlLmNrT3B0aW9ucyA9IFV0aWxzLmNrT3B0aW9ucztcbiAgICAkc2NvcGUuaXNFZGl0ZWQgPSB0cnVlO1xuICAgIC8vIGlmIGJsb2NrIHR5cGVzIGFyZSBzZXRcbiAgICBpZiAodHlwZW9mIGJsb2NrICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubmV3QmxvY2sgPSBCbG9ja3NSZXBvc2l0b3J5LmNsZWFuKGJsb2NrKTtcbiAgICAgICAgLy8gc2V0IGFjdGl2ZSB0cmFuc2xhdGlvblxuICAgICAgICBpZiAodHlwZW9mICRzY29wZS5uZXdCbG9jay50cmFuc2xhdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAkc2NvcGUubmV3QmxvY2sudHJhbnNsYXRpb25zID0gXy5maW5kKCRzY29wZS5uZXdCbG9jay50cmFuc2xhdGlvbnMsIHsnbGFuZ0NvZGUnOiBsYW5nQ29kZX0pO1xuICAgICAgICAgICAgLy8gaWYgbm90IGZvdW5kLCBzZXQgYXMgbmV3XG4gICAgICAgICAgICBpZiAodHlwZW9mICRzY29wZS5uZXdCbG9jay50cmFuc2xhdGlvbnMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld0Jsb2NrLnRyYW5zbGF0aW9ucyA9IHsnbGFuZ0NvZGUnOiBsYW5nQ29kZX07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjaGVjayBmb3IgdHJhbnNsYXRpb25zIHVwZGF0ZSBAVE9ETyB1c2UgdHJhbnNsYXRpb25zIGhpc3RvcnlcbiAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbignbmV3QmxvY2sudHJhbnNsYXRpb25zJywgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICRzY29wZS5pc1RyYW5zbGF0aW9uQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGJsb2NrIFBVVCBhY3Rpb25cbiAgICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uKG5ld0Jsb2NrKSB7XG4gICAgICAgIG5ld0Jsb2NrID0gQmxvY2tTZXJ2aWNlLnByZXBhcmVSZXF1ZXN0RGF0YShuZXdCbG9jayk7XG4gICAgICAgIC8vIHVwZGF0ZSBibG9ja1xuICAgICAgICBCbG9ja3NSZXBvc2l0b3J5LnVwZGF0ZShVdGlscy4kc3RhdGVQYXJhbXMuYmxvY2tJZCwgbmV3QmxvY2spLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIGFkZCBuZXcgdHJhbnNsYXRpb24gQFRPRE8gdXNlIHRyYW5zbGF0aW9ucyBoaXN0b3J5XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmlzVHJhbnNsYXRpb25DaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgQmxvY2tzUmVwb3NpdG9yeS5jcmVhdGVUcmFuc2xhdGlvbihVdGlscy4kc3RhdGVQYXJhbXMuYmxvY2tJZCwgbmV3QmxvY2sudHJhbnNsYXRpb25zKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnVEhFX0NIQU5HRVNfSEFWRV9CRUVOX1NBVkVEJyk7XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLnJlZGlyZWN0QmFjaygnYmxvY2tzLmxpc3QnKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZEVycm9ycyhyZXNwb25zZS5kYXRhLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgICAgICAgICBVdGlscy5yZWRpcmVjdEJhY2soJ2Jsb2Nrcy5saXN0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3JzKHJlc3BvbnNlLmRhdGEubWVzc2FnZXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG5CbG9ja3NFZGl0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnbGFuZ0NvZGUnLCAnYmxvY2snLCAnQmxvY2tzUmVwb3NpdG9yeScsICdCbG9ja1NlcnZpY2UnXTtcbm1vZHVsZS5leHBvcnRzID0gQmxvY2tzRWRpdEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJsb2Nrc0xpc3RDdHJsKCRzY29wZSwgVXRpbHMsIE5nVGFibGVQYXJhbXMsIEJsb2Nrc1JlcG9zaXRvcnkpIHtcbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ3JlZ2lvbic6ICdkZXNjJywgLy8gaW5pdGlhbCBzb3J0aW5nXG4gICAgICAgICAgICAnd2VpZ2h0JzogJ2FzYydcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAgdG90YWw6IDAsIC8vIGxlbmd0aCBvZiBkYXRhXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCRkZWZlciwgcGFyYW1zKSB7XG4gICAgICAgICAgICAkc2NvcGUucmVxdWVzdFBlbmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgLy8gcHJlcGFyZSBvcHRpb25zIHRvIGJlIHNlbnQgdG8gYXBpXG4gICAgICAgICAgICB2YXIgcXVlcnlPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGxhbmc6IFV0aWxzLkNvbmZpZy5kZWZhdWx0TGFuZ0NvZGVlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBsYW5nIHNvcnQgb3B0aW9uc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAkc2NvcGUudHJhbnNMYW5nICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5sYW5nID0gJHNjb3BlLnRyYW5zTGFuZy5jb2RlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMuY291bnQoKSAtIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSBkZWNsYXJlZCBpbiB2aWV3XG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5jb3VudChVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBlclBhZ2UgPSBwYXJhbXMuY291bnQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyYW1zLnBhZ2UoKSAtIGN1cnJlbnQgcGFnZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucGFnZShVdGlscy4kc3RhdGVQYXJhbXMucGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBhZ2UgPSBwYXJhbXMucGFnZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0YWJsZVBhcmFtcy5vcmRlckJ5KCkgLSBhbiBhcnJheSBvZiBzdHJpbmcgaW5kaWNhdGluZyBib3RoIHRoZSBzb3J0aW5nIGNvbHVtbiBhbmQgZGlyZWN0aW9uIChlLmcuIFtcIituYW1lXCIsIFwiLWVtYWlsXCJdKVxuICAgICAgICAgICAgaWYgKHBhcmFtcy5zb3J0aW5nKCkgJiYgdHlwZW9mICRzY29wZS50cmFuc0xhbmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gb25seSBpbnRlcmVzdGVkIGluIGZpcnN0IHNvcnQgY29sdW1uIGZvciBub3dcbiAgICAgICAgICAgICAgICB2YXIgb3JkZXJCeSA9IHBhcmFtcy5vcmRlckJ5KClbMF07XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnNvcnQgPSBvcmRlckJ5WzBdID09PSAnKycgPyBvcmRlckJ5LnN1YnN0cmluZygxKSA6IG9yZGVyQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGdldCBsaXN0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gQmxvY2tzUmVwb3NpdG9yeS5saXN0KHF1ZXJ5T3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIFByb21pc2UgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlcXVlc3RQZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKEJsb2Nrc1JlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5CbG9ja3NMaXN0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnTmdUYWJsZVBhcmFtcycsICdCbG9ja3NSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IEJsb2Nrc0xpc3RDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBCbG9ja3NEZWxldGVDdHJsKCRzY29wZSwgVXRpbHMsIEJsb2Nrc1JlcG9zaXRvcnksICRtb2RhbCkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2Jsb2Nrcy9kaXJlY3RpdmVzLyc7XG4gICAgLy8gRGVsZXRlIG1vZGFsXG4gICAgdm0uZGVsZXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnYmxvY2tEZWxldGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQmluZCBob3RrZXlzXG4gICAgICAgICAgICBVdGlscy5ob3RrZXlzLmFkZCh7XG4gICAgICAgICAgICAgICAgY29tYm86ICdlbnRlcicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFV0aWxzLiRmaWx0ZXIoJ3RyYW5zbGF0ZScpKFxuICAgICAgICAgICAgICAgICAgICB2bS5mb3JjZURlbGV0ZSA/ICdDT05GSVJNX0RFTEVURScgOiAnQ09ORklSTV9NT1ZFX1RPX1RSQVNIJ1xuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmRlbGV0ZUNvbnRlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gYmxvY2tJZCBibG9jayBpZCB0byBiZSByZW1vdmVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICogQHBhcmFtIGZvcmNlRGVsZXRlIHVzZSBmb3JjZURlbGV0ZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihibG9ja0lkLCBmb3JjZURlbGV0ZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0uYmxvY2tJZCA9IGJsb2NrSWQ7XG4gICAgICAgICAgICB2bS5mb3JjZURlbGV0ZSA9IGZvcmNlRGVsZXRlO1xuICAgICAgICAgICAgaWYgKHZtLmZvcmNlRGVsZXRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ0RFTEVURV9CTE9DS19RVUVTVElPTicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnTU9WRV9CTE9DS19UT19UUkFTSF9RVUVTVElPTicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgVXRpbHMuaG90a2V5cy5kZWwoJ2VudGVyJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIERFTEVURSBhY3Rpb24gZm9yIGJsb2NrIGlkIGluIHNjb3BlXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBkZWxldGVCbG9jazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAvLyBTb2Z0IGFuZCBmb3JjZSBkZWxldGUgYmxvY2sgQFRPRE8gaGFuZGxlIHNvZnQgZGVsZXRlXG4gICAgICAgICAgICBCbG9ja3NSZXBvc2l0b3J5LmRlbGV0ZSh2bS5ibG9ja0lkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgQmxvY2tzUmVwb3NpdG9yeS5kZWxldGUodm0uYmxvY2tJZCwgdm0uZm9yY2VEZWxldGUpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbyhVdGlscy4kc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKFxuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZm9yY2VEZWxldGUgPyAnQkxPQ0tfSEFTX0JFRU5fREVMRVRFRCcgOiAnQkxPQ0tfSEFTX0JFRU5fTU9WRURfVE9fVFJBU0gnXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkJsb2Nrc0RlbGV0ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ0Jsb2Nrc1JlcG9zaXRvcnknLCAnJG1vZGFsJ107XG5tb2R1bGUuZXhwb3J0cyA9IEJsb2Nrc0RlbGV0ZUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJsb2NrRGVsZXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQmxvY2tzRGVsZXRlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIEJsb2Nrc0RlbGV0ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIEJsb2Nrc0RlbGV0ZUN0cmwuZGVsZXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmJsb2NrSWQsIGF0dHJzLmZvcmNlID09PSAndHJ1ZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5CbG9ja0RlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrRGVsZXRlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4uYmxvY2tzJywgW10pXG4gICAgLmNvbmZpZyhbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgICckdXJsUm91dGVyUHJvdmlkZXInLFxuICAgICAgICAnUmVzdGFuZ3VsYXJQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsIFJlc3Rhbmd1bGFyUHJvdmlkZXIpIHtcblxuICAgICAgICAgICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2Jsb2Nrcy8nO1xuXG4gICAgICAgICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdibG9ja3MnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9ibG9ja3MnLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBCTE9DSyBMSVNUXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdibG9ja3MubGlzdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2xpc3Q/cGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdsaXN0Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdCbG9ja3NMaXN0Q3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBCTE9DSyBBRERcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2Jsb2Nrcy5hZGQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9hZGQve2xhbmdDb2RlfScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZm9ybS5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQmxvY2tzQWRkQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFuZ0NvZGU6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzdGF0ZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMubGFuZ0NvZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBCTE9DSyBFRElUXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdibG9ja3MuZWRpdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tibG9ja0lkfS9lZGl0L3tsYW5nQ29kZX0nLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2Zvcm0uaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0Jsb2Nrc0VkaXRDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYW5nQ29kZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24oJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy5sYW5nQ29kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2s6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJywgJ0Jsb2Nrc1JlcG9zaXRvcnknLCBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIEJsb2Nrc1JlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJsb2Nrc1JlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5ibG9ja0lkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmNvbnRyb2xsZXIoJ0Jsb2Nrc0xpc3RDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9CbG9ja3NMaXN0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdCbG9ja3NBZGRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9CbG9ja3NBZGRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0Jsb2Nrc0VkaXRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9CbG9ja3NFZGl0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdCbG9ja3NEZWxldGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0Jsb2Nrc0RlbGV0ZUN0cmwnKSlcbiAgICAuc2VydmljZSgnQmxvY2tTZXJ2aWNlJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9CbG9ja1NlcnZpY2UuanMnKSlcbiAgICAuZmFjdG9yeSgnQmxvY2tzUmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvQmxvY2tzUmVwb3NpdG9yeS5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2Jsb2NrRGVsZXRlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0Jsb2NrRGVsZXRlQnV0dG9uLmpzJykpXG4gICAgLnJ1bihbXG4gICAgICAgICdOYXZCYXInLFxuICAgICAgICBmdW5jdGlvbihOYXZCYXIpIHtcbiAgICAgICAgICAgIE5hdkJhci5hZGQoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAnQkxPQ0tTJywgYWN0aW9uOiAnYmxvY2tzLmxpc3QnLCBpY29uOiAnZmEgZmEtdGgtbGFyZ2UnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBCbG9ja1NlcnZpY2UoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcHJlcGFyZVJlcXVlc3REYXRhOiBmdW5jdGlvbihibG9jaykge1xuICAgICAgICAgICAgLy8gaGFuZGxlIGJsb2NrIGZpbHRlclxuICAgICAgICAgICAgaWYgKGJsb2NrLmZpbHRlciAhPT0gbnVsbCAmJiB0eXBlb2YgYmxvY2suZmlsdGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIC8vIHNldCBlbXB0eSBmaWx0ZXIgdmFsdWVzIGlmIG5vdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoISgnKycgaW4gYmxvY2suZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBibG9jay5maWx0ZXJbJysnXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoISgnLScgaW4gYmxvY2suZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBibG9jay5maWx0ZXJbJy0nXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUgZW1wdHkgYmxvY2sgZmlsdGVyXG4gICAgICAgICAgICAgICAgaWYgKGJsb2NrLmZpbHRlclsnKyddLmxlbmd0aCA9PT0gMCAmJiBibG9jay5maWx0ZXJbJy0nXS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2suZmlsdGVyID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYmxvY2s7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5CbG9ja1NlcnZpY2UuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBCbG9ja1NlcnZpY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJsb2Nrc1JlcG9zaXRvcnkoUmVzdGFuZ3VsYXIpIHtcbiAgICB2YXIgYXBpID0gJ2FkbWluL2Jsb2Nrcyc7XG4gICAgdmFyIGJsb2NrcyA9IFJlc3Rhbmd1bGFyLmFsbChhcGkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG9uZTogZnVuY3Rpb24oaWQsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5nZXQocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGlzdDogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gYmxvY2tzLmdldExpc3QocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGlzdEZvckNvbnRlbnQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSArICcvY29udGVudCcsIGlkKS5nZXRMaXN0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuc3RyaXBSZXN0YW5ndWxhcihlbGVtKTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbihuZXdDb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gYmxvY2tzLnBvc3QobmV3Q29udGVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGV0ZTogZnVuY3Rpb24oaWQsIGZvcmNlRGVsZXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLnJlbW92ZSh7Zm9yY2U6IGZvcmNlRGVsZXRlfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24oY2F0ZWdvcnlLZXksIGRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBjYXRlZ29yeUtleSkuY3VzdG9tUFVUKGRhdGEpO1xuICAgICAgICB9LFxuICAgICAgICBjcmVhdGVUcmFuc2xhdGlvbjogZnVuY3Rpb24oaWQsIG5ld1RyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmFsbCgndHJhbnNsYXRpb25zJykucG9zdChuZXdUcmFuc2xhdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5CbG9ja3NSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IEJsb2Nrc1JlcG9zaXRvcnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRBZGRDdHJsKCRzY29wZSwgVXRpbHMsIGxpc3RQYXJlbnQsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgdmFyIHBhcmVudElkID0gbnVsbDtcbiAgICAkc2NvcGUuY29udGVudFR5cGUgPSBVdGlscy4kc3RhdGVQYXJhbXMudHlwZTtcblxuICAgICRzY29wZS5ja09wdGlvbnMgPSBVdGlscy5ja09wdGlvbnM7XG5cbiAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBsaXN0UGFyZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubGlzdFBhcmVudCA9IGxpc3RQYXJlbnQ7IC8vIHNlbGVjdGVkIGNhdGVnb3J5XG4gICAgICAgIHBhcmVudElkID0gbGlzdFBhcmVudC5pZDtcbiAgICB9XG4gICAgLy8gZGVmYXVsdCB0cmFuc2xhdGlvbnMgbGFuZyBjb2RlXG4gICAgJHNjb3BlLm5ld0NvbnRlbnQgPSB7XG4gICAgICAgIHR5cGU6IFV0aWxzLiRzdGF0ZVBhcmFtcy50eXBlLFxuICAgICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICBsYW5nQ29kZTogJHNjb3BlLnRyYW5zTGFuZy5jb2RlXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gQW5ndWxhciBzdHJhcCBkcm9wZG93biBmb3Igc2F2ZSBidXR0b25cbiAgICAkc2NvcGUuY29udGVudFNhdmVCdXR0b25MaW5rcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ1NBVkVfQU5EX0NPTlRJTlVFX0VESVRJTkcnLFxuICAgICAgICAgICAgY2xpY2s6ICdhZGROZXdDb250ZW50KG5ld0NvbnRlbnQsIFwiY29udGVudC5lZGl0LmRldGFpbHNcIiknXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdTQVZFX0FORF9BRERfQU5PVEhFUicsXG4gICAgICAgICAgICBjbGljazogJ2FkZE5ld0NvbnRlbnQobmV3Q29udGVudCwgXCJjb250ZW50LmFkZFwiKSdcbiAgICAgICAgfVxuICAgIF07XG5cbiAgICAvLyBjb250ZW50cyBQT1NUIGFjdGlvblxuICAgICRzY29wZS5hZGROZXdDb250ZW50ID0gZnVuY3Rpb24gYWRkTmV3Q29udGVudChuZXdDb250ZW50LCByZWRpcmVjdCkge1xuICAgICAgICBuZXdDb250ZW50LnBhcmVudElkID0gcGFyZW50SWQ7IC8vIHNldCBwYXJlbnQgY2F0ZWdvcnkgYXMgbnVsbFxuICAgICAgICBuZXdDb250ZW50LnB1Ymxpc2hlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDE5KS5yZXBsYWNlKCdUJywgJyAnKTsgLy8gc2V0IHB1Ymxpc2ggYXQgZGF0ZVxuICAgICAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLmxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBmb3Igcm91dGUgdHJhbnNsYXRpb24gaW4gc2VsZWN0ZWQgbGFuZ3VhZ2VcbiAgICAgICAgICAgIHZhciByb3V0ZSA9IF8ubWFwKF8uZmlsdGVyKCRzY29wZS5saXN0UGFyZW50LnJvdXRlLnRyYW5zbGF0aW9ucywge2xhbmdDb2RlOiBuZXdDb250ZW50LnRyYW5zbGF0aW9ucy5sYW5nQ29kZX0pLCAndXJsJyk7XG4gICAgICAgICAgICBpZiAoIXJvdXRlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG5ld0NvbnRlbnQucGFyZW50SWQgPSBudWxsOyAvLyBpZiBub3QgZm91bmQgc2V0IGFzIHVuY2F0ZWdvcml6ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5uZXdDb250ZW50KG5ld0NvbnRlbnQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gVXRpbHMuJHN0YXRlUGFyYW1zLnR5cGUgPT09ICdjYXRlZ29yeScgPyAnQ0FURUdPUllfQ1JFQVRFRCcgOiAnQ09OVEVOVF9DUkVBVEVEJztcbiAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcyhtZXNzYWdlKTtcbiAgICAgICAgICAgIC8vIHdoZW4gdGhlcmUgaXMgY3VzdG9tIHJlZGlyZWN0XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlZGlyZWN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSAocmVkaXJlY3QgPT09ICdjb250ZW50LmVkaXQuZGV0YWlscycpID8ge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50SWQ6IHJlc3BvbnNlLmlkLFxuICAgICAgICAgICAgICAgICAgICBsYW5nQ29kZTogbmV3Q29udGVudC50cmFuc2xhdGlvbnMubGFuZ0NvZGVcbiAgICAgICAgICAgICAgICB9IDoge3R5cGU6IFV0aWxzLiRzdGF0ZVBhcmFtcy50eXBlfTtcblxuICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbyhyZWRpcmVjdCwgcGFyYW1zLCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChVdGlscy4kc3RhdGVQYXJhbXMudHlwZSA9PT0gJ2NhdGVnb3J5Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIGNyZWF0ZSBhIGNhdGVnb3J5IHRoZW4gc2V0IGl0IGFzIGEgbmV3IGxpc3RQYXJlbnQgb24gY29udGVudCBsaXN0XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbygnY29udGVudC5saXN0Jywge2NvbnRlbnRJZDogcmVzcG9uc2UuaWR9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGdvIHRvIGxpc3Qgd2l0aG91dCBuZXcgbGlzdFBhcmVudFxuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2NvbnRlbnQubGlzdCcsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xufVxuQ29udGVudEFkZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ2xpc3RQYXJlbnQnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudEFkZEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRBZGRUcmFuc2xhdGlvbkN0cmwoJHNjb3BlLCAkdHJhbnNsYXRlLCBVdGlscywgY29udGVudCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAkc2NvcGUuY2tPcHRpb25zID0gVXRpbHMuY2tPcHRpb25zO1xuICAgICRzY29wZS5pc0xvYWRlZCA9IHRydWU7IC8vIGZvcm0gdmlzaWJpbGl0eVxuXG4gICAgLy8gZGVmYXVsdCB0cmFuc2xhdGlvbnMgbGFuZyBjb2RlXG4gICAgJHNjb3BlLm5ld0NvbnRlbnRUcmFuc2xhdGlvbiA9IHtcbiAgICAgICAgY29udGVudElkOiBVdGlscy4kc3RhdGVQYXJhbXMuY29udGVudElkLFxuICAgICAgICBsYW5nQ29kZTogVXRpbHMuJHN0YXRlUGFyYW1zLmxhbmdDb2RlXG4gICAgfTtcblxuICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICBpZiAoY29udGVudC5wYXJlbnRJZCAhPT0gbnVsbCkge1xuICAgICAgICAkc2NvcGUuaXNMb2FkZWQgPSBmYWxzZTsgLy8gaGlkZSBmb3JtXG4gICAgICAgIC8vIGdldCBwYXJlbnQgY2F0ZWdvcnlcbiAgICAgICAgQ29udGVudFJlcG9zaXRvcnkub25lKGNvbnRlbnQucGFyZW50SWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSBDb250ZW50UmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSk7XG4gICAgICAgICAgICAvLyBjaGVjayBmb3Igcm91dGUgdHJhbnNsYXRpb24gaW4gc2VsZWN0ZWQgbGFuZ3VhZ2VcbiAgICAgICAgICAgIHZhciByb3V0ZSA9IF8ubWFwKF8uZmlsdGVyKHBhcmVudC5yb3V0ZS50cmFuc2xhdGlvbnMsIHtsYW5nQ29kZTogJHNjb3BlLm5ld0NvbnRlbnRUcmFuc2xhdGlvbi5sYW5nQ29kZX0pLCAndXJsJyk7XG4gICAgICAgICAgICBpZiAoIXJvdXRlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHVzZXIgdG8gcHJldmlvdXMgc3RhdGUgb3IgY29udGVudCBsaXN0XG4gICAgICAgICAgICAgICAgVXRpbHMucmVkaXJlY3RCYWNrKCdjb250ZW50Lmxpc3QnKTtcbiAgICAgICAgICAgICAgICAvLyBcIkJlZm9yZSBhZGRpbmcgdHJhbnNsYXRpb25zIHRvIHRoaXMgY29udGVudCwgeW91IG5lZWQgdG8gdHJhbnNsYXRlIHRoZSBjYXRlZ29yaWVzIGluIHdoaWNoIGl0IGlzIGxvY2F0ZWQhXCJcbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZEluZm8oJ05PX1BBUkVOVF9UUkFOU0xBVElPTl9FUlJPUicsIHsgY29udGVudFR5cGU6ICR0cmFuc2xhdGUuaW5zdGFudChjb250ZW50LnR5cGUudG9VcHBlckNhc2UoKSkudG9Mb3dlckNhc2UoKSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcGFyZW50IHVybCBpcyB0cmFuc2xhdGVkLCBzaG93IGZvcm1cbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNMb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBjb250ZW50cyBQT1NUIGFjdGlvblxuICAgICRzY29wZS5hZGROZXdDb250ZW50VHJhbnNsYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgQ29udGVudFJlcG9zaXRvcnkubmV3Q29udGVudFRyYW5zbGF0aW9uKFV0aWxzLiRzdGF0ZVBhcmFtcy5jb250ZW50SWQsICRzY29wZS5uZXdDb250ZW50VHJhbnNsYXRpb24pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIFJlZGlyZWN0IHVzZXIgdG8gcHJldmlvdXMgc3RhdGUgb3IgY29udGVudCBsaXN0XG4gICAgICAgICAgICBVdGlscy5yZWRpcmVjdEJhY2soJ2NvbnRlbnQubGlzdCcpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHRyYW5zbGF0ZScsICdVdGlscycsICdjb250ZW50JywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRBZGRUcmFuc2xhdGlvbkN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRCbG9ja3NDdHJsKCRzY29wZSwgVXRpbHMsIGJsb2NrcywgQmxvY2tzUmVwb3NpdG9yeSkge1xuICAgIC8vIGlmIHRoZXJlIGFyZSBibG9ja3MgYXZhaWxhYmxlXG4gICAgaWYgKHR5cGVvZiBibG9ja3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5ibG9ja3MgPSBfLmdyb3VwQnkoQmxvY2tzUmVwb3NpdG9yeS5jbGVhbihibG9ja3MpLCAncmVnaW9uJyk7XG4gICAgfVxuICAgIC8vIHZpc2liaWxpdHkgc2V0dGluZ3NcbiAgICAkc2NvcGUuc2hvd0JvZHkgPSB0cnVlOyAvLyBzaG93IGFsbCBibG9ja3MgYm9keSBieSBkZWZhdWx0XG4gICAgJHNjb3BlLnNob3dSZWdpb24gPSB0cnVlOyAvLyBzaG93IGFsbCByZWdpb25zIGJ5IGRlZmF1bHRcblxufVxuXG5Db250ZW50QmxvY2tzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnYmxvY2tzJywgJ0Jsb2Nrc1JlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudEJsb2Nrc0N0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRDYXRlZ29yeVRyZWVDdHJsKCRzY29wZSwgY2F0ZWdvcmllcywgb3BlbkNhdGVnb3JpZXMsIGxpc3RQYXJlbnQsIFV0aWxzKSB7XG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gcmV0dXJucyByb290IGlkIGZyb20gcHJvdmlkZWQgcGF0aFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhdGggdG8gc2VhcmNoIG92ZXJcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtpbnR9IHJvb3QgaWRcbiAgICAgKiBAdGhyb3dzIEVycm9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Um9vdElkRnJvbVBhdGgocGF0aCkge1xuICAgICAgICBpZiAocGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aFswXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZSBwYXRoIGlzIHRvbyBzaG9ydCEnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHJldHVybnMgc3BlY2lmaWVkIG5vZGUgZm9ybSBwcm92aWRlZCBjb2xsZWN0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29sbGVjdGlvbiB0aGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXJcbiAgICAgKiBAcGFyYW0gaWQgIG5vZGUgaWRcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IHJldHVybnMgdGhlIGZvdW5kIGVsZW1lbnQsIGVsc2UgdW5kZWZpbmVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUJ5SWQoY29sbGVjdGlvbiwgaWQpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZChjb2xsZWN0aW9uLCBmdW5jdGlvbihjYXRlZ29yeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3J5LmlkID09PSBpZDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gaWYgdGhlcmUgYXJlIG9wZW4gY2F0ZWdvcmllcyBpbiB0aGUgVXRpbHMuU3RvcmFnZVxuICAgIGlmICh0eXBlb2Ygb3BlbkNhdGVnb3JpZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllcyA9IG9wZW5DYXRlZ29yaWVzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllcyA9IFtdO1xuICAgIH1cblxuICAgIC8vIGlmIGNhdGVnb3JpZXMgdHJlZSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGNhdGVnb3JpZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5jYXRlZ29yaWVzID0gY2F0ZWdvcmllcztcbiAgICB9XG5cbiAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBsaXN0UGFyZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUuYWN0aXZlTm9kZSA9IGxpc3RQYXJlbnQuaWQ7XG5cbiAgICAgICAgLy8gbWVyZ2Ugb3BlbiBjYXRlZ29yaWVzIHdpdGggYWN0aXZlIGNhdGVnb3J5IHBhdGhcbiAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzID0gXy51bmlvbigkc2NvcGUub3BlbkNhdGVnb3JpZXMsIGxpc3RQYXJlbnQucGF0aCk7XG4gICAgICAgICRzY29wZS5yb290ID0gZ2V0Tm9kZUJ5SWQoJHNjb3BlLmNhdGVnb3JpZXMsIGdldFJvb3RJZEZyb21QYXRoKGxpc3RQYXJlbnQucGF0aCkpO1xuICAgICAgICAvLyBzYXZlIG9wZW4gY2F0ZWdvcmllcyBpbiB0aGUgc3RvcmVcbiAgICAgICAgVXRpbHMuU3RvcmFnZS5zZXRTdG9yYWdlSXRlbSh7b3BlbkNhdGVnb3JpZXM6ICRzY29wZS5vcGVuQ2F0ZWdvcmllc30pO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZXMgbGlzdFBhcmVudCBpZCBmcm9tIFV0aWxzLlN0b3JhZ2VcbiAgICAkc2NvcGUudW5jYXRlZ29yaXplZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBVdGlscy5TdG9yYWdlLnJlbW92ZVN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpO1xuICAgIH07XG5cbiAgICAvLyB0b2dnbGVzIE5vZGUgaW4gY2F0ZWdvcmllcyB0cmVlIGFuZCBtYW5hZ2UgVXRpbHMuU3RvcmFnZSBvcGVuIGNhdGVnb3JpZXMgb2JqZWN0XG4gICAgJHNjb3BlLnRvZ2dsZU5vZGUgPSBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBzY29wZS50b2dnbGUoKTtcbiAgICAgICAgdmFyIG5vZGVJZCA9IF8ucGFyc2VJbnQoc2NvcGUuJGVsZW1lbnRbMF0uaWQsIDEwKTtcbiAgICAgICAgLy8gaWYgbm9kZSBpcyBvcGVuXG4gICAgICAgIGlmICghc2NvcGUuY29sbGFwc2VkKSB7XG4gICAgICAgICAgICAvLyBhZGQgdG8gc2NvcGVcbiAgICAgICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllcy5wdXNoKG5vZGVJZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgZnJvbSBzY29wZVxuICAgICAgICAgICAgJHNjb3BlLm9wZW5DYXRlZ29yaWVzID0gXy53aXRob3V0KCRzY29wZS5vcGVuQ2F0ZWdvcmllcywgbm9kZUlkKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzYXZlIGluIHRoZSBzdG9yZVxuICAgICAgICBVdGlscy5TdG9yYWdlLnNldFN0b3JhZ2VJdGVtKHtvcGVuQ2F0ZWdvcmllczogJHNjb3BlLm9wZW5DYXRlZ29yaWVzfSk7XG4gICAgfTtcblxufVxuQ29udGVudENhdGVnb3J5VHJlZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2NhdGVnb3JpZXMnLCAnb3BlbkNhdGVnb3JpZXMnLCAnbGlzdFBhcmVudCcsICdVdGlscyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50Q2F0ZWdvcnlUcmVlQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudERhc2hib2FyZEN0cmwoJHNjb3BlKSB7XG5cbn1cbkNvbnRlbnREYXNoYm9hcmRDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RGFzaGJvYXJkQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudERldGFpbHNDdHJsKCRzY29wZSwgY29udGVudCwgbGFuZ0NvZGUsIENvbnRlbnRSZXBvc2l0b3J5LCBVdGlscykge1xuXG4gICAgJHNjb3BlLkNvbmZpZyA9IFV0aWxzLkNvbmZpZztcblxuICAgIC8vIFRPRE86IGdldCByZWdpc3RlcmVkIHRhYnNcbiAgICAkc2NvcGUudGFicyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdDT05URU5UJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2RldGFpbHMnLFxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSAvLyBkZWZhdWx0IGFjdGl2ZSB0YWIgaW4gc2V0dGluZ3MgZWRpdCBtb2RlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnSElTVE9SWV9PRl9DSEFOR0VTJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2hpc3RvcnknXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnQkxPQ0tTJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2Jsb2NrcydcbiAgICAgICAgfVxuICAgIF07XG5cbiAgICAvLyBpZiBsYW5nIGNvZGUgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBsYW5nQ29kZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmxhbmdDb2RlID0gbGFuZ0NvZGU7XG4gICAgfVxuXG4gICAgLy8gaWYgY29udGVudCBleGlzdHNcbiAgICBpZiAodHlwZW9mIGNvbnRlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5jb250ZW50ID0gQ29udGVudFJlcG9zaXRvcnkuY2xlYW4oY29udGVudCk7XG4gICAgICAgIC8vIGlmIGNvbnRlbnQgcGFyZW50IGV4aXN0c1xuICAgICAgICBpZiAoY29udGVudC5wYXRoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIC8vIHRoZSBsYXN0IGJ1dCBvbmUgaWQgbnVtYmVyIGZyb20gcGF0aFxuICAgICAgICAgICAgdmFyIHBhcmVudElkID0gXy50YWtlUmlnaHQoY29udGVudC5wYXRoLCAyKVswXTtcbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5Lm9uZShwYXJlbnRJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5jb250ZW50UGFyZW50ID0gQ29udGVudFJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAkc2NvcGUuc2F2ZUNvbnRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgQ29udGVudFJlcG9zaXRvcnlcbiAgICAgICAgICAgIC51cGRhdGVDb250ZW50KCRzY29wZS5jb250ZW50LmlkLCAkc2NvcGUuY29udGVudClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnVEhFX0NIQU5HRVNfSEFWRV9CRUVOX1NBVkVEJyk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG59XG5Db250ZW50RGV0YWlsc0N0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2NvbnRlbnQnLCAnbGFuZ0NvZGUnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnVXRpbHMnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudERldGFpbHNDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIENvbnRlbnREZXRhaWxzRWRpdEN0cmxcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGV0YWlsc0VkaXRDdHJsKCRzY29wZSwgVXRpbHMsIGNvbnRlbnQsIGxhbmdDb2RlLCBDb250ZW50UmVwb3NpdG9yeSkgeyAvL2pzaGludCBpZ25vcmU6bGluZVxuXG4gICAgLyoqXG4gICAgICogQ0tFZGl0b3Igc2V0dGluZ3MgZ2V0dGVyXG4gICAgICovXG4gICAgJHNjb3BlLmNrT3B0aW9ucyA9IFV0aWxzLmNrT3B0aW9ucztcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXJyZW50bHkgYWN0aXZlIHRyYW5zbGF0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogQHR5cGUgT2JqZWN0XG4gICAgICovXG4gICAgJHNjb3BlLmFjdGl2ZVRyYW5zbGF0aW9uID0gVXRpbHMuZ2V0VHJhbnNsYXRpb25CeUxhbmcoKGNvbnRlbnQudHJhbnNsYXRpb25zLnNsaWNlKDApKSwgbGFuZ0NvZGUpO1xuXG4gICAgLyoqXG4gICAgICogc2F2ZSBjdXJyZW50IGFjdGl2ZSB0cmFuc2xhdGlvbiBhcyBuZXcgYWN0aXZlIHRyYW5zbGF0aW9uXG4gICAgICogYW5kIGdvIGJhY2sgdG8gZGV0YWlscyBzaG93IHN0YXRlXG4gICAgICovXG4gICAgJHNjb3BlLnNhdmVUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5uZXdDb250ZW50VHJhbnNsYXRpb24oY29udGVudC5pZCwgJHNjb3BlLmFjdGl2ZVRyYW5zbGF0aW9uKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50LnNob3cuZGV0YWlscycsIHtcbiAgICAgICAgICAgICAgICBjb250ZW50SWQ6IGNvbnRlbnQuaWQsXG4gICAgICAgICAgICAgICAgbGFuZ0NvZGU6IGxhbmdDb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnVEhFX0NIQU5HRVNfSEFWRV9CRUVOX1NBVkVEJyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbn1cbkNvbnRlbnREZXRhaWxzRWRpdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ2NvbnRlbnQnLCAnbGFuZ0NvZGUnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudERldGFpbHNFZGl0Q3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBDb250ZW50SGlzdG9yeUN0cmxcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50SGlzdG9yeUN0cmwoJHNjb3BlLCBVdGlscywgY29udGVudCwgbGFuZ0NvZGUsIENvbnRlbnRSZXBvc2l0b3J5LCBOZ1RhYmxlUGFyYW1zKSB7IC8vanNoaW50IGlnbm9yZTpsaW5lXG4gICAgJHNjb3BlLnRhYmxlUGFyYW1zID0gbmV3IE5nVGFibGVQYXJhbXMoe1xuICAgICAgICBjb3VudDogMjUsIC8vIGNvdW50IHBlciBwYWdlXG4gICAgICAgIHNvcnRpbmc6IHtcbiAgICAgICAgICAgICdjcmVhdGVkQXQnOiAnZGVzYycgLy8gaW5pdGlhbCBzb3J0aW5nXG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIHRvdGFsOiAwLCAvLyBsZW5ndGggb2YgZGF0YVxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigkZGVmZXIsIHBhcmFtcykge1xuICAgICAgICAgICAgLy8gcHJlcGFyZSBvcHRpb25zIHRvIGJlIHNlbnQgdG8gYXBpXG4gICAgICAgICAgICB2YXIgcXVlcnlPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGxhbmdDb2RlOiBsYW5nQ29kZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gcGFyYW1zLmNvdW50KCkgLSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgZGVjbGFyZWQgaW4gdmlld1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuY291bnQoVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wZXJQYWdlID0gcGFyYW1zLmNvdW50KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5wYWdlKCkgLSBjdXJyZW50IHBhZ2VcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnBhZ2UoVXRpbHMuJHN0YXRlUGFyYW1zLnBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wYWdlID0gcGFyYW1zLnBhZ2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGFibGVQYXJhbXMub3JkZXJCeSgpIC0gYW4gYXJyYXkgb2Ygc3RyaW5nIGluZGljYXRpbmcgYm90aCB0aGUgc29ydGluZyBjb2x1bW4gYW5kIGRpcmVjdGlvbiAoZS5nLiBbXCIrbmFtZVwiLCBcIi1lbWFpbFwiXSlcbiAgICAgICAgICAgIGlmIChwYXJhbXMuc29ydGluZygpKSB7XG4gICAgICAgICAgICAgICAgLy8gb25seSBpbnRlcmVzdGVkIGluIGZpcnN0IHNvcnQgY29sdW1uIGZvciBub3dcbiAgICAgICAgICAgICAgICB2YXIgb3JkZXJCeSA9IHBhcmFtcy5vcmRlckJ5KClbMF07XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnNvcnQgPSBvcmRlckJ5WzBdID09PSAnKycgPyBvcmRlckJ5LnN1YnN0cmluZygxKSA6IG9yZGVyQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGdldCBsaXN0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkudHJhbnNsYXRpb25zKGNvbnRlbnQuaWQsIHF1ZXJ5T3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIENvbnRlbnRzIGlzIGEgUkVTVCBBbmd1bGFySlMgc2VydmljZSB0aGF0IHRhbGtzIHRvIGFwaSBhbmQgcmV0dXJuIHByb21pc2VcbiAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy50b3RhbChyZXNwb25zZS5tZXRhLnRvdGFsKTtcbiAgICAgICAgICAgICAgICAkZGVmZXIucmVzb2x2ZShDb250ZW50UmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5tZXRhID0gcmVzcG9uc2UubWV0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbkNvbnRlbnRIaXN0b3J5Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnY29udGVudCcsICdsYW5nQ29kZScsICdDb250ZW50UmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRIaXN0b3J5Q3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudExpc3RDdHJsKCRzY29wZSwgVXRpbHMsIGxpc3RQYXJlbnQsIENvbnRlbnRSZXBvc2l0b3J5LCBOZ1RhYmxlUGFyYW1zKSB7XG4gICAgLy8gaWYgcGFyZW50IGNhdGVnb3J5IGV4aXN0c1xuICAgIGlmICh0eXBlb2YgbGlzdFBhcmVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmxpc3RQYXJlbnQgPSBsaXN0UGFyZW50OyAvLyBzZWxlY3RlZCBjYXRlZ29yeVxuICAgIH1cblxuICAgIC8vIFRPRE86IGNvbnRlbnQgYWRkIGJ1dHRvbiBsaW5rc1xuICAgICRzY29wZS5jb250ZW50QWRkQnV0dG9uTGlua3MgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdBRERfQ09OVEVOVCcsXG4gICAgICAgICAgICBocmVmOiAnY29udGVudC5hZGQoeyB0eXBlOiBcImNvbnRlbnRcIiB9KScsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtZmlsZS10ZXh0LW8nXG5cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ0FERF9DQVRFR09SWScsXG4gICAgICAgICAgICBocmVmOiAnY29udGVudC5hZGQoeyB0eXBlOiBcImNhdGVnb3J5XCIgfSknLFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWZvbGRlci1vJ1xuICAgICAgICB9XG4gICAgXTtcblxuICAgIC8vIFRPRE86IGNvbnRlbnQgbGlzdCBhY3Rpb25zXG4gICAgJHNjb3BlLmNvbnRlbnRMaXN0QWN0aW9ucyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ1ZJRVcnLFxuICAgICAgICAgICAgdXJsOiAncHVibGljVXJsJywgLy8gdGhpcyB3aWxsIGJlIHJlcGxhY2VkIHdpdGggY29udGVudCBwdWJsaWMgdXJsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtc2VhcmNoJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiAnRURJVCcsXG4gICAgICAgICAgICBocmVmOiAnY29udGVudC5zaG93KHsgY29udGVudElkOiByZWNvcmRfaWQsIGxhbmdDb2RlOiBsYW5nX2NvZGUgfSknLFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLXBlbmNpbCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ01PVkVfVE9fVFJBU0gnLFxuICAgICAgICAgICAgY2xpY2s6ICdkZWxldGUnLCAvLyB0aGlzIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCBkZWxldGUgYWN0aW9uXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtdGltZXMnXG4gICAgICAgIH1cbiAgICBdO1xuXG4gICAgLy8gQmluZCBob3RrZXlzXG4gICAgVXRpbHMuaG90a2V5cy5hZGQoe1xuICAgICAgICBjb21ibzogJ2N0cmwrYWx0K24nLFxuICAgICAgICBkZXNjcmlwdGlvbjogVXRpbHMuJGZpbHRlcigndHJhbnNsYXRlJykoJ0FERF9DT05URU5UJyksXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50LmFkZCcsIHt0eXBlOiAnY29udGVudCd9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgVXRpbHMuaG90a2V5cy5hZGQoe1xuICAgICAgICBjb21ibzogJ2N0cmwrYWx0K20nLFxuICAgICAgICBkZXNjcmlwdGlvbjogVXRpbHMuJGZpbHRlcigndHJhbnNsYXRlJykoJ0FERF9DQVRFR09SWScpLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbygnY29udGVudC5hZGQnLCB7dHlwZTogJ2NhdGVnb3J5J30pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyAgbmdUYWJsZSBjb25maWd1cmF0aW9uXG4gICAgJHNjb3BlLnRhYmxlUGFyYW1zID0gbmV3IE5nVGFibGVQYXJhbXMoe1xuICAgICAgICBjb3VudDogMjUsIC8vIGNvdW50IHBlciBwYWdlXG4gICAgICAgIHNvcnRpbmc6IHtcbiAgICAgICAgICAgICd0cmFuc2xhdGlvbnMudGl0bGUnOiAnYXNjJyAvLyBpbml0aWFsIHNvcnRpbmdcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAgdG90YWw6IDAsIC8vIGxlbmd0aCBvZiBkYXRhXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCRkZWZlciwgcGFyYW1zKSB7XG4gICAgICAgICAgICAkc2NvcGUucmVxdWVzdFBlbmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgLy8gcHJlcGFyZSBvcHRpb25zIHRvIGJlIHNlbnQgdG8gYXBpXG4gICAgICAgICAgICB2YXIgcXVlcnlPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGxhbmc6ICRzY29wZS50cmFuc0xhbmcuY29kZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnY29udGVudCdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVdGlscy4kc3RhdGVQYXJhbXMgLSBmaWx0ZXJzIHdpdGhvdXQgY29udGVudElkXG4gICAgICAgICAgICB2YXIgZmlsdGVycyA9IF8ub21pdChVdGlscy4kc3RhdGVQYXJhbXMsICdjb250ZW50SWQnKTtcbiAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucyA9IF8ubWVyZ2UocXVlcnlPcHRpb25zLCBmaWx0ZXJzKTtcbiAgICAgICAgICAgICRzY29wZS5hY3RpdmVGaWx0ZXIgPSBmaWx0ZXJzO1xuXG4gICAgICAgICAgICAvLyBsaXN0IHByb21pc2VcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0ge307XG5cbiAgICAgICAgICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBpcyBub3Qgc2VsZWN0ZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGlzdFBhcmVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgdW5jYXRlZ29yaXplZFxuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5sZXZlbCA9IDA7XG4gICAgICAgICAgICAgICAgcHJvbWlzZSA9IENvbnRlbnRSZXBvc2l0b3J5Lmxpc3QocXVlcnlPcHRpb25zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IGNoaWxkcmVuJ3NcbiAgICAgICAgICAgICAgICBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkuY2hpbGRyZW4obGlzdFBhcmVudC5pZCwgcXVlcnlPcHRpb25zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUHJvbWlzZSBpcyBhIFJFU1QgQW5ndWxhckpTIHNlcnZpY2UgdGhhdCB0YWxrcyB0byBhcGkgYW5kIHJldHVybiBwcm9taXNlXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVxdWVzdFBlbmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwYXJhbXMudG90YWwocmVzcG9uc2UubWV0YS50b3RhbCk7XG4gICAgICAgICAgICAgICAgJGRlZmVyLnJlc29sdmUoQ29udGVudFJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuQ29udGVudExpc3RDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdsaXN0UGFyZW50JywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgJ25nVGFibGVQYXJhbXMnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudExpc3RDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFRyYXNoY2FuQ3RybCgkc2NvcGUsIENvbnRlbnRSZXBvc2l0b3J5LCBOZ1RhYmxlUGFyYW1zLCBVdGlscykge1xuICAgICRzY29wZS50YWJsZVBhcmFtcyA9IG5ldyBOZ1RhYmxlUGFyYW1zKHtcbiAgICAgICAgY291bnQ6IDI1LCAvLyBjb3VudCBwZXIgcGFnZVxuICAgICAgICBzb3J0aW5nOiB7XG4gICAgICAgICAgICAnaWQnOiAnZGVzYycgLy8gaW5pdGlhbCBzb3J0aW5nXG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIHRvdGFsOiAwLCAvLyBsZW5ndGggb2YgZGF0YVxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigkZGVmZXIsIHBhcmFtcykge1xuICAgICAgICAgICAgJHNjb3BlLnJlcXVlc3RQZW5kaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBsYW5nOiAkc2NvcGUudHJhbnNMYW5nLmNvZGVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVdGlscy4kc3RhdGVQYXJhbXMgZmlsdGVyc1xuICAgICAgICAgICAgcXVlcnlPcHRpb25zID0gXy5tZXJnZShxdWVyeU9wdGlvbnMsIFV0aWxzLiRzdGF0ZVBhcmFtcyk7XG4gICAgICAgICAgICAkc2NvcGUuYWN0aXZlRmlsdGVyID0gVXRpbHMuJHN0YXRlUGFyYW1zO1xuXG4gICAgICAgICAgICAvLyBnZXQgbGlzdCBieSBkZWZhdWx0XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IENvbnRlbnRSZXBvc2l0b3J5LmRlbGV0ZWQocXVlcnlPcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gQ29udGVudHMgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlcXVlc3RQZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKENvbnRlbnRSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuQ29udGVudFRyYXNoY2FuQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnbmdUYWJsZVBhcmFtcycsICdVdGlscyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50VHJhc2hjYW5DdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RGVsZXRlQ3RybCgkc2NvcGUsIFV0aWxzLCAkbW9kYWwsIENvbnRlbnRSZXBvc2l0b3J5KSB7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIERlbGV0ZSBtb2RhbFxuICAgIHZtLmRlbGV0ZU1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZXMgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2NvbnRlbnREZWxldGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRJZCBjb250ZW50IGlkIHRvIGJlIHJlbW92ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKiBAcGFyYW0gY29udGVudFR5cGUgY29udGVudCB0eXBlXG4gICAgICAgICAqIEBwYXJhbSBmb3JjZURlbGV0ZSB1c2UgZm9yY2VEZWxldGVcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oY29udGVudElkLCBjb250ZW50VHlwZSwgZm9yY2VEZWxldGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHZtLmNvbnRlbnRUeXBlID0gY29udGVudFR5cGU7XG4gICAgICAgICAgICB2bS5mb3JjZURlbGV0ZSA9IGZvcmNlRGVsZXRlO1xuICAgICAgICAgICAgaWYgKHZtLmZvcmNlRGVsZXRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ0RFTEVURV9DT05URU5UX1FVRVNUSU9OJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdNT1ZFX0NPTlRFTlRfVE9fVFJBU0hfUVVFU1RJT04nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQmluZCBob3RrZXlzXG4gICAgICAgICAgICBVdGlscy5ob3RrZXlzLmFkZCh7XG4gICAgICAgICAgICAgICAgY29tYm86ICdlbnRlcicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFV0aWxzLiRmaWx0ZXIoJ3RyYW5zbGF0ZScpKFxuICAgICAgICAgICAgICAgICAgICB2bS5mb3JjZURlbGV0ZSA/ICdDT05GSVJNX0RFTEVURScgOiAnQ09ORklSTV9NT1ZFX1RPX1RSQVNIJ1xuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZGVsZXRlQ29udGVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIFV0aWxzLmhvdGtleXMuZGVsKCdlbnRlcicpO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgY29udGVudCBpZCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgZGVsZXRlQ29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5kZWxldGVDb250ZW50KHZtLmNvbnRlbnRJZCwgdm0uZm9yY2VEZWxldGUpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgLy8gcmVmcmVzaCBjdXJyZW50IHN0YXRlXG4gICAgICAgICAgICAgICAgaWYgKHZtLmNvbnRlbnRUeXBlID09PSAnY2F0ZWdvcnknKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZWQgY2F0ZWdvcnlcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuU3RvcmFnZS5yZW1vdmVTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50Lmxpc3QnLCB7Y29udGVudElkOiBudWxsfSwge3JlbG9hZDogdHJ1ZSwgaW5oZXJpdDogZmFsc2V9KTtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdDQVRFR09SWV9IQVNfQkVFTl9ERUxFVEVEJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlZCBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIGlmIChVdGlscy4kc3RhdGUuJGN1cnJlbnQubmFtZSA9PT0gJ2NvbnRlbnQuc2hvdy5kZXRhaWxzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50LnRyYXNoY2FuJywge2NvbnRlbnRJZDogbnVsbH0sIHtyZWxvYWQ6IHRydWUsIGluaGVyaXQ6IGZhbHNlfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKFxuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZm9yY2VEZWxldGUgPyAnQ09OVEVOVF9IQVNfQkVFTl9ERUxFVEVEJyA6ICdDT05URU5UX0hBU19CRUVOX01PVkVEX1RPX1RSQVNIJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxufVxuQ29udGVudERlbGV0ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJyRtb2RhbCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RGVsZXRlQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBDb250ZW50UHVibGlzaGVkQXRFZGl0Q3RybFxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRQdWJsaXNoZWRBdEVkaXRDdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvJztcbiAgICAvLyBSb3V0ZSBtb2RhbFxuICAgIHZtLmVkaXRNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdjb250ZW50RWRpdFB1Ymxpc2hlZEF0TW9kYWwudHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIHNob3c6IHRydWUsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnY2VudGVyJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50SWQgY29udGVudCBpZCB0byBiZSB1cGRhdGVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRQdWJsaXNoZWRBdCBjb250ZW50IHB1Ymxpc2hlZCBhdCBkYXRlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKGNvbnRlbnRJZCwgY29udGVudFB1Ymxpc2hlZEF0KSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICB2bS5jb250ZW50UHVibGlzaGVkQXQgPSBjb250ZW50UHVibGlzaGVkQXQ7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnRURJVCcpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIGN1c3RvbVBVVCBmdW5jdGlvbiBmb3IgY29udGVudCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZUNvbnRlbnRQdWJsaXNoZWRBdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgZGF0ZVRpbWUgPSBtb21lbnQoJHNjb3BlLnZtLmNvbnRlbnRQdWJsaXNoZWRBdCkuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzJyk7XG4gICAgICAgICAgICB2YXIgY29udGVudCA9IHtcbiAgICAgICAgICAgICAgICBwdWJsaXNoZWRBdDogZGF0ZVRpbWVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5LnVwZGF0ZUNvbnRlbnQodm0uY29udGVudElkLCBjb250ZW50KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKFV0aWxzLiRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgIH07XG59XG5Db250ZW50UHVibGlzaGVkQXRFZGl0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRQdWJsaXNoZWRBdEVkaXRDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50UmVzdG9yZUN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIFJlc3RvcmUgbW9kYWxcbiAgICB2bS5yZXN0b3JlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY29udGVudFJlc3RvcmVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRJZCBjb250ZW50IGlkIHRvIGJlIHJlc3RvcmVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oY29udGVudElkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnUkVTVE9SRV9DT05URU5UX1FVRVNUSU9OJyk7XG5cbiAgICAgICAgICAgIC8vIEJpbmQgaG90a2V5c1xuICAgICAgICAgICAgVXRpbHMuaG90a2V5cy5hZGQoe1xuICAgICAgICAgICAgICAgIGNvbWJvOiAnZW50ZXInLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBVdGlscy4kZmlsdGVyKCd0cmFuc2xhdGUnKSgnQ09ORklSTV9DT05URU5UX1JFU1RPUkUnKSxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVzdG9yZUNvbnRlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgICAgIFV0aWxzLmhvdGtleXMuZGVsKCdlbnRlcicpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcmVzdG9yZSBzb2Z0RGVsZXRlZCBjb250ZW50XG4gICAgICAgICAqIEBwYXJhbSBlZGl0QWZ0ZXJSZXN0b3JlIGlmIHRydWUgcmVkaXJlY3QgdG8gZWRpdCBzdGF0ZSBhZnRlciByZXN0b3JlXG4gICAgICAgICAqL1xuICAgICAgICByZXN0b3JlQ29udGVudDogZnVuY3Rpb24oZWRpdEFmdGVyUmVzdG9yZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkucmVzdG9yZUNvbnRlbnQodm0uY29udGVudElkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRBZnRlclJlc3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50LmVkaXQuZGV0YWlscycsIHtjb250ZW50SWQ6IHZtLmNvbnRlbnRJZCwgbGFuZ0NvZGU6ICRzY29wZS5jdXJyZW50TGFuZy5jb2RlfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKFV0aWxzLiRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ0NPTlRFTlRfSEFTX0JFRU5fUkVTVE9SRUQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cbkNvbnRlbnRSZXN0b3JlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgJ05vdGlmaWNhdGlvbnMnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFJlc3RvcmVDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50Um91dGVDdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvJztcbiAgICAvLyBSb3V0ZSBtb2RhbFxuICAgIHZtLmVkaXRSb3V0ZU1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2NvbnRlbnRFZGl0Um91dGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRJZCBjb250ZW50IGlkIHRvIGJlIHJlbW92ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKiBAcGFyYW0gY29udGVudFJvdXRlIGNvbnRlbnQgcm91dGVcbiAgICAgICAgICogQHBhcmFtIGxhbmdDb2RlIHJvdXRlIHRyYW5zbGF0aW9uIGxhbmd1YWdlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKGNvbnRlbnRJZCwgY29udGVudFJvdXRlLCBsYW5nQ29kZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0uY29udGVudElkID0gY29udGVudElkO1xuICAgICAgICAgICAgdm0uY29udGVudFJvdXRlID0gY29udGVudFJvdXRlLnN1YnN0cihjb250ZW50Um91dGUubGFzdEluZGV4T2YoJy8nKSArIDEpOyAvLyBsYXN0IHVybCBzZWdtZW50XG4gICAgICAgICAgICB2bS5vbGRSb3V0ZSA9IHZtLmNvbnRlbnRSb3V0ZTtcbiAgICAgICAgICAgIHZtLmxhbmdDb2RlID0gbGFuZ0NvZGU7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnRURJVCcpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIERFTEVURSBhY3Rpb24gZm9yIGNvbnRlbnQgaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIHNhdmVDb250ZW50Um91dGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIG5ld1JvdXRlID0ge1xuICAgICAgICAgICAgICAgIGxhbmdDb2RlOiB2bS5sYW5nQ29kZSxcbiAgICAgICAgICAgICAgICB1cmw6IHZtLmNvbnRlbnRSb3V0ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIG9ubHkgd2hlbiByb3V0ZSBoYXMgYmVlbiBjaGFuZ2VkXG4gICAgICAgICAgICBpZiAodm0uY29udGVudFJvdXRlICE9PSB2bS5vbGRSb3V0ZSkge1xuICAgICAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5Lm5ld0NvbnRlbnRSb3V0ZSh2bS5jb250ZW50SWQsIG5ld1JvdXRlKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn1cbkNvbnRlbnRSb3V0ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJyRtb2RhbCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50Um91dGVDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50VGhlbWVFZGl0Q3RybCgkc2NvcGUsIFV0aWxzLCAkbW9kYWwsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC9kaXJlY3RpdmVzLyc7XG4gICAgLy8gVGhlbWUgbW9kYWxcbiAgICB2bS5lZGl0TW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY29udGVudEVkaXRUaGVtZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWQgdG8gYmUgdXBkYXRlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50VGhlbWUgY29udGVudCB0aGVtZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihjb250ZW50SWQsIGNvbnRlbnRUaGVtZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0uY29udGVudElkID0gY29udGVudElkO1xuICAgICAgICAgICAgdm0uY29udGVudFRoZW1lID0gY29udGVudFRoZW1lO1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ0VESVQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBjdXN0b21QVVQgZnVuY3Rpb24gZm9yIGNvbnRlbnQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIHNhdmVDb250ZW50V2VpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhciBjb250ZW50ID0ge1xuICAgICAgICAgICAgICAgIHRoZW1lOiAkc2NvcGUudm0uY29udGVudFRoZW1lXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS51cGRhdGVDb250ZW50KHZtLmNvbnRlbnRJZCwgY29udGVudCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbyhVdGlscy4kc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICB9O1xufVxuQ29udGVudFRoZW1lRWRpdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJyRtb2RhbCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50VGhlbWVFZGl0Q3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBDb250ZW50VG9nZ2xlUHJvcGVydHlDdHJsXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFRvZ2dsZVByb3BlcnR5Q3RybChVdGlscywgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuXG4gICAgdm0udG9nZ2xlUHJvcGVydHkgPSB7XG5cbiAgICAgICAgdG9nZ2xlUHJvcGVydHk6IGZ1bmN0aW9uKGNvbnRlbnRJZCwgcHJvcGVydHlOYW1lLCBjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBuZXdWYWx1ZSA9ICFjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICB2YXIgY29udGVudCA9IHt9O1xuICAgICAgICAgICAgY29udGVudFtwcm9wZXJ0eU5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS51cGRhdGVDb250ZW50KGNvbnRlbnRJZCwgY29udGVudCkudGhlbihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbn1cbkNvbnRlbnRUb2dnbGVQcm9wZXJ0eUN0cmwuJGluamVjdCA9IFsnVXRpbHMnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFRvZ2dsZVByb3BlcnR5Q3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFdlaWdodEVkaXRDdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvJztcbiAgICAvLyBXZWlnaHQgbW9kYWxcbiAgICB2bS5lZGl0TW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY29udGVudEVkaXRXZWlnaHRNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRJZCBjb250ZW50IGlkIHRvIGJlIHVwZGF0ZWQsIGl0IGlzIHNhdmVkIGluIHRoZSBzY29wZVxuICAgICAgICAgKiBAcGFyYW0gY29udGVudFdlaWdodCBjb250ZW50IHdlaWdodFxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihjb250ZW50SWQsIGNvbnRlbnRXZWlnaHQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHZtLmNvbnRlbnRXZWlnaHQgPSBjb250ZW50V2VpZ2h0O1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ0VESVQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBjdXN0b21QVVQgZnVuY3Rpb24gZm9yIGNvbnRlbnQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIHNhdmVDb250ZW50V2VpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhciBjb250ZW50ID0ge1xuICAgICAgICAgICAgICAgIHdlaWdodDogJHNjb3BlLnZtLmNvbnRlbnRXZWlnaHRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5LnVwZGF0ZUNvbnRlbnQodm0uY29udGVudElkLCBjb250ZW50KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKFV0aWxzLiRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgIH07XG59XG5Db250ZW50V2VpZ2h0RWRpdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJyRtb2RhbCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50V2VpZ2h0RWRpdEN0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZVxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvJztcbiAgICAvLyBTZXQgYXMgYWN0aXZlIG1vZGFsXG4gICAgdm0uc2V0QXNBY3RpdmVNb2RhbCA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIHRyYW5zbGF0aW9uIHdpdGggc3BlY2lmaWVkIGlkIHByb3BlcnR5IGZyb20gdHJhbnNsYXRpb25zIGFycmF5XG4gICAgICAgICAqIGFuZCBmZXRjaCBsYW5nIHByb3BlcnR5XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0cmFuc2xhdGlvbnMgVHJhbnNsYXRpb25zIGFycmF5XG4gICAgICAgICAqIEBwYXJhbSBpZCB0cmFuc2xhdGlvbiBpZFxuICAgICAgICAgKiBAcmV0dXJucyBPYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGdldFRyYW5zbGF0aW9uQnlJZDogZnVuY3Rpb24odHJhbnNsYXRpb25zLCBpZCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAocGFyc2VJbnQodHJhbnNsYXRpb24uaWQpID09PSBwYXJzZUludChpZCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNsYXRpb247XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmdldFRyYW5zbGF0aW9uQnlJZCh0cmFuc2xhdGlvbnMsIGlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZXMgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3NldFRyYW5zbGF0aW9uQXNBY3RpdmVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25JZCBpZCBvZiBzZWxlY3RlZCB0cmFuc2xhdGlvblxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGN1cnJlbnQgYWN0aXZlIGNvbnRlbnQgaWRcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24odHJhbnNsYXRpb25JZCwgY29udGVudElkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICB2bS50cmFuc2xhdGlvbnMgPSAkc2NvcGUudGFibGVQYXJhbXMuZGF0YS5zbGljZSgwKTtcbiAgICAgICAgICAgIHZtLnRyYW5zbGF0aW9uSWQgPSB0cmFuc2xhdGlvbklkO1xuICAgICAgICAgICAgdm0uc2VsZWN0ZWRUcmFuc2xhdGlvbiA9IHNlbGYuZ2V0VHJhbnNsYXRpb25CeUlkKHZtLnRyYW5zbGF0aW9ucywgdm0udHJhbnNsYXRpb25JZCk7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnU0VUX1RSQU5TTEFUSU9OX0FTX0FDVElWRV9RVUVTVElPTicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHBlcmZvcm1zIHRoZSBSZXN0QW5ndWxhciBhY3Rpb24gYW5kIHNldCBzZWxlY3RlZCB0cmFuc2xhdGlvblxuICAgICAgICAgKiBhcyBhIG5ldyBhY3RpdmUgdHJhbnNsYXRpb25cbiAgICAgICAgICovXG4gICAgICAgIHNldEFzQWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5Lm5ld0NvbnRlbnRUcmFuc2xhdGlvbih2bS5jb250ZW50SWQsIHZtLnNlbGVjdGVkVHJhbnNsYXRpb24pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5TZXRUcmFuc2xhdGlvbkFzQWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IFNldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIERlbGV0ZVRyYW5zbGF0aW9uQ3RybFxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIERlbGV0ZVRyYW5zbGF0aW9uQ3RybCgkc2NvcGUsIFV0aWxzLCAkbW9kYWwsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC9kaXJlY3RpdmVzLyc7XG4gICAgLy8gRGVsZXRlIG1vZGFsXG4gICAgdm0uZGVsZXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAndHJhbnNsYXRpb25EZWxldGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWRcbiAgICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9uSWQgdHJhbnNsYXRpb24gaWRcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oY29udGVudElkLCB0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICB2bS50cmFuc2xhdGlvbklkID0gdHJhbnNsYXRpb25JZDtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdERUxFVEVfVFJBTlNMQVRJT05fUVVFU1RJT04nKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgdHJhbnNsYXRpb24gaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGRlbGV0ZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5kZWxldGVUcmFuc2xhdGlvbih2bS5jb250ZW50SWQsIHZtLnRyYW5zbGF0aW9uSWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUUkFOU0xBVElPTl9IQVNfQkVFTl9ERUxFVEVEJyk7XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLnJlbG9hZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuRGVsZXRlVHJhbnNsYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICckbW9kYWwnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gRGVsZXRlVHJhbnNsYXRpb25DdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDaGFyYWN0ZXJzQ291bnRlcigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZW1wbGF0ZVVybDogJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy9jaGFyYWN0ZXJzQ291bnRlci50cGwuaHRtbCcsXG5cdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRzY29wZToge1xuXHRcdFx0J2NoYXJhY3RlcnMnOiAnQGNvdW50J1xuXHRcdH1cblx0fTtcbn1cblxuQ2hhcmFjdGVyc0NvdW50ZXIuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDaGFyYWN0ZXJzQ291bnRlcjsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRBY3Rpb25zRHJvcGRvd24oJGRyb3Bkb3duKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHtjb250ZW50QWN0aW9uc0Ryb3Bkb3duOiAnPScsIHJlY29yZDogJz0nLCBsYW5nOiAnPSd9LFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQ29udGVudERlbGV0ZUN0cmwpIHtcbiAgICAgICAgICAgIHZhciBkcm9wZG93biA9ICRkcm9wZG93bihlbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvY29udGVudEFjdGlvbnNEcm9wZG93bi50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uOiAnYW0tZmxpcC14JyxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdib3R0b20tcmlnaHQnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGJldHRlciBwYXJhbXMgcmVwbGFjZW1lbnQgYW5kIGZ1bmN0aW9ucyBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIF8ubWFwVmFsdWVzKHNjb3BlLmNvbnRlbnRBY3Rpb25zRHJvcGRvd24sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBuLmhyZWYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmQgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuLmhyZWYuaW5kZXhPZigncmVjb3JkX2lkJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbi5ocmVmID0gbi5ocmVmLnJlcGxhY2UoJ3JlY29yZF9pZCcsIHNjb3BlLnJlY29yZC5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBMYW5nIGNvZGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuLmhyZWYuaW5kZXhPZignbGFuZ19jb2RlJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbi5ocmVmID0gbi5ocmVmLnJlcGxhY2UoJ2xhbmdfY29kZScsICdcIicgKyBzY29wZS5sYW5nLmNvZGUgKyAnXCInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS5jb250ZW50ID0gc2NvcGUuY29udGVudEFjdGlvbnNEcm9wZG93bjtcbiAgICAgICAgICAgICAgICBkcm9wZG93bi4kc2NvcGUucmVjb3JkID0gc2NvcGUucmVjb3JkOyAvLyBQYXNzIHJlY29yZCB0byB0aGUgdmlld1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS5sYW5nID0gc2NvcGUubGFuZzsgLy8gUGFzcyBsYW5nIHRvIHRoZSB2aWV3XG4gICAgICAgICAgICAgICAgZHJvcGRvd24uJHNjb3BlLmRlbGV0ZU1vZGFsID0gQ29udGVudERlbGV0ZUN0cmwuZGVsZXRlTW9kYWw7IC8vIFBhc3MgZGVsZXRlIGFjdGlvbiB0byB0aGUgdmlld1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50QWN0aW9uc0Ryb3Bkb3duLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudEFjdGlvbnNEcm9wZG93bjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudERlbGV0ZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnREZWxldGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLC8vIGJlY2F1c2UgdGhlIHNjb3BlIGlzIGlzb2xhdGVkXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQ29udGVudERlbGV0ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIENvbnRlbnREZWxldGVDdHJsLmRlbGV0ZU1vZGFsLnNob3dNb2RhbChhdHRycy5pZCwgYXR0cnMudHlwZSwgYXR0cnMuZm9yY2UgPT09ICd0cnVlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnREZWxldGVCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RGVsZXRlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RWRpdFJvdXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudFJvdXRlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIENvbnRlbnRSb3V0ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIENvbnRlbnRSb3V0ZUN0cmwuZWRpdFJvdXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmlkLCBhdHRycy5yb3V0ZSwgYXR0cnMubGFuZyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnRFZGl0Um91dGVCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RWRpdFJvdXRlQnV0dG9uO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIENvbnRlbnRQdWJsaXNoZWRBdEVkaXRCdXR0b25cbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50UHVibGlzaGVkQXRFZGl0QnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudFB1Ymxpc2hlZEF0RWRpdEN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQ29udGVudFB1Ymxpc2hlZEF0RWRpdEN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgQ29udGVudFB1Ymxpc2hlZEF0RWRpdEN0cmwuZWRpdE1vZGFsLnNob3dNb2RhbChcbiAgICAgICAgICAgICAgICAgICAgYXR0cnMuY29udGVudElkLFxuICAgICAgICAgICAgICAgICAgICBhdHRycy5jb250ZW50UHVibGlzaGVkQXRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50UHVibGlzaGVkQXRFZGl0QnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFB1Ymxpc2hlZEF0RWRpdEJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFJlc3RvcmVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50UmVzdG9yZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsLy8gYmVjYXVzZSB0aGUgc2NvcGUgaXMgaXNvbGF0ZWRcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBDb250ZW50UmVzdG9yZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIENvbnRlbnRSZXN0b3JlQ3RybC5yZXN0b3JlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmlkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudFJlc3RvcmVCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50UmVzdG9yZUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFRoZW1lRWRpdEJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRUaGVtZUVkaXRDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIENvbnRlbnRUaGVtZUVkaXRDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIENvbnRlbnRUaGVtZUVkaXRDdHJsLmVkaXRNb2RhbC5zaG93TW9kYWwoXG4gICAgICAgICAgICAgICAgICAgIGF0dHJzLmNvbnRlbnRJZCxcbiAgICAgICAgICAgICAgICAgICAgYXR0cnMuY29udGVudFRoZW1lXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudFRoZW1lRWRpdEJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRUaGVtZUVkaXRCdXR0b247XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgQ29udGVudFRvZ2dsZVByb3BlcnR5QnV0dG9uXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFRvZ2dsZVByb3BlcnR5QnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudFRvZ2dsZVByb3BlcnR5Q3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBDb250ZW50VG9nZ2xlUHJvcGVydHlDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIENvbnRlbnRUb2dnbGVQcm9wZXJ0eUN0cmwudG9nZ2xlUHJvcGVydHkudG9nZ2xlUHJvcGVydHkoXG4gICAgICAgICAgICAgICAgICAgIGF0dHJzLmNvbnRlbnRJZCxcbiAgICAgICAgICAgICAgICAgICAgYXR0cnMucHJvcGVydHlOYW1lLFxuICAgICAgICAgICAgICAgICAgICBTdHJpbmcoYXR0cnMudmFsdWUpICE9PSAnZmFsc2UnXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudFRvZ2dsZVByb3BlcnR5QnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFRvZ2dsZVByb3BlcnR5QnV0dG9uO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIENvbnRlbnRXZWlnaHRFZGl0QnV0dG9uXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudFdlaWdodEVkaXRCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50V2VpZ2h0RWRpdEN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQ29udGVudFdlaWdodEVkaXRDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIENvbnRlbnRXZWlnaHRFZGl0Q3RybC5lZGl0TW9kYWwuc2hvd01vZGFsKFxuICAgICAgICAgICAgICAgICAgICBhdHRycy5jb250ZW50SWQsXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGF0dHJzLmNvbnRlbnRXZWlnaHQpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQ29udGVudFdlaWdodEVkaXRCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50V2VpZ2h0RWRpdEJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1NldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIFNldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFNldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsLnNldEFzQWN0aXZlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmlkLCBhdHRycy5jb250ZW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFNldFRyYW5zbGF0aW9uQXNBY3RpdmVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRyYW5zbGF0aW9uRGVsZXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnVHJhbnNsYXRpb25EZWxldGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIFRyYW5zbGF0aW9uRGVsZXRlQ3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBUcmFuc2xhdGlvbkRlbGV0ZUN0cmwuZGVsZXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmNvbnRlbnQsIGF0dHJzLnRyYW5zbGF0aW9uSWQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5UcmFuc2xhdGlvbkRlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zbGF0aW9uRGVsZXRlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4uY29udGVudCcsIFsnbmdUYWJsZScsICd1aS50cmVlJ10pXG4gICAgLmNvbmZpZyhbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC8nO1xuICAgICAgICAgICAgLy8gTm93IHNldCB1cCB0aGUgc3RhdGVzXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2NvbnRlbnQnLFxuICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERhc2hib2FyZEN0cmwnLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ29udGVudFJlcG9zaXRvcnknLCBmdW5jdGlvbihDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgdHJlZSBvZiBhbGwgY2F0ZWdvcmllc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkudHJlZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2F0ZWdvcnknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gQ09OVEVOVCBMSVNUXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50Lmxpc3QnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9saXN0L3tjb250ZW50SWR9P2lzQWN0aXZlJnBhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RQYXJlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJywgJ1V0aWxzJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBVdGlscywgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgc3RhdGUgcGFyYW0gaGFzIGNhdGVnb3J5IGlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc3RhdGVQYXJhbXMuY29udGVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVdGlscy5TdG9yYWdlLnNldFN0b3JhZ2VJdGVtKHtjb250ZW50TGlzdFBhcmVudDogJHN0YXRlUGFyYW1zLmNvbnRlbnRJZH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZSgkc3RhdGVQYXJhbXMuY29udGVudElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHN0b3JhZ2UgaGFzIGNhdGVnb3J5IGlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoVXRpbHMuU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZVBhcmFtcy5jb250ZW50SWQgPSBVdGlscy5TdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS5vbmUoVXRpbHMuU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkNhdGVnb3JpZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgb3BlbiBjYXRlZ29yaWVzIGZyb20gU3RvcmFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVdGlscycsIGZ1bmN0aW9uKFV0aWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBVdGlscy5TdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdvcGVuQ2F0ZWdvcmllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdsaXN0Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50TGlzdEN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3F1aWNrU2lkZWJhckxlZnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2NhdGVnb3JpZXMuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBDT05URU5UIFNIT1dcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQuc2hvdycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tjb250ZW50SWR9L3Nob3cve2xhbmdDb2RlfScsXG4gICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZWRpcmVjdCB0byBhY3RpdmUgdGFiIG9uIGxhbmd1YWdlIGNoYW5nZVxuICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsIGZ1bmN0aW9uKCRzdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfLnN0YXJ0c1dpdGgoJHN0YXRlLmN1cnJlbnQubmFtZSwgJ2NvbnRlbnQuc2hvdycpID8gJHN0YXRlLmN1cnJlbnQubmFtZSA6ICcuZGV0YWlscyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhbmdDb2RlOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsICckc3RhdGVQYXJhbXMnLCBmdW5jdGlvbigkc3RhdGUsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHN0YXRlUGFyYW1zLmxhbmdDb2RlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsICdDb250ZW50UmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZSgkc3RhdGVQYXJhbXMuY29udGVudElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERldGFpbHNDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdsYW5nU3dpdGNoZXJAY29udGVudC5zaG93Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL2xhbmdTd2l0Y2hlci5odG1sJ1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnRTZXR0aW5nc0Bjb250ZW50LnNob3cnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvc2V0dGluZ3MuaHRtbCdcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQuc2hvdy5kZXRhaWxzJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZGV0YWlscycsXG4gICAgICAgICAgICAgICAgICAgIGRlZXBTdGF0ZVJlZGlyZWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzdGlja3k6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudFRhYic6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2RldGFpbHMuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LnNob3cuaGlzdG9yeScsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2hpc3Rvcnk/aXNBY3RpdmUmdHlwZSZwYWdlJnBlclBhZ2UnLFxuICAgICAgICAgICAgICAgICAgICBkZWVwU3RhdGVSZWRpcmVjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc3RpY2t5OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnRUYWInOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvdGFicy9oaXN0b3J5Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50SGlzdG9yeUN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5zaG93LmJsb2NrcycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2Jsb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIGRlZXBTdGF0ZVJlZGlyZWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzdGlja3k6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnQmxvY2tzUmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgQmxvY2tzUmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQmxvY2tzUmVwb3NpdG9yeS5saXN0Rm9yQ29udGVudCgkc3RhdGVQYXJhbXMuY29udGVudElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudFRhYic6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2Jsb2Nrcy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudEJsb2Nrc0N0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIENPTlRFTlQgRURJVFxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2NvbnRlbnRJZH0vZWRpdC97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgYWJzdHJhY3Q6ICcuaW5kZXgnLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYW5nQ29kZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24oJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy5sYW5nQ29kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnQ29udGVudFJlcG9zaXRvcnknLCBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93TWFzazogdHJ1ZSAvLyBlbnRlciBlZGl0IG1vZGVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdzaG93Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50RGV0YWlsc0N0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2xhbmdTd2l0Y2hlckBjb250ZW50LmVkaXQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvbGFuZ1N3aXRjaGVyLmh0bWwnXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudFNldHRpbmdzQGNvbnRlbnQuZWRpdCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy9zZXR0aW5ncy5odG1sJ1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5lZGl0LmluZGV4Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcnLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnRUYWInOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvdGFicy9kZXRhaWxzLmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5lZGl0LmRldGFpbHMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9kZXRhaWxzJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50VGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50RGV0YWlsc0VkaXRDdHJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2RldGFpbHNFZGl0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIENPTlRFTlQgVFJBU0hDQU5cbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQudHJhc2hjYW4nLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy90cmFzaGNhbj9pc0FjdGl2ZSZ0eXBlJnBhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RQYXJlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkNhdGVnb3JpZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgb3BlbiBjYXRlZ29yaWVzIGZyb20gU3RvcmFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTdG9yYWdlJywgZnVuY3Rpb24oU3RvcmFnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnb3BlbkNhdGVnb3JpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAndHJhc2hjYW4uaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRUcmFzaGNhbkN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3F1aWNrU2lkZWJhckxlZnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2NhdGVnb3JpZXMuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBDT05URU5UIEFERFxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5hZGQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9hZGQve3R5cGV9JyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdFBhcmVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVdGlscycsICdDb250ZW50UmVwb3NpdG9yeScsIGZ1bmN0aW9uKFV0aWxzLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdG9yYWdlIGhhcyBjYXRlZ29yeSBpZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoVXRpbHMuU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZShVdGlscy5TdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdhZGQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRBZGRDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBDT05URU5UIEFERCBUUkFOU0xBVElPTlxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5hZGRUcmFuc2xhdGlvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tjb250ZW50SWR9L2FkZC10cmFuc2xhdGlvbi97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnQ29udGVudFJlcG9zaXRvcnknLCBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2FkZFRyYW5zbGF0aW9uLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50QWRkQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudEFkZEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERlbGV0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudFJlc3RvcmVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRSZXN0b3JlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50Q2F0ZWdvcnlUcmVlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudENhdGVnb3J5VHJlZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERhc2hib2FyZEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnREYXNoYm9hcmRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnREZXRhaWxzQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudERldGFpbHNDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnREZXRhaWxzRWRpdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnREZXRhaWxzRWRpdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudEhpc3RvcnlDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50SGlzdG9yeUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudEJsb2Nrc0N0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnRCbG9ja3NDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRMaXN0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudExpc3RDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRUcmFzaGNhbkN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnRUcmFzaGNhbkN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50Um91dGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRSb3V0ZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignVHJhbnNsYXRpb25EZWxldGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL1RyYW5zbGF0aW9uRGVsZXRlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50VG9nZ2xlUHJvcGVydHlDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRUb2dnbGVQcm9wZXJ0eUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudFdlaWdodEVkaXRDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRXZWlnaHRFZGl0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50VGhlbWVFZGl0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50VGhlbWVFZGl0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50UHVibGlzaGVkQXRFZGl0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyZWN0aXZlcy9Db250ZW50UHVibGlzaGVkQXRFZGl0Q3RybCcpKVxuICAgIC5mYWN0b3J5KCdDb250ZW50UmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvQ29udGVudFJlcG9zaXRvcnkuanMnKSlcbiAgICAuZGlyZWN0aXZlKCdjb250ZW50RGVsZXRlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0NvbnRlbnREZWxldGVCdXR0b24uanMnKSlcbiAgICAuZGlyZWN0aXZlKCdjb250ZW50UmVzdG9yZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Db250ZW50UmVzdG9yZUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnRFZGl0Um91dGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudEVkaXRSb3V0ZUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ3NldFRyYW5zbGF0aW9uQXNBY3RpdmVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ3RyYW5zbGF0aW9uRGVsZXRlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL1RyYW5zbGF0aW9uRGVsZXRlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudFRvZ2dsZVByb3BlcnR5QnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0NvbnRlbnRUb2dnbGVQcm9wZXJ0eUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnRQdWJsaXNoZWRBdEVkaXRCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudFB1Ymxpc2hlZEF0RWRpdEJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnRBY3Rpb25zRHJvcGRvd24nLCBbJyRkcm9wZG93bicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Db250ZW50QWN0aW9uc0Ryb3Bkb3duLmpzJyldKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnRXZWlnaHRFZGl0QnV0dG9uJywgWyckZHJvcGRvd24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudFdlaWdodEVkaXRCdXR0b24uanMnKV0pXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudFRoZW1lRWRpdEJ1dHRvbicsIFsnJGRyb3Bkb3duJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0NvbnRlbnRUaGVtZUVkaXRCdXR0b24uanMnKV0pXG4gICAgLmRpcmVjdGl2ZSgnY2hhcmFjdGVyc0NvdW50ZXInLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ2hhcmFjdGVyc0NvdW50ZXIuanMnKSlcbiAgICAucnVuKFtcbiAgICAgICAgJ05hdkJhcicsXG4gICAgICAgIGZ1bmN0aW9uKE5hdkJhcikge1xuICAgICAgICAgICAgTmF2QmFyLmFkZChcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQ09OVEVOVCcsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2NvbnRlbnQubGlzdCcsXG4gICAgICAgICAgICAgICAgICAgIGljb246ICdmYSBmYS1maWxlLXRleHQtbydcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy9OYXZCYXIuYWRkTGFzdENoaWxkKFxuICAgICAgICAgICAgLy8gICAgJ0NPTlRFTlQnLFxuICAgICAgICAgICAgLy8gICAge1xuICAgICAgICAgICAgLy8gICAgICAgIHRpdGxlOiAnQUxMX0NPTlRFTlRTJyxcbiAgICAgICAgICAgIC8vICAgICAgICBhY3Rpb246ICdjb250ZW50Lmxpc3QnLFxuICAgICAgICAgICAgLy8gICAgICAgIGljb246ICdmYSBmYS10aCdcbiAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgIC8vKTtcbiAgICAgICAgICAgIC8vTmF2QmFyLmFkZExhc3RDaGlsZChcbiAgICAgICAgICAgIC8vICAgICdDT05URU5UJyxcbiAgICAgICAgICAgIC8vICAgIHtcbiAgICAgICAgICAgIC8vICAgICAgICB0aXRsZTogJ0FERF9DT05URU5UJyxcbiAgICAgICAgICAgIC8vICAgICAgICBhY3Rpb246ICdjb250ZW50LmFkZCh7IHR5cGU6IFwiY29udGVudFwiIH0pJyxcbiAgICAgICAgICAgIC8vICAgICAgICBpY29uOiAnZmEgZmEtZmlsZS10ZXh0LW8nXG4gICAgICAgICAgICAvLyAgICB9XG4gICAgICAgICAgICAvLyk7XG4gICAgICAgICAgICAvL05hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgICAvLyAgICAnQ09OVEVOVCcsXG4gICAgICAgICAgICAvLyAgICB7XG4gICAgICAgICAgICAvLyAgICAgICAgdGl0bGU6ICdBRERfQ0FURUdPUlknLFxuICAgICAgICAgICAgLy8gICAgICAgIGFjdGlvbjogJ2NvbnRlbnQuYWRkKHsgdHlwZTogXCJjYXRlZ29yeVwiIH0pJyxcbiAgICAgICAgICAgIC8vICAgICAgICBpY29uOiAnZmEgZmEtZmlsZS10ZXh0J1xuICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgLy8pO1xuICAgICAgICB9XG4gICAgXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRSZXBvc2l0b3J5KFJlc3Rhbmd1bGFyKSB7XG4gICAgdmFyIGFwaSA9ICdhZG1pbi9jb250ZW50cyc7XG4gICAgdmFyIGNvbnRlbnRzID0gUmVzdGFuZ3VsYXIuYWxsKGFwaSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmdldChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICB0cmVlOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpKS5nZXRMaXN0KCd0cmVlJywgcGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGlzdDogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udGVudHMuZ2V0TGlzdChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGVkOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpKS5nZXRMaXN0KCdkZWxldGVkJywgcGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IGZ1bmN0aW9uKGlkLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuZ2V0TGlzdCgnY2hpbGRyZW4nLCBwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBuZXdDb250ZW50OiBmdW5jdGlvbihuZXdDb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gY29udGVudHMucG9zdChuZXdDb250ZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlQ29udGVudDogZnVuY3Rpb24oaWQsIGNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuY3VzdG9tUFVUKGNvbnRlbnQpO1xuICAgICAgICB9LFxuICAgICAgICBuZXdDb250ZW50VHJhbnNsYXRpb246IGZ1bmN0aW9uKGlkLCBuZXdUcmFuc2xhdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5hbGwoJ3RyYW5zbGF0aW9ucycpLnBvc3QobmV3VHJhbnNsYXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICBuZXdDb250ZW50Um91dGU6IGZ1bmN0aW9uKGlkLCBuZXdSb3V0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5hbGwoJ3JvdXRlJykucG9zdChuZXdSb3V0ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zbGF0aW9uczogZnVuY3Rpb24oaWQsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5hbGwoJ3RyYW5zbGF0aW9ucycpLmdldExpc3QocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlVHJhbnNsYXRpb246IGZ1bmN0aW9uKGNvbnRlbnRJZCwgdHJhbnNsYXRpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGNvbnRlbnRJZCkub25lKCd0cmFuc2xhdGlvbnMnLCB0cmFuc2xhdGlvbklkKS5yZW1vdmUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlQ29udGVudDogZnVuY3Rpb24oaWQsIGZvcmNlRGVsZXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLm9uZShmb3JjZURlbGV0ZSkucmVtb3ZlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3RvcmVDb250ZW50OiBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGkgKyAnL3Jlc3RvcmUnLCBpZCkucHV0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuc3RyaXBSZXN0YW5ndWxhcihlbGVtKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnRSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRSZXBvc2l0b3J5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb3JlQ3RybCgkc2NvcGUsIFV0aWxzLCBUcmFuc2xhdGlvbnMsIE5hdkJhciwgVG9wTmF2QmFyKSB7XG4gICAgLy8gZ2V0IHRyYW5zbGF0aW9ucyBsYW5ndWFnZXNcbiAgICBUcmFuc2xhdGlvbnMuZ2V0VHJhbnNsYXRpb25zKCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAkc2NvcGUubGFuZ3MgPSByZXNwb25zZS5sYW5ncztcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRMYW5nID0gJHNjb3BlLnRyYW5zTGFuZyA9IHJlc3BvbnNlLmN1cnJlbnRMYW5nO1xuICAgICAgICBUcmFuc2xhdGlvbnMuc2VsZWN0QWRtaW5MYW5nKCRzY29wZS5jdXJyZW50TGFuZyk7XG4gICAgICAgIC8vIHNldCBDS0VkaXRvciBsYW5ndWFnZVxuICAgICAgICBVdGlscy5ja09wdGlvbnMuc2V0RWRpdG9yT3B0aW9uKHtsYW5ndWFnZTogJHNjb3BlLmN1cnJlbnRMYW5nLmNvZGV9KTtcbiAgICB9KTtcblxuICAgIC8vIGFkbWluIHBhbmVsIGxhbmd1YWdlXG4gICAgJHNjb3BlLnNlbGVjdEFkbWluTGFuZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBUcmFuc2xhdGlvbnMuc2VsZWN0QWRtaW5MYW5nKCRzY29wZS5jdXJyZW50TGFuZyk7XG4gICAgICAgIC8vIHNldCBDS0VkaXRvciBsYW5ndWFnZVxuICAgICAgICBVdGlscy5ja09wdGlvbnMuc2V0RWRpdG9yT3B0aW9uKHtsYW5ndWFnZTogJHNjb3BlLmN1cnJlbnRMYW5nLmNvZGV9KTtcbiAgICB9O1xuXG4gICAgLy8gdHJhbnNsYXRpb25zIGxhbmd1YWdlXG4gICAgJHNjb3BlLnNlbGVjdExhbmd1YWdlID0gZnVuY3Rpb24obGFuZykge1xuICAgICAgICAkc2NvcGUudHJhbnNMYW5nID0gbGFuZztcbiAgICB9O1xuXG4gICAgLy8gcmVmcmVzaCBjdXJyZW50IHN0YXRlXG4gICAgJHNjb3BlLnJlZnJlc2hDdXJyZW50U3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgVXRpbHMuJHN0YXRlLmdvKFV0aWxzLiRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgIH07XG5cbiAgICAvLyByZWRpcmVjdCB1c2VyIHRvIHByZXZpb3VzIHN0YXRlXG4gICAgJHNjb3BlLnJlZGlyZWN0QmFjayA9IGZ1bmN0aW9uKGRlZmF1bHRTdGF0ZU5hbWUpIHtcbiAgICAgICAgVXRpbHMucmVkaXJlY3RCYWNrKGRlZmF1bHRTdGF0ZU5hbWUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUubmF2QmFyID0gTmF2QmFyLmdldEl0ZW1zKCk7XG4gICAgJHNjb3BlLnRvcE5hdkJhciA9IFRvcE5hdkJhci5nZXRJdGVtcygpO1xuICAgIC8vIGlmIG11bHRpIGxhbmcgaXMgc2V0XG4gICAgaWYgKHR5cGVvZiBVdGlscy5Db25maWcubXVsdGlsYW5nICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUuaXNNdWx0aUxhbmdFbmFibGVkID0gKFV0aWxzLkNvbmZpZy5tdWx0aWxhbmcgPT09ICd0cnVlJyk7XG4gICAgfVxuXG4gICAgLy8gc2V0IGF2YWlsYWJsZSBlbnRpdGllcyB0eXBlc1xuICAgIF8uZm9yRWFjaChVdGlscy5nZXRFbnRpdGllc1R5cGVzKCksIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgJHNjb3BlW2tleV0gPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8vIGlmIGJsb2NrIHJlZ2lvbnMgYXJlIHNldFxuICAgIGlmICh0eXBlb2YgVXRpbHMuQ29uZmlnLmJsb2NrUmVnaW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gYWRkIGRpc2FibGVkIHJlZ2lvbiBhbmQgcGFzcyB0byB2aWV3XG4gICAgICAgICRzY29wZS5ibG9ja1JlZ2lvbnMgPSBfLnVuaW9uKFtudWxsXSwgVXRpbHMuQ29uZmlnLmJsb2NrUmVnaW9ucyk7XG4gICAgfVxuICAgIC8vIGlmIGN1cnJlbnQgdXNlciBpZCBpcyBzZXRcbiAgICBpZiAodHlwZW9mIFV0aWxzLkNvbmZpZy5jdXJyZW50VXNlcklkICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUuY3VycmVudFVzZXJJZCA9IFV0aWxzLkNvbmZpZy5jdXJyZW50VXNlcklkO1xuICAgIH1cbiAgICAvLyBPZmYgY2FudmFzIHNpZGViYXJcbiAgICAkc2NvcGUuc2hvd1NpZGViYXIgPSBmYWxzZTtcbiAgICAvLyBjb250ZW50IHRyYW5zbGF0aW9ucyBsYW5ndWFnZSBzd2l0Y2hlclxuICAgICRzY29wZS5zaG93VHJhbnNMYW5nU3dpdGNoZXIgPSBmYWxzZTtcbiAgICAvLyBhZG1pbiBsYW5ndWFnZSBzd2l0Y2hlclxuICAgICRzY29wZS5zaG93QWRtaW5MYW5nU3dpdGNoZXIgPSB0cnVlO1xuICAgIC8vIHBhc3Mgc3RhdGUgdG8gdmlld1xuICAgICRzY29wZS4kc3RhdGUgPSBVdGlscy4kc3RhdGU7XG5cbiAgICAvLyBjaGVjayBmb3IgZWRpdCBzdGF0ZVxuICAgICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0b1N0YXRlLmRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBpZiAodG9TdGF0ZS5uYW1lICE9PSAnY29udGVudC5lZGl0LmluZGV4Jykge1xuICAgICAgICAgICAgICAgICRzY29wZS5lZGl0U3RhdGVOYW1lID0gdG9TdGF0ZS5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLnNob3dNYXNrID0gdG9TdGF0ZS5kYXRhLnNob3dNYXNrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLmVkaXRTdGF0ZU5hbWUgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLnNob3dNYXNrID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGlmIHRoZXJlIGlzIGxhbmdDb2RlIHBhcmFtIHZhbGlkYXRlIGl0XG4gICAgJHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBzZXQgY29udGVudCB0cmFuc2xhdGlvbnMgbGFuZ3VhZ2Ugc3dpdGNoZXJcbiAgICAgICAgJHNjb3BlLnNob3dUcmFuc0xhbmdTd2l0Y2hlciA9IFV0aWxzLnN0YXRlSW5jbHVkZXMoWydjb250ZW50Lmxpc3QnLCAnY29udGVudC50cmFzaGNhbicsICdibG9ja3MubGlzdCcsICdmaWxlcy5saXN0J10pO1xuICAgICAgICAvLyBkaXNhYmxlIGFkbWluIGxhbmd1YWdlIHN3aXRjaGVyXG4gICAgICAgICRzY29wZS5zaG93QWRtaW5MYW5nU3dpdGNoZXIgPSBVdGlscy5zdGF0ZUluY2x1ZGVzKFsnY29udGVudC5hZGQnLCAnY29udGVudC5lZGl0JywgJ2NvbnRlbnQuYWRkVHJhbnNsYXRpb24nXSk7XG4gICAgICAgIGlmIChVdGlscy4kc3RhdGVQYXJhbXMuaGFzT3duUHJvcGVydHkoJ2xhbmdDb2RlJykpIHtcbiAgICAgICAgICAgIFRyYW5zbGF0aW9ucy5jaGVja0lmTGFuZ3VhZ2VJc0F2YWlsYWJsZShVdGlscy4kc3RhdGVQYXJhbXMubGFuZ0NvZGUpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbkNvcmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdUcmFuc2xhdGlvbnMnLCAnTmF2QmFyJywgJ1RvcE5hdkJhciddO1xubW9kdWxlLmV4cG9ydHMgPSBDb3JlQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3RhdGVzRHJvcGRvd24oJGRyb3Bkb3duKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHtzdGF0ZXNEcm9wZG93bjogJz0nfSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICB2YXIgZHJvcGRvd24gPSAkZHJvcGRvd24oZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZ3plcm8vYWRtaW4vdmlld3MvY29yZS9kaXJlY3RpdmVzL3N0YXRlc0Ryb3Bkb3duLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBhbmltYXRpb246ICdhbS1mbGlwLXgnLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2JvdHRvbS1yaWdodCdcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS5jb250ZW50ID0gc2NvcGUuc3RhdGVzRHJvcGRvd247XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblN0YXRlc0Ryb3Bkb3duLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gU3RhdGVzRHJvcGRvd247XG4iLCJhbmd1bGFyLm1vZHVsZSgnQ29yZUZpbHRlcnMnLCBbXSlcbiAgICAvKipcbiAgICAgKiBGaWx0ZXIgcmV0dXJucyB0cmFuc2xhdGFibGUgc3RyaW5nIGJhc2VkIG9uIHByb3ZpZGVkIGxhbmd1YWdlIGNvZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsYW5nQ29kZSAgbGFuZ3VhZ2UgY29kZVxuICAgICAqXG4gICAgICogQHJldHVybnMge3N0cmluZ30gdHJhbnNsYXRhYmxlIHN0cmluZ1xuICAgICAqL1xuICAgIC5maWx0ZXIoJ2xhbmdOYW1lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGxhbmdDb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gJ0xBTkdfTkFNRV8nICsgYW5ndWxhci51cHBlcmNhc2UobGFuZ0NvZGUpO1xuICAgICAgICB9O1xuICAgIH0pXG4gICAgLyoqXG4gICAgICogRmlsdGVyIHJldHVybnMgdGhlIHRyYW5zbGF0aW9uIGluIHByb3ZpZGVkIGxhbmd1YWdlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25zIHRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3ZlclxuICAgICAqIEBwYXJhbSBsYW5nQ29kZSAgbGFuZ3VhZ2UgY29kZVxuICAgICAqIEBwYXJhbSBmaWVsZCAgZmllbGQgbmFtZVxuICAgICAqXG4gICAgICogQHJldHVybnMge29iamVjdH0gdHJhbnNsYXRpb24gZmllbGRcbiAgICAgKi9cbiAgICAuZmlsdGVyKCdnZXRUcmFuc2xhdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih0cmFuc2xhdGlvbnMsIGxhbmdDb2RlLCBmaWVsZCkge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRUcmFuc2xhdGlvbiA9IF8uZmlsdGVyKHRyYW5zbGF0aW9ucywgZnVuY3Rpb24odHJhbnNsYXRpb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNsYXRpb24ubGFuZ0NvZGUgPT09IGxhbmdDb2RlO1xuICAgICAgICAgICAgfSkuc2hpZnQoKTtcbiAgICAgICAgICAgIGlmIChfLmhhcyhjdXJyZW50VHJhbnNsYXRpb24sIGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50VHJhbnNsYXRpb25bZmllbGRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KVxuICAgIC8qKlxuICAgICAqIEZpbHRlciByZXR1cm5zIHRoZSBvcHRpb24gdmFsdWUgaW4gcHJvdmlkZWQgbGFuZ3VhZ2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyXG4gICAgICogQHBhcmFtIGxhbmdDb2RlICBsYW5ndWFnZSBjb2RlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSB2YWx1ZSBmaWVsZFxuICAgICAqL1xuICAgIC5maWx0ZXIoJ2dldE9wdGlvblZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlcywgbGFuZ0NvZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmZpbHRlcih2YWx1ZXMsIGZ1bmN0aW9uKHZhbHVlLCBjb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvZGUgPT09IGxhbmdDb2RlO1xuICAgICAgICAgICAgfSkuc2hpZnQoKTtcbiAgICAgICAgfTtcbiAgICB9KVxuICAgIC8qKlxuICAgICAqIEZpbHRlciBjaGVja3MgaWYgc3BlY2lmaWVkIG5vZGUgZXhpc3RzIGluIHByb3ZpZGVkIHBhdGhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXRoIHRoZSBub2RlIHBhdGggdG8gaXRlcmF0ZSBvdmVyXG4gICAgICogQHBhcmFtIGlkICBub2RlIGlkXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7Ym9vbH0gdHJ1ZSBvciBmYWxzZVxuICAgICAqL1xuICAgIC5maWx0ZXIoJ25vZGVJblBhdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocGF0aCwgaWQpIHtcbiAgICAgICAgICAgIC8vIGlmIHBhdGggZXhpc3RzIGFuZCBub3QgZW1wdHlcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3VuZGVmaW5lZCcgJiYgcGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGguaW5kZXhPZihpZCkgPiAtMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pXG5cbiAgICAvKipcbiAgICAgKiBUaGlzIGZpbHRlciBsZXRzIHlvdSBtYXJrIEhUTUwgYXMg4oCcc2FmZeKAnSBmb3IgYW5ndWxhciB0byB1c2UgYW5kIHNob3cgb24gYSBwYWdlLlxuICAgICAqIE90aGVyd2lzZSwgYW5ndWxhciB3b3VsZCBqdXN0IHNob3cgdGhlIEhUTUwgYXMgcGxhaW4gdGV4dC5cbiAgICAgKi9cbiAgICAuZmlsdGVyKCd0cnVzdEFzSHRtbCcsIGZ1bmN0aW9uKCRzY2UpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gJHNjZS50cnVzdEFzSHRtbDtcbiAgICB9KVxuXG4gICAgLyoqXG4gICAgICogUGFyc2UgSVNPIDg2MDEgZGF0ZSB0byBzcGVjaWZpZWQgZm9ybWF0XG4gICAgICogQHBhcmFtIGZvcm1hdCBzdHJpbmcgZXhwZWN0ZWQgZGF0ZSBmb3JtYXRcbiAgICAgKi9cbiAgICAuZmlsdGVyKCdmb3JtYXREYXRlJywgZnVuY3Rpb24oJGZpbHRlcikge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihkYXRlU1RSLCBmb3JtYXQpIHtcbiAgICAgICAgICAgIHZhciBkID0gRGF0ZS5wYXJzZShkYXRlU1RSKTtcbiAgICAgICAgICAgIGlmICghZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgZm9ybWF0ID0gJ3l5eXktTU0tZGQgaGg6bW06c3MnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICRmaWx0ZXIoJ2RhdGUnKShkLCBmb3JtYXQpO1xuICAgICAgICB9O1xuICAgIH0pXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgaHRtbCB0YWdzLCBhbmQgdHJpbSBzdHJpbmcgdG8gZ2l2ZW4gbGVuZ3RoIHdpdGhvdXQgYnJlYWtpbmcgd29yZHNcbiAgICAgKiBAcGFyYW0gbGVuIGV4cGVjdGVkIGxlbmd0aFxuICAgICAqL1xuICAgIC5maWx0ZXIoJ3N0cmlwVGFnc0FuZFRyaW0nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oc3RyLCBsZW4pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoLzxcXC8/W14+XSsoPnwkKS9nLCAnJykuc3Vic3RyKDAsIGxlbik7XG4gICAgICAgICAgICAgICAgc3RyID0gc3RyLnN1YnN0cigwLCBNYXRoLm1pbihzdHIubGVuZ3RoLCBzdHIubGFzdEluZGV4T2YoJyAnKSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCcuL2ZpbHRlcnMvQ29yZUZpbHRlcnMuanMnKTtcblxuYW5ndWxhci5tb2R1bGUoJ2FkbWluLmNvcmUnLCBbJ0NvcmVGaWx0ZXJzJ10pXG4gIC5jb25maWcoW1xuICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICAgLy8gTm93IHNldCB1cCB0aGUgc3RhdGVzXG4gICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAuc3RhdGUoJ2xvZ291dCcsIHtcbiAgICAgICAgICB1cmw6ICcvbG9nb3V0JyxcbiAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAnQXBpUmVwb3NpdG9yeScsIGZ1bmN0aW9uKEFwaVJlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgQXBpUmVwb3NpdG9yeS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2d6ZXJvX2FwaV90b2tlbicpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9KTtcbiAgICB9XG4gIF0pXG4gIC5jb250cm9sbGVyKCdDb3JlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29yZUN0cmwuanMnKSlcbiAgLmZhY3RvcnkoJ0xhbmdSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9MYW5nUmVwb3NpdG9yeS5qcycpKVxuICAuZmFjdG9yeSgnQXBpUmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvQXBpUmVwb3NpdG9yeS5qcycpKVxuICAuZmFjdG9yeSgnTmF2QmFyJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9OYXZCYXIuanMnKSlcbiAgLmZhY3RvcnkoJ1RvcE5hdkJhcicsIHJlcXVpcmUoJy4vc2VydmljZXMvVG9wTmF2QmFyLmpzJykpXG4gIC5mYWN0b3J5KCdOb3RpZmljYXRpb25zJywgcmVxdWlyZSgnLi4vbGliL05vdGlmaWNhdGlvbnMuanMnKSlcbiAgLmZhY3RvcnkoJ2NrT3B0aW9ucycsIHJlcXVpcmUoJy4uL2xpYi9ja09wdGlvbnMuanMnKSlcbiAgLmZhY3RvcnkoJ1RyYW5zbGF0aW9ucycsIHJlcXVpcmUoJy4vc2VydmljZXMvVHJhbnNsYXRpb25zLmpzJykpXG4gIC5mYWN0b3J5KCdTdG9yYWdlJywgcmVxdWlyZSgnLi4vbGliL1N0b3JhZ2UuanMnKSlcbiAgLmZhY3RvcnkoJ1V0aWxzJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9VdGlscy5qcycpKVxuICAuZGlyZWN0aXZlKCdzdGF0ZXNEcm9wZG93bicsIFsnJGRyb3Bkb3duJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL1N0YXRlc0Ryb3Bkb3duLmpzJyldKVxuICAucnVuKFtcbiAgICAnVG9wTmF2QmFyJyxcbiAgICAnVXNlclJlcG9zaXRvcnknLFxuICAgICdVdGlscycsXG4gICAgZnVuY3Rpb24oVG9wTmF2QmFyLCBVc2VyUmVwb3NpdG9yeSwgVXRpbHMpIHtcblxuICAgICAgVXNlclJlcG9zaXRvcnkub25lKFV0aWxzLkNvbmZpZy5jdXJyZW50VXNlcklkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIHZhciB1c2VyID0gcmVzcG9uc2U7XG4gICAgICAgIHVzZXIuZnVsbE5hbWUgPSB1c2VyLmZpcnN0TmFtZSArICcgJyArIHVzZXIubGFzdE5hbWU7XG5cbiAgICAgICAgVG9wTmF2QmFyLmFkZChcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ1BBR0VfUFJFVklFVycsXG4gICAgICAgICAgICBhY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgdXJsOiAnLydcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFRvcE5hdkJhci5hZGQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6IHVzZXIuZnVsbE5hbWUsXG4gICAgICAgICAgICBhY3Rpb246ICdjb250ZW50Lmxpc3QnXG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBUb3BOYXZCYXIuYWRkTGFzdENoaWxkKFxuICAgICAgICAgIHVzZXIuZnVsbE5hbWUsXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdQUk9GSUxFJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ3VzZXIuZWRpdCh7dXNlcklkOiAnICsgdXNlci5pZCArICd9KSdcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFRvcE5hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgdXNlci5mdWxsTmFtZSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0xPR19PVVQnLFxuICAgICAgICAgICAgYWN0aW9uOiAnbG9nb3V0J1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH0pO1xuXG4gICAgfVxuICBdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQXBpUmVwb3NpdG9yeShSZXN0YW5ndWxhcikge1xuICAgIHJldHVybiB7XG4gICAgICAgIGxvZ2luOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoJy9sb2dpbicpLnBvc3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgbG9nb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoJy9sb2dvdXQnKS5wb3N0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuc3RyaXBSZXN0YW5ndWxhcihlbGVtKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkFwaVJlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gQXBpUmVwb3NpdG9yeTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTGFuZ1JlcG9zaXRvcnkoUmVzdGFuZ3VsYXIpIHtcbiAgICAvKipcbiAgICAgKiBDdXN0b20gbWV0aG9kc1xuICAgICAqL1xuICAgIFJlc3Rhbmd1bGFyLmV4dGVuZE1vZGVsKCdsYW5ncycsIGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIG1vZGVsLnRlc3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAndGVzdCc7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9KTtcblxuICAgIHZhciBhcGkgPSBSZXN0YW5ndWxhci5hbGwoJ2FkbWluL2xhbmdzJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihjb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gYXBpLmdldChjb2RlKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gYXBpLmdldExpc3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYW46IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5zdHJpcFJlc3Rhbmd1bGFyKGVsZW0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuTGFuZ1JlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gTGFuZ1JlcG9zaXRvcnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE5hdkJhcigpIHtcbiAgICAvKiogQHZhciBOYXZpZ2F0aW9uICovXG4gICAgcmV0dXJuIHJlcXVpcmUoJy4uLy4uL2xpYi9uYXZpZ2F0aW9uLmpzJykoKTtcbn1cblxubW9kdWxlLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gTmF2QmFyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb3BOYXZCYXIoKSB7XG4gICAgLyoqIEB2YXIgTmF2aWdhdGlvbiAqL1xuICAgIHJldHVybiByZXF1aXJlKCcuLi8uLi9saWIvbmF2aWdhdGlvbi5qcycpKCk7XG59XG5cbm1vZHVsZS4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFRvcE5hdkJhcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVHJhbnNsYXRpb25zKCRxLCAkdHJhbnNsYXRlLCBMYW5nUmVwb3NpdG9yeSwgVXRpbHMpIHtcbiAgICAvL2NyZWF0ZSBkZWZlcnJlZCBwcm9taXNlXG4gICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICB2YXIgbGFuZ3VhZ2VzID0ge307XG5cbiAgICAvL2dldCBsYW5ndWFnZXNcbiAgICBMYW5nUmVwb3NpdG9yeS5saXN0KCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBsYW5ndWFnZXMubGFuZ3MgPSByZXNwb25zZTtcbiAgICAgICAgbGFuZ3VhZ2VzLmN1cnJlbnRMYW5nID0gbGFuZ3VhZ2VzLnRyYW5zTGFuZyA9IHJlc3BvbnNlWzBdO1xuICAgICAgICAvLyByZXNvbHZlIHRoZSBwcm9taXNlXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUobGFuZ3VhZ2VzKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiByZXR1cm5zIHRoZSBvYmplY3Qgb2YgbGFuZ3VhZ2VzXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBnZXRUcmFuc2xhdGlvbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzZXRzIHRoZSBsYW5ndWFnZSBvZiB0aGUgdHJhbnNsYXRpb24gZm9yIHRoZSBhbmd1bGFyLXRyYW5zbGF0ZSBtb2R1bGVcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGxhbmcgb2JqZWN0IHRoYXQgd2lsbCBiZSB1c2VkIHRvIHRyYW5zbGF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgc2VsZWN0QWRtaW5MYW5nOiBmdW5jdGlvbihsYW5nKSB7XG4gICAgICAgICAgICAkdHJhbnNsYXRlLmZhbGxiYWNrTGFuZ3VhZ2UoWydlbl9VUyddKTtcbiAgICAgICAgICAgICR0cmFuc2xhdGUudXNlKGxhbmcuaTE4bik7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWRpcmVjdCBpZiB1c2VyIHRyeSB0byBhY2Nlc3Mgbm9uIGV4aXN0aW5nIGxhbmd1YWdlXG4gICAgICAgICAqIEBwYXJhbSBsYW5nQ29kZVxuICAgICAgICAgKi9cbiAgICAgICAgY2hlY2tJZkxhbmd1YWdlSXNBdmFpbGFibGU6IGZ1bmN0aW9uKGxhbmdDb2RlKSB7XG4gICAgICAgICAgICB2YXIgYXZhaWxhYmxlID0gW107XG4gICAgICAgICAgICBpZiAobGFuZ3VhZ2VzID09PSB7fSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChsYW5ndWFnZXMsIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlLnB1c2godi5jb2RlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoYXZhaWxhYmxlLmluZGV4T2YobGFuZ0NvZGUpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZEVycm9yKCdMQU5HVUFHRV9OT1RfRk9VTkQnKTtcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBMYW5nUmVwb3NpdG9yeS5saXN0KCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goTGFuZ1JlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpLCBmdW5jdGlvbih2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGUucHVzaCh2LmNvZGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF2YWlsYWJsZS5pbmRleE9mKGxhbmdDb2RlKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ0xBTkdVQUdFX05PVF9GT1VORCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5UcmFuc2xhdGlvbnMuJGluamVjdCA9IFsnJHEnLCAnJHRyYW5zbGF0ZScsICdMYW5nUmVwb3NpdG9yeScsICdVdGlscyddO1xubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2xhdGlvbnM7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXRpbHMoTm90aWZpY2F0aW9ucywgU3RvcmFnZSwgJHN0YXRlLCAkcHJldmlvdXNTdGF0ZSwgJHN0YXRlUGFyYW1zLCBja09wdGlvbnMsIGhvdGtleXMsICRmaWx0ZXIpIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBOb3RpZmljYXRpb25zOiBOb3RpZmljYXRpb25zLFxuICAgICAgICBTdG9yYWdlOiBTdG9yYWdlLFxuICAgICAgICAkc3RhdGU6ICRzdGF0ZSxcbiAgICAgICAgJHN0YXRlUGFyYW1zOiAkc3RhdGVQYXJhbXMsXG4gICAgICAgICRwcmV2aW91c1N0YXRlOiAkcHJldmlvdXNTdGF0ZSxcbiAgICAgICAgQ29uZmlnOiBDb25maWcsXG4gICAgICAgIGNrT3B0aW9uczogY2tPcHRpb25zLFxuICAgICAgICBob3RrZXlzOiBob3RrZXlzLFxuICAgICAgICAkZmlsdGVyOiAkZmlsdGVyLFxuICAgICAgICAvKipcbiAgICAgICAgICogUmVkaXJlY3QgdXNlciB0byBwcmV2aW91cyBzdGF0ZVxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVmYXVsdFN0YXRlTmFtZSBkZWZhdWx0IHN0YXRlIG5hbWVcbiAgICAgICAgICovXG4gICAgICAgIHJlZGlyZWN0QmFjazogZnVuY3Rpb24oZGVmYXVsdFN0YXRlTmFtZSkge1xuICAgICAgICAgICAgLy8gZ2V0cyBhIHJlZmVyZW5jZSB0byB0aGUgcHJldmlvdXMgc3RhdGUuXG4gICAgICAgICAgICB2YXIgcHJldmlvdXNTdGF0ZSA9ICRwcmV2aW91c1N0YXRlLmdldCgpO1xuICAgICAgICAgICAgLy8gc2V0IGRlZmF1bHQgbmFtZSBmb3IgdGhlIHJlZGlyZWN0IGlmIGl0IGlzIGlzIG5vdCBzcGVjaWZpZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGVmYXVsdFN0YXRlTmFtZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBkZWZhdWx0U3RhdGVOYW1lID0gJ2hvbWUnOyAvLyBSZWRpcmVjdCB0byBob21lXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgcHJldmlvdXNTdGF0ZVxuICAgICAgICAgICAgaWYgKHByZXZpb3VzU3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyByZWRpcmVjdGVkIGJhY2sgdG8gdGhlIHN0YXRlIHdlIGNhbWUgZnJvbVxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhwcmV2aW91c1N0YXRlLnN0YXRlLm5hbWUsIHByZXZpb3VzU3RhdGUucGFyYW1zLCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSBnbyB0byBkZWZhdWx0IHN0YXRlXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKGRlZmF1bHRTdGF0ZU5hbWUsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBmdW5jdGlvbiBjaGVja3MgaWYgb25lIG9mIHByb3ZpZGVkIHN0YXRlIG5hbWVzIGlzIGluY2x1ZGVkIGluIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHthcnJheX0gc3RhdGVOYW1lcyB0aGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXJcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMge2Jvb2x9IHdoZXRoZXIgYW55IG9mIHN0YXRlIGV4aXN0c1xuICAgICAgICAgKi9cbiAgICAgICAgc3RhdGVJbmNsdWRlczogZnVuY3Rpb24oc3RhdGVOYW1lcykge1xuICAgICAgICAgICAgdmFyIGluY2x1ZGVzID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlTmFtZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHN0YXRlTmFtZXMsIGZ1bmN0aW9uKHN0YXRlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJHN0YXRlLmluY2x1ZGVzKHN0YXRlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gaW5jbHVkZXM7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gdHJhbnNsYXRpb24gd2l0aCBzcGVjaWZpZWQgbGFuZyBwcm9wZXJ0eSBmcm9tIHRyYW5zbGF0aW9ucyBhcnJheVxuICAgICAgICAgKiBhbmQgZmV0Y2ggbGFuZyBwcm9wZXJ0eVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25zIFRyYW5zbGF0aW9ucyBhcnJheVxuICAgICAgICAgKiBAcGFyYW0gbGFuZ0NvZGUgbGFuZ3VhZ2UgY29kZVxuICAgICAgICAgKiBAcmV0dXJucyBPYmplY3QgfCBmYWxzZVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0VHJhbnNsYXRpb25CeUxhbmc6IGZ1bmN0aW9uKHRyYW5zbGF0aW9ucywgbGFuZ0NvZGUpIHtcbiAgICAgICAgICAgIHZhciB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9ucy5zaGlmdCgpO1xuXG4gICAgICAgICAgICBpZiAoIXRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHJhbnNsYXRpb24ubGFuZ0NvZGUgPT09IGxhbmdDb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUcmFuc2xhdGlvbkJ5TGFuZyh0cmFuc2xhdGlvbnMsIGxhbmdDb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiBhbGwgYXZhaWxhYmxlIGVudGl0aWVzIHR5cGVzIG9iamVjdCBmcm9tIGNvbmZpZ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyBPYmplY3QgYXZhaWxhYmxlIGVudGl0aWVzIHR5cGVzXG4gICAgICAgICAqL1xuICAgICAgICBnZXRFbnRpdGllc1R5cGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgY29udGVudFR5cGVzOiB0aGlzLkNvbmZpZy5jb250ZW50VHlwZXMsXG4gICAgICAgICAgICAgICAgYmxvY2tUeXBlczogdGhpcy5Db25maWcuYmxvY2tUeXBlcyxcbiAgICAgICAgICAgICAgICBmaWxlVHlwZXM6IHRoaXMuQ29uZmlnLmZpbGVUeXBlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG5cbn1cblxubW9kdWxlLiRpbmplY3QgPSBbXG4gICAgJ05vdGlmaWNhdGlvbnMnLFxuICAgICdTdG9yYWdlJyxcbiAgICAnJHN0YXRlJyxcbiAgICAnJHByZXZpb3VzU3RhdGUnLFxuICAgICckc3RhdGVQYXJhbXMnLFxuICAgICdja09wdGlvbnMnLFxuICAgICdob3RrZXlzJyxcbiAgICAnJGZpbHRlcidcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVzQWRkQ3RybCgkcSwgJHNjb3BlLCBVdGlscywgdHlwZSwgVXBsb2FkLCBGaWxlc1JlcG9zaXRvcnksIEZpbGVTZXJ2aWNlKSB7IC8vanNoaW50IGlnbm9yZTpsaW5lXG4gICAgJHNjb3BlLmZpbGVzID0gW107XG4gICAgJHNjb3BlLnByb2dyZXNzID0gW107XG4gICAgJHNjb3BlLmlzQnVzeSA9IGZhbHNlO1xuICAgIC8vIGRlZmF1bHQgZmlsZSByZWNvcmQgdmFsdWVzXG4gICAgJHNjb3BlLm5ld0ZpbGVEZWZhdWx0cyA9IHtcbiAgICAgICAgaXNBY3RpdmU6IDEsXG4gICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgIHRyYW5zbGF0aW9uczoge1xuICAgICAgICAgICAgbGFuZ0NvZGU6IFV0aWxzLkNvbmZpZy5kZWZhdWx0TGFuZ0NvZGVcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBzZXQgdHJhbnNsYXRpb25zIGxhbmcgY29kZVxuICAgIGlmICh0eXBlb2YgJHNjb3BlLnRyYW5zTGFuZyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLm5ld0ZpbGVEZWZhdWx0cy50cmFuc2xhdGlvbnMubGFuZ0NvZGUgPSAkc2NvcGUudHJhbnNMYW5nLmNvZGU7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGZpbGUgZnJvbSBmaWxlcyBxdWV1ZVxuICAgICRzY29wZS5yZW1vdmVGaWxlID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgJHNjb3BlLmZpbGVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICRzY29wZS5wcm9ncmVzcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG5cbiAgICAvKiBTZXQgdGhlIGRlZmF1bHQgdmFsdWVzIGZvciBuZ2Ytc2VsZWN0IGFuZCBuZ2YtZHJvcCBkaXJlY3RpdmVzKi9cbiAgICAkc2NvcGUuaW52YWxpZEZpbGVzID0gW107XG4gICAgVXBsb2FkLnNldERlZmF1bHRzKHtcbiAgICAgICAgbmdmTWF4VG90YWxTaXplOiAnNU1CJywgLy9AVE9ETyBhbGxvd2VkIHRvdGFsIGZpbGVzIHNpemVcbiAgICAgICAgbmdmS2VlcDogJ1wiZGlzdGluY3RcIicsXG4gICAgICAgIG5nZk1heEZpbGVzOiAxMCwgLy9AVE9ETyBhbGxvd2VkIG1heCBmaWxlcyBudW1iZXJcbiAgICAgICAgbmdmVmFsaWRhdGU6IHtwYXR0ZXJuOiBGaWxlU2VydmljZS5nZXRUeXBlRXh0ZW5zaW9uc1BhdHRlcm4odHlwZSl9LCAvL2FsbG93ZWQgdHlwZSBmaWxlcyBleHRlbnNpb25zXG4gICAgICAgIG5nZk1vZGVsSW52YWxpZDogJ2ludmFsaWRGaWxlcydcbiAgICB9KTtcblxuICAgIC8vIGZpbGUgUE9TVCBhY3Rpb25cbiAgICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuaXNCdXN5ID0gdHJ1ZTtcbiAgICAgICAgdmFyIHByb21pc2VzID0gW107XG4gICAgICAgIF8uZWFjaCgkc2NvcGUuZmlsZXMsIGZ1bmN0aW9uKGZpbGUsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSBfLmNsb25lRGVlcCgkc2NvcGUubmV3RmlsZURlZmF1bHRzKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0gRmlsZVNlcnZpY2UucHJlcGFyZVJlcXVlc3REYXRhKGZpbGUsIGRlZmF1bHRzKTtcbiAgICAgICAgICAgIHByb21pc2VzLnB1c2goRmlsZXNSZXBvc2l0b3J5LmNyZWF0ZShkYXRhKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlbW92ZUZpbGUoaW5kZXgpO1xuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnRklMRV9DUkVBVEVEJywge2ZpbGVOYW1lOiBmaWxlLm5hbWV9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnByb2dyZXNzW2luZGV4XSA9IDA7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHtmaWxlTmFtZTogZmlsZS5uYW1lfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICAgICAvLyBwcm9ncmVzcyBub3RpZnlcbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvZ3Jlc3NbaW5kZXhdID0gcGFyc2VJbnQoMTAwLjAgKiBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHEuYWxsKHByb21pc2VzKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmlzQnVzeSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIC8vIGlmIGFueSBvZiB0aGUgZmlsZSBwcm9jZXNzaW5nIHByb2R1Y2VkIGFuIGVycm9yXG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdmaWxlcy5saXN0Jywge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaXNCdXN5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRFcnJvcignRklMRV9DUkVBVEVfRVJST1InLCBlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xufVxuXG5GaWxlc0FkZEN0cmwuJGluamVjdCA9IFsnJHEnLCAnJHNjb3BlJywgJ1V0aWxzJywgJ3R5cGUnLCAnVXBsb2FkJywgJ0ZpbGVzUmVwb3NpdG9yeScsICdGaWxlU2VydmljZSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVzQWRkQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsZXNBZGRUcmFuc2xhdGlvbkN0cmwoJHNjb3BlLCBVdGlscywgRmlsZXNSZXBvc2l0b3J5KSB7XG4gICAgLy8gZGVmYXVsdCB0cmFuc2xhdGlvbnMgbGFuZyBjb2RlXG4gICAgJHNjb3BlLm5ld0ZpbGVUcmFuc2xhdGlvbiA9IHtcbiAgICAgICAgbGFuZ0NvZGU6IFV0aWxzLiRzdGF0ZVBhcmFtcy5sYW5nQ29kZVxuICAgIH07XG5cbiAgICAvLyBjb250ZW50cyBQT1NUIGFjdGlvblxuICAgICRzY29wZS5hZGRGaWxlVHJhbnNsYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgRmlsZXNSZXBvc2l0b3J5Lm5ld1RyYW5zbGF0aW9uKFV0aWxzLiRzdGF0ZVBhcmFtcy5maWxlSWQsICRzY29wZS5uZXdGaWxlVHJhbnNsYXRpb24pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIFJlZGlyZWN0IHVzZXIgdG8gcHJldmlvdXMgc3RhdGUgb3IgZmlsZXMgbGlzdFxuICAgICAgICAgICAgVXRpbHMucmVkaXJlY3RCYWNrKCdmaWxlcy5saXN0Jyk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5GaWxlc0FkZFRyYW5zbGF0aW9uQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnRmlsZXNSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVzQWRkVHJhbnNsYXRpb25DdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWxlc0RldGFpbHNDdHJsKCRzY29wZSwgZmlsZSwgbGFuZ0NvZGUsIEZpbGVzUmVwb3NpdG9yeSwgVXRpbHMpIHtcblxuICAgIC8vIFRPRE86IGdldCByZWdpc3RlcmVkIHRhYnNcbiAgICAkc2NvcGUudGFicyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdQUkVWSUVXJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2RldGFpbHMnLFxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSAvLyBkZWZhdWx0IGFjdGl2ZSB0YWIgaW4gc2V0dGluZ3MgZWRpdCBtb2RlXG4gICAgICAgIH1cbiAgICAgICAgLy8ge1xuICAgICAgICAvLyAgICAgdGl0bGU6ICdCTE9DS1MnLFxuICAgICAgICAvLyAgICAgYWN0aW9uOiAnYmxvY2tzJ1xuICAgICAgICAvLyB9XG4gICAgXTtcblxuICAgIC8vIGlmIGxhbmcgY29kZSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxhbmdDb2RlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubGFuZ0NvZGUgPSBsYW5nQ29kZTtcbiAgICB9XG5cbiAgICAvLyBpZiBmaWxlIGV4aXN0c1xuICAgIGlmICh0eXBlb2YgZmlsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmZpbGUgPSBGaWxlc1JlcG9zaXRvcnkuY2xlYW4oZmlsZSk7XG4gICAgICAgICRzY29wZS5hY3RpdmVUcmFuc2xhdGlvbiA9IFV0aWxzLmdldFRyYW5zbGF0aW9uQnlMYW5nKChmaWxlLnRyYW5zbGF0aW9ucy5zbGljZSgwKSksIGxhbmdDb2RlKTtcbiAgICB9XG59XG5GaWxlc0RldGFpbHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdmaWxlJywgJ2xhbmdDb2RlJywgJ0ZpbGVzUmVwb3NpdG9yeScsICdVdGlscyddO1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlc0RldGFpbHNDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWxlc0RldGFpbHNFZGl0Q3RybCgkc2NvcGUsIGZpbGUsIGxhbmdDb2RlLCBGaWxlc1JlcG9zaXRvcnksIFV0aWxzKSB7XG5cbiAgICAvLyBpZiBmaWxlIHRyYW5zbGF0aW9uIGlzIG5vdCBzZXRcbiAgICBpZiAodHlwZW9mICRzY29wZS5hY3RpdmVUcmFuc2xhdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmFjdGl2ZVRyYW5zbGF0aW9uID0gVXRpbHMuZ2V0VHJhbnNsYXRpb25CeUxhbmcoKGZpbGUudHJhbnNsYXRpb25zLnNsaWNlKDApKSwgbGFuZ0NvZGUpO1xuICAgIH1cblxuICAgICRzY29wZS5zYXZlRmlsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBGaWxlc1JlcG9zaXRvcnkubmV3VHJhbnNsYXRpb24oJHNjb3BlLmZpbGUuaWQsICRzY29wZS5hY3RpdmVUcmFuc2xhdGlvbikudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbygnZmlsZXMuc2hvdy5kZXRhaWxzJywge1xuICAgICAgICAgICAgICAgIGZpbGVJZDogZmlsZS5pZCxcbiAgICAgICAgICAgICAgICBsYW5nQ29kZTogbGFuZ0NvZGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufVxuRmlsZXNEZXRhaWxzRWRpdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2ZpbGUnLCAnbGFuZ0NvZGUnLCAnRmlsZXNSZXBvc2l0b3J5JywgJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVzRGV0YWlsc0VkaXRDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIEZpbGVDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVzTGlzdEN0cmwoJHNjb3BlLCBVdGlscywgRmlsZXNSZXBvc2l0b3J5LCBOZ1RhYmxlUGFyYW1zKSB7XG4gICAgLy8gVE9ETzogZmlsZSBhZGQgYnV0dG9uIGxpbmtzIGZvciBvdGhlciB0eXBlc1xuICAgICRzY29wZS5maWxlQWRkQnV0dG9uTGlua3MgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdBRERfSU1BR0VTJyxcbiAgICAgICAgICAgIGhyZWY6ICdmaWxlcy5hZGQoeyB0eXBlOiBcImltYWdlXCIgfSknLFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWZpbGUtaW1hZ2UtbydcblxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiAnQUREX0RPQ1VNRU5UUycsXG4gICAgICAgICAgICBocmVmOiAnZmlsZXMuYWRkKHsgdHlwZTogXCJkb2N1bWVudFwiIH0pJyxcbiAgICAgICAgICAgIGljb246ICdmYSBmYS1maWxlLXBkZi1vJ1xuICAgICAgICB9XG4gICAgXTtcblxuICAgICRzY29wZS50YWJsZVBhcmFtcyA9IG5ldyBOZ1RhYmxlUGFyYW1zKHtcbiAgICAgICAgY291bnQ6IDI1LCAvLyBjb3VudCBwZXIgcGFnZVxuICAgICAgICBzb3J0aW5nOiB7XG4gICAgICAgICAgICAndHJhbnNsYXRpb25zLnRpdGxlJzogJ2FzYycgLy8gaW5pdGlhbCBzb3J0aW5nXG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIHRvdGFsOiAwLCAvLyBsZW5ndGggb2YgZGF0YVxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigkZGVmZXIsIHBhcmFtcykge1xuICAgICAgICAgICAgJHNjb3BlLnJlcXVlc3RQZW5kaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBsYW5nOiBVdGlscy5Db25maWcuZGVmYXVsdExhbmdDb2RlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBsYW5nIHNvcnQgb3B0aW9uc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAkc2NvcGUudHJhbnNMYW5nICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5sYW5nID0gJHNjb3BlLnRyYW5zTGFuZy5jb2RlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMuY291bnQoKSAtIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSBkZWNsYXJlZCBpbiB2aWV3XG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5jb3VudChVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBlclBhZ2UgPSBwYXJhbXMuY291bnQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyYW1zLnBhZ2UoKSAtIGN1cnJlbnQgcGFnZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucGFnZShVdGlscy4kc3RhdGVQYXJhbXMucGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBhZ2UgPSBwYXJhbXMucGFnZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0YWJsZVBhcmFtcy5vcmRlckJ5KCkgLSBhbiBhcnJheSBvZiBzdHJpbmcgaW5kaWNhdGluZyBib3RoIHRoZSBzb3J0aW5nIGNvbHVtbiBhbmQgZGlyZWN0aW9uIChlLmcuIFtcIituYW1lXCIsIFwiLWVtYWlsXCJdKVxuICAgICAgICAgICAgaWYgKHBhcmFtcy5zb3J0aW5nKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IGludGVyZXN0ZWQgaW4gZmlyc3Qgc29ydCBjb2x1bW4gZm9yIG5vd1xuICAgICAgICAgICAgICAgIHZhciBvcmRlckJ5ID0gcGFyYW1zLm9yZGVyQnkoKVswXTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMuc29ydCA9IG9yZGVyQnlbMF0gPT09ICcrJyA/IG9yZGVyQnkuc3Vic3RyaW5nKDEpIDogb3JkZXJCeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXRpbHMuJHN0YXRlUGFyYW1zIC0gZmlsdGVycyBmcm9tIHN0YXRlIHBhcmFtc1xuICAgICAgICAgICAgdmFyIGZpbHRlcnMgPSBVdGlscy4kc3RhdGVQYXJhbXM7XG4gICAgICAgICAgICBxdWVyeU9wdGlvbnMgPSBfLm1lcmdlKHF1ZXJ5T3B0aW9ucywgZmlsdGVycyk7XG4gICAgICAgICAgICAkc2NvcGUuYWN0aXZlRmlsdGVyID0gZmlsdGVycztcblxuICAgICAgICAgICAgLy8gZ2V0IGxpc3QgYnkgZGVmYXVsdFxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBGaWxlc1JlcG9zaXRvcnkubGlzdChxdWVyeU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAvLyBQcm9taXNlIGlzIGEgUkVTVCBBbmd1bGFySlMgc2VydmljZSB0aGF0IHRhbGtzIHRvIGFwaSBhbmQgcmV0dXJuIHByb21pc2VcbiAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXF1ZXN0UGVuZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHBhcmFtcy50b3RhbChyZXNwb25zZS5tZXRhLnRvdGFsKTtcbiAgICAgICAgICAgICAgICAkZGVmZXIucmVzb2x2ZShGaWxlc1JlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5GaWxlc0xpc3RDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdGaWxlc1JlcG9zaXRvcnknLCAnbmdUYWJsZVBhcmFtcyddO1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlc0xpc3RDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWxlc0RlbGV0ZUN0cmwoJHNjb3BlLCBVdGlscywgRmlsZXNSZXBvc2l0b3J5LCAkbW9kYWwpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9maWxlcy9kaXJlY3RpdmVzLyc7XG4gICAgLy8gRGVsZXRlIG1vZGFsXG4gICAgdm0uZGVsZXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZmlsZURlbGV0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBCaW5kIGhvdGtleXNcbiAgICAgICAgICAgIFV0aWxzLmhvdGtleXMuYWRkKHtcbiAgICAgICAgICAgICAgICBjb21ibzogJ2VudGVyJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogVXRpbHMuJGZpbHRlcigndHJhbnNsYXRlJykoJ0NPTkZJUk1fREVMRVRFJyksXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmRlbGV0ZUZpbGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gRmlsZUlkIEZpbGUgaWQgdG8gYmUgcmVtb3ZlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKEZpbGVJZCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0uRmlsZUlkID0gRmlsZUlkO1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ0RFTEVURV9GSUxFX1FVRVNUSU9OJyk7XG4gICAgICAgICAgICBVdGlscy5ob3RrZXlzLmRlbCgnZW50ZXInKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgRmlsZSBpZCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgZGVsZXRlRmlsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAvLyBGb3JjZSBkZWxldGUgRmlsZVxuICAgICAgICAgICAgRmlsZXNSZXBvc2l0b3J5LmRlbGV0ZSh2bS5GaWxlSWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdGSUxFX0hBU19CRUVOX0RFTEVURUQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuRmlsZXNEZWxldGVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdGaWxlc1JlcG9zaXRvcnknLCAnJG1vZGFsJ107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVzRGVsZXRlQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBGaWxlc0RlbGV0ZVRyYW5zbGF0aW9uQ3RybFxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWxlc0RlbGV0ZVRyYW5zbGF0aW9uQ3RybCgkc2NvcGUsIFV0aWxzLCAkbW9kYWwsIEZpbGVzUmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2ZpbGVzL2RpcmVjdGl2ZXMvJztcbiAgICAvLyBEZWxldGUgbW9kYWxcbiAgICB2bS5kZWxldGVNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICd0cmFuc2xhdGlvbkRlbGV0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBmaWxlSWQgZmlsZXMgaWRcbiAgICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9uSWQgdHJhbnNsYXRpb24gaWRcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oZmlsZUlkLCB0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5maWxlSWQgPSBmaWxlSWQ7XG4gICAgICAgICAgICB2bS50cmFuc2xhdGlvbklkID0gdHJhbnNsYXRpb25JZDtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdERUxFVEVfVFJBTlNMQVRJT05fUVVFU1RJT04nKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgdHJhbnNsYXRpb24gaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGRlbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgIEZpbGVzUmVwb3NpdG9yeS5kZWxldGVUcmFuc2xhdGlvbih2bS5maWxlSWQsIHZtLnRyYW5zbGF0aW9uSWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUUkFOU0xBVElPTl9IQVNfQkVFTl9ERUxFVEVEJyk7XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLnJlbG9hZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuRmlsZXNEZWxldGVUcmFuc2xhdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJyRtb2RhbCcsICdGaWxlc1JlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZXNEZWxldGVUcmFuc2xhdGlvbkN0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgRmlsZXNUb2dnbGVQcm9wZXJ0eUN0cmxcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsZXNUb2dnbGVQcm9wZXJ0eUN0cmwoVXRpbHMsIEZpbGVzUmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG5cbiAgICB2bS50b2dnbGVQcm9wZXJ0eSA9IHtcblxuICAgICAgICB0b2dnbGVQcm9wZXJ0eTogZnVuY3Rpb24oZmlsZUlkLCBwcm9wZXJ0eU5hbWUsIGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gIWN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIHZhciBmaWxlID0ge307XG4gICAgICAgICAgICBmaWxlW3Byb3BlcnR5TmFtZV0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIEZpbGVzUmVwb3NpdG9yeS51cGRhdGUoZmlsZUlkLCBmaWxlKS50aGVuKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxufVxuRmlsZXNUb2dnbGVQcm9wZXJ0eUN0cmwuJGluamVjdCA9IFsnVXRpbHMnLCAnRmlsZXNSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVzVG9nZ2xlUHJvcGVydHlDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWxlRGVsZXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnRmlsZXNEZWxldGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLC8vIGJlY2F1c2UgdGhlIHNjb3BlIGlzIGlzb2xhdGVkXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgRmlsZXNEZWxldGVDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgYSBkZWxldGUgbW9kYWwgZnJvbSBhIGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICBGaWxlc0RlbGV0ZUN0cmwuZGVsZXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmZpbGVJZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkZpbGVEZWxldGVCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGVsZXRlQnV0dG9uO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIEZpbGVUb2dnbGVQcm9wZXJ0eUJ1dHRvblxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWxlVG9nZ2xlUHJvcGVydHlCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdGaWxlc1RvZ2dsZVByb3BlcnR5Q3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBGaWxlc1RvZ2dsZVByb3BlcnR5Q3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBGaWxlc1RvZ2dsZVByb3BlcnR5Q3RybC50b2dnbGVQcm9wZXJ0eS50b2dnbGVQcm9wZXJ0eShcbiAgICAgICAgICAgICAgICAgICAgYXR0cnMuZmlsZUlkLFxuICAgICAgICAgICAgICAgICAgICBhdHRycy5wcm9wZXJ0eU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIFN0cmluZyhhdHRycy52YWx1ZSkgIT09ICdmYWxzZSdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5GaWxlVG9nZ2xlUHJvcGVydHlCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlVG9nZ2xlUHJvcGVydHlCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVUcmFuc2xhdGlvbkRlbGV0ZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0ZpbGVzRGVsZXRlVHJhbnNsYXRpb25DdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIFRyYW5zbGF0aW9uRGVsZXRlQ3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBUcmFuc2xhdGlvbkRlbGV0ZUN0cmwuZGVsZXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmZpbGVJZCwgYXR0cnMudHJhbnNsYXRpb25JZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkZpbGVUcmFuc2xhdGlvbkRlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVUcmFuc2xhdGlvbkRlbGV0ZUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2FkbWluLmZpbGVzJywgWyduZ1RhYmxlJ10pXG4gICAgLmNvbmZpZyhbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgICckdXJsUm91dGVyUHJvdmlkZXInLFxuICAgICAgICAnUmVzdGFuZ3VsYXJQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsIFJlc3Rhbmd1bGFyUHJvdmlkZXIpIHtcblxuICAgICAgICAgICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2ZpbGVzLyc7XG5cbiAgICAgICAgICAgIC8vIE5vdyBzZXQgdXAgdGhlIHN0YXRlc1xuICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2ZpbGVzJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZmlsZScsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdpbmRleC5odG1sJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdmaWxlcy5saXN0Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvbGlzdD90eXBlJmlzQWN0aXZlJnBhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnbGlzdC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRmlsZXNMaXN0Q3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gRklMRSBTSE9XXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdmaWxlcy5zaG93Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve2ZpbGVJZH0vc2hvdy97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgYWJzdHJhY3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlZGlyZWN0IHRvIGFjdGl2ZSB0YWIgb24gbGFuZ3VhZ2UgY2hhbmdlXG4gICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJywgZnVuY3Rpb24oJHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8uc3RhcnRzV2l0aCgkc3RhdGUuY3VycmVudC5uYW1lLCAnZmlsZXMuc2hvdycpID8gJHN0YXRlLmN1cnJlbnQubmFtZSA6ICcuZGV0YWlscyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhbmdDb2RlOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsICckc3RhdGVQYXJhbXMnLCBmdW5jdGlvbigkc3RhdGUsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHN0YXRlUGFyYW1zLmxhbmdDb2RlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsICdGaWxlc1JlcG9zaXRvcnknLCBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIEZpbGVzUmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRmlsZXNSZXBvc2l0b3J5Lm9uZSgkc3RhdGVQYXJhbXMuZmlsZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRmlsZXNEZXRhaWxzQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGFuZ1N3aXRjaGVyQGZpbGVzLnNob3cnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvbGFuZ1N3aXRjaGVyLmh0bWwnXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnZmlsZVNldHRpbmdzQGZpbGVzLnNob3cnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvc2V0dGluZ3MuaHRtbCdcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2ZpbGVzLnNob3cuZGV0YWlscycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2RldGFpbHMnLFxuICAgICAgICAgICAgICAgICAgICBkZWVwU3RhdGVSZWRpcmVjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc3RpY2t5OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2ZpbGVUYWInOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvdGFicy9kZXRhaWxzLmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIEZJTEUgRURJVFxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnZmlsZXMuZWRpdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tmaWxlSWR9L2VkaXQve2xhbmdDb2RlfScsXG4gICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiAnLmluZGV4JyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFuZ0NvZGU6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzdGF0ZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMubGFuZ0NvZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJywgJ0ZpbGVzUmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgRmlsZXNSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBGaWxlc1JlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5maWxlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvd01hc2s6IHRydWUgLy8gZW50ZXIgZWRpdCBtb2RlXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRmlsZXNEZXRhaWxzQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGFuZ1N3aXRjaGVyQGZpbGVzLmVkaXQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvbGFuZ1N3aXRjaGVyLmh0bWwnXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnZmlsZVNldHRpbmdzQGZpbGVzLmVkaXQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvc2V0dGluZ3MuaHRtbCdcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2ZpbGVzLmVkaXQuaW5kZXgnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJycsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnZmlsZVRhYic6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2RldGFpbHMuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdmaWxlcy5lZGl0LmRldGFpbHMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9kZXRhaWxzJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdmaWxlVGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdGaWxlc0RldGFpbHNFZGl0Q3RybCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvdGFicy9kZXRhaWxzRWRpdC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBGSUxFIEFERFxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnZmlsZXMuYWRkJywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvYWRkL3t0eXBlfScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnYWRkLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdGaWxlc0FkZEN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzdGF0ZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIEZJTEUgQUREIFRSQU5TTEFUSU9OXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdmaWxlcy5hZGRUcmFuc2xhdGlvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tmaWxlSWR9L2FkZC10cmFuc2xhdGlvbi97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdhZGRUcmFuc2xhdGlvbi5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRmlsZXNBZGRUcmFuc2xhdGlvbkN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmNvbnRyb2xsZXIoJ0ZpbGVzQWRkQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvRmlsZXNBZGRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0ZpbGVzTGlzdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0ZpbGVzTGlzdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignRmlsZXNEZXRhaWxzQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvRmlsZXNEZXRhaWxzQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdGaWxlc0RldGFpbHNFZGl0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvRmlsZXNEZXRhaWxzRWRpdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignRmlsZXNBZGRUcmFuc2xhdGlvbkN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0ZpbGVzQWRkVHJhbnNsYXRpb25DdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0ZpbGVzRGVsZXRlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyZWN0aXZlcy9GaWxlc0RlbGV0ZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignRmlsZXNUb2dnbGVQcm9wZXJ0eUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvRmlsZXNUb2dnbGVQcm9wZXJ0eUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignRmlsZXNEZWxldGVUcmFuc2xhdGlvbkN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvRmlsZXNEZWxldGVUcmFuc2xhdGlvbkN0cmwnKSlcbiAgICAuc2VydmljZSgnRmlsZVNlcnZpY2UnLCByZXF1aXJlKCcuL3NlcnZpY2VzL0ZpbGVTZXJ2aWNlLmpzJykpXG4gICAgLmZhY3RvcnkoJ0ZpbGVzUmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvRmlsZXNSZXBvc2l0b3J5LmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnZmlsZURlbGV0ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9GaWxlRGVsZXRlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnZmlsZVRvZ2dsZVByb3BlcnR5QnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0ZpbGVUb2dnbGVQcm9wZXJ0eUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2ZpbGVUcmFuc2xhdGlvbkRlbGV0ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9GaWxlVHJhbnNsYXRpb25EZWxldGVCdXR0b24uanMnKSlcbiAgICAucnVuKFtcbiAgICAgICAgJ05hdkJhcicsXG4gICAgICAgIGZ1bmN0aW9uKE5hdkJhcikge1xuICAgICAgICAgICAgTmF2QmFyLmFkZCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICdGSUxFUycsIGFjdGlvbjogJ2ZpbGVzLmxpc3QnLCBpY29uOiAnZmEgZmEtZmlsZXMtbydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVTZXJ2aWNlKFV0aWxzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgbWVyZ2VkIGZpbGUgZGF0YSB3aXRoIHByb3ZpZGVkIGRlZmF1bHRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBmaWxlIGZpbGUgZGF0YVxuICAgICAgICAgKiBAcGFyYW0gZGVmYXVsdHMgZGVmYXVsdCBmaWxlIHNldHRpbmdzIHRvIG1lcmdlIHdpdGhcbiAgICAgICAgICogQHJldHVybnMgT2JqZWN0IG1lcmdlZCBmaWxlIGRhdGEgd2l0aCBkZWZhdWx0c1xuICAgICAgICAgKi9cbiAgICAgICAgcHJlcGFyZVJlcXVlc3REYXRhOiBmdW5jdGlvbihmaWxlLCBkZWZhdWx0cykge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHtcbiAgICAgICAgICAgICAgICBmaWxlOiBmaWxlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gc2V0IHRyYW5zbGF0aW9ucyBpZiB0aGVyZSBhbnkgb2YgdGhlbSBpcyBmaWxsZWQsIGJlY2F1c2UgdHJhbnNsYXRpb25zIGFyZSBub3QgcmVxdWlyZWQuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZpbGUudHJhbnNsYXRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC50cmFuc2xhdGlvbnMgPSBmaWxlLnRyYW5zbGF0aW9ucztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVmYXVsdHMgPSBfLm9taXQoZGVmYXVsdHMsIFsndHJhbnNsYXRpb25zJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF8ubWVyZ2UoZGVmYXVsdHMsIG91dHB1dCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm5zIGZpbGUgZXh0ZW5zaW9ucyBwYXR0ZXJuIGZvciBuZy1maWxlLXVwbG9hZCB2YWxpZGF0b3IgZS5nLiAnLnBuZywuanBnLC5qcGVnLC50aWYnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0eXBlIGZpbGUgdHlwZVxuICAgICAgICAgKiBAcmV0dXJucyBzdHJpbmcgdHlwZSBmaWxlIGV4dGVuc2lvbnMgcGF0dGVybiBmb3IgbmctZmlsZS11cGxvYWQgdmFsaWRhdG9yXG4gICAgICAgICAqL1xuICAgICAgICBnZXRUeXBlRXh0ZW5zaW9uc1BhdHRlcm46IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiAnLicgKyBfLmpvaW4oVXRpbHMuQ29uZmlnLmZpbGVFeHRlbnNpb25zW3R5cGVdLCAnLC4nKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkZpbGVTZXJ2aWNlLiRpbmplY3QgPSBbJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVTZXJ2aWNlO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIEZpbGVDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbGVzUmVwb3NpdG9yeShSZXN0YW5ndWxhciwgVXBsb2FkKSB7XG4gICAgdmFyIGFwaSA9ICdhZG1pbi9maWxlcyc7XG4gICAgdmFyIHVzZXJzID0gUmVzdGFuZ3VsYXIuYWxsKGFwaSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmdldChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0OiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB1c2Vycy5nZXRMaXN0KHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuc3RyaXBSZXN0YW5ndWxhcihlbGVtKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlOiBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5yZW1vdmUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbihpZCwgdXNlcikge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5jdXN0b21QVVQodXNlcik7XG4gICAgICAgIH0sXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24obmV3RmlsZSkge1xuICAgICAgICAgICAgcmV0dXJuIFVwbG9hZC51cGxvYWQoe1xuICAgICAgICAgICAgICAgIHVybDogUmVzdGFuZ3VsYXIuY29uZmlndXJhdGlvbi5iYXNlVXJsICsgJy8nICsgYXBpLFxuICAgICAgICAgICAgICAgIGhlYWRlcnMgOiBSZXN0YW5ndWxhci5jb25maWd1cmF0aW9uLmRlZmF1bHRIZWFkZXJzLFxuICAgICAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogUmVzdGFuZ3VsYXIuY29uZmlndXJhdGlvbi5kZWZhdWx0SHR0cEZpZWxkcy53aXRoQ3JlZGVudGlhbHMsXG4gICAgICAgICAgICAgICAgZGF0YTogbmV3RmlsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIG5ld1RyYW5zbGF0aW9uOiBmdW5jdGlvbihpZCwgbmV3VHJhbnNsYXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuYWxsKCd0cmFuc2xhdGlvbnMnKS5wb3N0KG5ld1RyYW5zbGF0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlVHJhbnNsYXRpb246IGZ1bmN0aW9uKGZpbGVJZCwgdHJhbnNsYXRpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGZpbGVJZCkub25lKCd0cmFuc2xhdGlvbnMnLCB0cmFuc2xhdGlvbklkKS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkZpbGVzUmVwb3NpdG9yeS4kaW5qZWN0ID0gWydSZXN0YW5ndWxhcicsICdVcGxvYWQnXTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZXNSZXBvc2l0b3J5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBOb3RpZmljYXRpb25zKCR0cmFuc2xhdGUpIHtcbiAgICAvLyBOb3RpZmljYXRpb25zIHN0YWNrXG4gICAgdmFyIHN0YWNrQm90dG9tUmlnaHQgPSB7J2RpcjEnOiAndXAnLCAnZGlyMic6ICdsZWZ0JywgJ2ZpcnN0cG9zMSc6IDI1LCAnZmlyc3Rwb3MyJzogMjV9O1xuICAgIC8vIE5vdGlmaWNhdGlvbnMgb3B0aW9uc1xuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICBhZGRjbGFzczogJ3N0YWNrLWJvdHRvbXJpZ2h0JyxcbiAgICAgICAgc3RhY2s6IHN0YWNrQm90dG9tUmlnaHQsXG4gICAgICAgIHNoYWRvdzogZmFsc2UsXG4gICAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgICAgIHN0aWNrZXI6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHdoaWNoIHNob3dzIG1lc3NhZ2VzIG9mIGdpdmVuIHR5cGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvbiB1c2VkIHRvIHNob3cgZWFjaCBtZXNzYWdlXG4gICAgICogQHBhcmFtIG1lc3NhZ2VzIG1lc3NhZ2VzIHRvIHNob3dcbiAgICAgKi9cbiAgICB2YXIgYWRkTWVzc2FnZXMgPSBmdW5jdGlvbihjYWxsYmFjaywgbWVzc2FnZXMpIHtcbiAgICAgICAgXy5mb3JFYWNoKG1lc3NhZ2VzLCBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgY2FsbGJhY2sobWVzc2FnZXNbMF0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyBtdWx0aXBsZSBBbmd1bGFyU3RyYXAgaW5mbyB0eXBlIGFsZXJ0c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZXMgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIHRvIHNob3dcbiAgICAgICAgICovXG4gICAgICAgIGFkZEluZm9zOiBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgYWRkTWVzc2FnZXMoc2VsZi5hZGRJbmZvLCBtZXNzYWdlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyBtdWx0aXBsZSBBbmd1bGFyU3RyYXAgZGFuZ2VyIHR5cGUgYWxlcnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlcyB0cmFuc2xhdGFibGUgbWVzc2FnZXMgdG8gc2hvd1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkRXJyb3JzOiBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgYWRkTWVzc2FnZXMoc2VsZi5hZGRFcnJvciwgbWVzc2FnZXMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgbXVsdGlwbGUgQW5ndWxhclN0cmFwIHdhcm5pbmcgdHlwZSBhbGVydHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2VzIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyB0byBzaG93XG4gICAgICAgICAqL1xuICAgICAgICBhZGRXYXJuaW5nczogZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGFkZE1lc3NhZ2VzKHNlbGYuYWRkV2FybmluZywgbWVzc2FnZXMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgbXVsdGlwbGUgQW5ndWxhclN0cmFwIHN1Y2Nlc3MgdHlwZSBhbGVydHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2VzIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyB0byBzaG93XG4gICAgICAgICAqL1xuICAgICAgICBhZGRTdWNjZXNzZXM6IGZ1bmN0aW9uKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBhZGRNZXNzYWdlcyhzZWxmLmFkZFN1Y2Nlc3MsIG1lc3NhZ2VzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgaW5mbyB0eXBlIGFsZXJ0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlIHN0cmluZyBlZy4gJ0NPTU1PTl9FUlJPUidcbiAgICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9uUGFyYW1zIGR5bmFtaWMgcGFyYW1zIGZvciB0aGUgdHJhbnNsYXRpb25cbiAgICAgICAgICovXG4gICAgICAgIGFkZEluZm86IGZ1bmN0aW9uKG1lc3NhZ2UsIHRyYW5zbGF0aW9uUGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBOb3RpZnkoXy5tZXJnZShvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgdGV4dDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UsIHRyYW5zbGF0aW9uUGFyYW1zKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnaW5mbydcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgZGFuZ2VyIHR5cGUgYWxlcnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2Ugc3RyaW5nIGVnLiAnQ09NTU9OX0VSUk9SJ1xuICAgICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25QYXJhbXMgZHluYW1pYyBwYXJhbXMgZm9yIHRoZSB0cmFuc2xhdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgYWRkRXJyb3I6IGZ1bmN0aW9uKG1lc3NhZ2UsIHRyYW5zbGF0aW9uUGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBOb3RpZnkoXy5tZXJnZShvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgdGV4dDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UsIHRyYW5zbGF0aW9uUGFyYW1zKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgICAgICAgIGljb246ICdmYSBmYS10aW1lcydcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgd2FybmluZyB0eXBlIGFsZXJ0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlIHN0cmluZyBlZy4gJ0NPTU1PTl9FUlJPUidcbiAgICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9uUGFyYW1zIGR5bmFtaWMgcGFyYW1zIGZvciB0aGUgdHJhbnNsYXRpb25cbiAgICAgICAgICovXG4gICAgICAgIGFkZFdhcm5pbmc6IGZ1bmN0aW9uKG1lc3NhZ2UsIHRyYW5zbGF0aW9uUGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBOb3RpZnkoXy5tZXJnZShvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgdGV4dDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UsIHRyYW5zbGF0aW9uUGFyYW1zKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnd2FybmluZydcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgc3VjY2VzcyB0eXBlIGFsZXJ0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlIHN0cmluZyBlZy4gJ0NPTU1PTl9FUlJPUidcbiAgICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9uUGFyYW1zIGR5bmFtaWMgcGFyYW1zIGZvciB0aGUgdHJhbnNsYXRpb25cbiAgICAgICAgICovXG4gICAgICAgIGFkZFN1Y2Nlc3M6IGZ1bmN0aW9uKG1lc3NhZ2UsIHRyYW5zbGF0aW9uUGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBOb3RpZnkoXy5tZXJnZShvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgdGV4dDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UsIHRyYW5zbGF0aW9uUGFyYW1zKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VjY2VzcydcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbm1vZHVsZS4kaW5qZWN0ID0gWyckdHJhbnNsYXRlJ107XG5tb2R1bGUuZXhwb3J0cyA9IE5vdGlmaWNhdGlvbnM7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFN0b3JhZ2UoKSB7XG4gICAgdmFyIHN0b3JhZ2VJdGVtcyA9IHt9O1xuICAgIHJldHVybiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIHNwZWNpZmllZCBvYmplY3QgdG8gdGhlIHN0b3JhZ2VJdGVtc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBzZXRTdG9yYWdlSXRlbTogZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgICAgICBzdG9yYWdlSXRlbXMgPSBfLm1lcmdlKHN0b3JhZ2VJdGVtcywgb2JqZWN0LCBmdW5jdGlvbihvYmplY3RWYWx1ZSwgc291cmNlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KG9iamVjdFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc291cmNlVmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiByZXR1cm5zIHRoZSBzcGVjaWZpZWQgb2JqZWN0IGZyb20gdGhlIHN0b3JhZ2VJdGVtc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGdldFN0b3JhZ2VJdGVtOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHN0b3JhZ2VJdGVtc1tpbmRleF07XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiByZW1vdmVzIHNwZWNpZmllZCBvYmplY3QgZnJvbSB0aGUgc3RvcmFnZUl0ZW1zXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlU3RvcmFnZUl0ZW06IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICBzdG9yYWdlSXRlbXMgPSBfLm9taXQoc3RvcmFnZUl0ZW1zLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5TdG9yYWdlLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gY2tPcHRpb25zKCkge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgdG9vbGJhckdyb3VwczogW1xuICAgICAgICAgICAge25hbWU6ICdjbGlwYm9hcmQnLCBncm91cHM6IFsnY2xpcGJvYXJkJywgJ3VuZG8nXX0sXG4gICAgICAgICAgICB7bmFtZTogJ2VkaXRpbmcnLCBncm91cHM6IFsnZmluZCcsICdzZWxlY3Rpb24nXX0sXG4gICAgICAgICAgICB7bmFtZTogJ2xpbmtzJ30sXG4gICAgICAgICAgICB7bmFtZTogJ2luc2VydCd9LFxuICAgICAgICAgICAge25hbWU6ICd0b29scyd9LFxuICAgICAgICAgICAge25hbWU6ICdkb2N1bWVudCcsIGdyb3VwczogWydtb2RlJywgJ2RvY3VtZW50JywgJ2RvY3Rvb2xzJ119LFxuICAgICAgICAgICAge25hbWU6ICdvdGhlcnMnfSxcbiAgICAgICAgICAgICcvJyxcbiAgICAgICAgICAgIHtuYW1lOiAnYmFzaWNzdHlsZXMnLCBncm91cHM6IFsnYmFzaWNzdHlsZXMnLCAnY2xlYW51cCddfSxcbiAgICAgICAgICAgIHtuYW1lOiAncGFyYWdyYXBoJywgZ3JvdXBzOiBbJ2xpc3QnLCAnaW5kZW50JywgJ2Jsb2NrcycsICdiaWRpJ119LFxuICAgICAgICAgICAge25hbWU6ICdhbGlnbid9LFxuICAgICAgICAgICAge25hbWU6ICdzdHlsZXMnfVxuICAgICAgICBdLFxuICAgICAgICBoZWlnaHQ6ICc1MDBweCdcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgc3BlY2lmaWVkIG9iamVjdCB0byB0aGUgQ0tFZGl0b3Igb3B0aW9uc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBzZXRFZGl0b3JPcHRpb246IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgICAgICAgZGVmYXVsdHMgPSBfLm1lcmdlKGRlZmF1bHRzLCBvYmplY3QsIGZ1bmN0aW9uKG9iamVjdFZhbHVlLCBzb3VyY2VWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkob2JqZWN0VmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJldHVybnMgQ0tFZGl0b3Igb3B0aW9uc1xuICAgICAgICAgKiBAcGFyYW0gY3VzdG9tIGN1c3RvbSBvcHRpb24gdG8gaW5jbHVkZSBpbiByZXR1cm4gb2JqZWN0LCBvbmx5IGZvciB0aGlzIGluc3RhbmNlIG9mIGVkaXRvclxuICAgICAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0RWRpdG9yT3B0aW9uczogZnVuY3Rpb24oY3VzdG9tKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gXy5jbG9uZURlZXAoZGVmYXVsdHMpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGN1c3RvbSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICAgIG91dHB1dFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5tb2R1bGUuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBja09wdGlvbnM7XG4iLCJmdW5jdGlvbiBOYXZpZ2F0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gY2hlY2tzIGlmICdpdGVtJyBzdHJ1Y3R1cmUgaXMgdmFsaWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIHZhciBjaGVja1N0cnVjdHVyZSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgaWYgKF8uaGFzKGl0ZW0sICdkaXZpZGVyJykpIHtcbiAgICAgICAgICAgIGlmIChpdGVtLmRpdmlkZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb3BlcnR5OiAnICsgJ1xcJ2RpdmlkZXJcXCcnICsgJyBtdXN0IGJlIHNldCB0byBcXCd0cnVlXFwnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIV8uaGFzKGl0ZW0sICd0aXRsZScpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb3BlcnR5OiAnICsgJ3RpdGxlJyArICcgaXMgbWlzc2luZycpO1xuICAgICAgICB9IGVsc2UgaWYgKCFfLmhhcyhpdGVtLCAnYWN0aW9uJykgJiYgIV8uaGFzKGl0ZW0sICdocmVmJykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvcGVydHk6ICcgKyAnXFwnYWN0aW9uXFwnIG9yIFxcJ2hyZWZcXCcnICsgJyBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHJldHVybnMgY2hpbGRyZW4gb2YgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAqXG4gICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICB2YXIgZ2V0Q2hpbGRyZW4gPSBmdW5jdGlvbih0aXRsZSkge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXSxcbiAgICAgICAgICAgIGZvdW5kRmxhZyA9IGZhbHNlO1xuICAgICAgICBfLmZvckVhY2goaXRlbXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnRpdGxlID09PSB0aXRsZSkge1xuICAgICAgICAgICAgICAgIGZvdW5kRmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKF8uaGFzKHZhbHVlLCAnY2hpbGRyZW4nKSAmJiBBcnJheS5pc0FycmF5KHZhbHVlLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbiA9IHZhbHVlLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZm91bmRGbGFnID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJlbnQ6IFxcJycgKyB0aXRsZSArICdcXCcgaGF2ZSBubyBjaGlsZHJlbiwgYmVjYXVzZSBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIGFkZHMgZWxlbWVudCBhY2NvcmRpbmcgdG8gJ3Bvc2l0aW9uJyBhcmd1bWVudFxuICAgICAqIHBvc2l0aW9uID0gJ2JlZm9yZScgLSBlbGVtZW50IHdpbGwgYmUgYWRkZWQgYmVmb3JlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKiBwb3NpdGlvbiA9ICdhZnRlcicgLSBlbGVtZW50IHdpbGwgYmUgYWRkZWQgYWZ0ZXIgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAqXG4gICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiBzdHJpbmdcbiAgICAgKi9cbiAgICB2YXIgYWRkQmVmb3JlQWZ0ZXIgPSBmdW5jdGlvbih0aXRsZSwgaXRlbSwgcG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwb3NpdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgaXMgcmVxdWlyZWQsIHZhbHVlczogXFwnYmVmb3JlXFwnIG9yIFxcJ2FmdGVyXFwnJyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBvc2l0aW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBcXCdwb3NpdGlvblxcJyBtdXN0IGJlIG9mIHN0cmluZyB0eXBlLCB2YWx1ZXM6IFxcJ2JlZm9yZVxcJyBvciBcXCdhZnRlclxcJycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGVja1N0cnVjdHVyZShpdGVtKSkge1xuICAgICAgICAgICAgdmFyIGZvdW5kRmxhZyA9IGZhbHNlO1xuICAgICAgICAgICAgXy5mb3JFYWNoKGl0ZW1zLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUudGl0bGUgPT09IHRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kRmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gJ2JlZm9yZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnNwbGljZShpbmRleCwgMCwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdhZnRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnNwbGljZShpbmRleCArIDEsIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChmb3VuZEZsYWcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbGVtZW50OiBcXCcnICsgdGl0bGUgKyAnXFwnIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIGFkZHMgY2hpbGQgbGluayBhY2NvcmRpbmcgdG8gJ3Bvc2l0aW9uJyBhcmd1bWVudFxuICAgICAqIHBvc2l0aW9uID0gdHJ1ZSAtIGNoaWxkIHdpbGwgYmUgYWRkZWQgYXMgZmlyc3QgZWxlbWVudFxuICAgICAqIHBvc2l0aW9uID0gZmFsc2UgLSBjaGlsZCB3aWxsIGJlIGFkZGVkIGFzIGxhc3QgZWxlbWVudFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgKiBAcGFyYW0gcG9zaXRpb24gYm9vbGVhblxuICAgICAqL1xuICAgIHZhciBhZGRDaGlsZCA9IGZ1bmN0aW9uKHBhcmVudCwgaXRlbSwgcG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwb3NpdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBvc2l0aW9uICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgbXVzdCBiZSBvZiBib29sZWFuIHR5cGUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgIHZhciBmb3VuZEZsYWcgPSBmYWxzZTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChpdGVtcywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnRpdGxlID09PSBwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmhhcyh2YWx1ZSwgJ2NoaWxkcmVuJykgfHwgIUFycmF5LmlzQXJyYXkodmFsdWUuY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUuY2hpbGRyZW4udW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmNoaWxkcmVuLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm91bmRGbGFnID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGZvdW5kRmxhZyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BhcmVudDogXFwnJyArIHBhcmVudCArICdcXCcgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gYWRkcyBjaGlsZCBsaW5rIGFjY29yZGluZyB0byAncG9zaXRpb24nIGFyZ3VtZW50XG4gICAgICogcG9zaXRpb24gPSAnYmVmb3JlJyAtIGNoaWxkIHdpbGwgYmUgYWRkZWQgYmVmb3JlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKiBwb3NpdGlvbiA9ICdhZnRlcicgLSBjaGlsZCB3aWxsIGJlIGFkZGVkIGFmdGVyIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiBzdHJpbmdcbiAgICAgKi9cbiAgICB2YXIgYWRkQmVmb3JlQWZ0ZXJDaGlsZCA9IGZ1bmN0aW9uKHBhcmVudCwgdGl0bGUsIGl0ZW0sIHBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcG9zaXRpb24gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIGlzIHJlcXVpcmVkLCB2YWx1ZXM6IFxcJ2JlZm9yZVxcJyBvciBcXCdhZnRlclxcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwb3NpdGlvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgbXVzdCBiZSBvZiBzdHJpbmcgdHlwZSwgdmFsdWVzOiBcXCdiZWZvcmVcXCcgb3IgXFwnYWZ0ZXJcXCcnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgIHZhciBmb3VuZEZsYWcgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBjaGlsZHJlbiA9IGdldENoaWxkcmVuKHBhcmVudCk7XG5cbiAgICAgICAgICAgIGlmIChjaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BhcmVudDogXFwnJyArIHBhcmVudCArICdcXCcgaGF2ZSBubyBjaGlsZHJlbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXy5mb3JFYWNoKGNoaWxkcmVuLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUudGl0bGUgPT09IHRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kRmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gJ2JlZm9yZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLnNwbGljZShpbmRleCwgMCwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdhZnRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLnNwbGljZShpbmRleCArIDEsIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChmb3VuZEZsYWcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaGlsZDogXFwnJyArIHRpdGxlICsgJ1xcJyBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGVsZW1lbnQgdG8gdGhlIGVuZCBvZiBtZW51XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50IHRvIHRoZSBtZW51IGFzIGZpcnN0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkRmlyc3Q6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChjaGVja1N0cnVjdHVyZShpdGVtKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zLnVuc2hpZnQoaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGVsZW1lbnQgJ2l0ZW0nIHRvIHRoZSBtZW51IGJlZm9yZSBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRCZWZvcmU6IGZ1bmN0aW9uKHRpdGxlLCBpdGVtKSB7XG4gICAgICAgICAgICBhZGRCZWZvcmVBZnRlcih0aXRsZSwgaXRlbSwgJ2JlZm9yZScpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50ICdpdGVtJyB0byB0aGUgbWVudSBhZnRlciBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIG5ld0l0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRBZnRlcjogZnVuY3Rpb24odGl0bGUsIG5ld0l0ZW0pIHtcbiAgICAgICAgICAgIGFkZEJlZm9yZUFmdGVyKHRpdGxlLCBuZXdJdGVtLCAnYWZ0ZXInKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgY2hpbGQgbGluayBhcyBmaXJzdCB0byB0aGUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3BhcmVudCcgYXJndW1lbnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRGaXJzdENoaWxkOiBmdW5jdGlvbihwYXJlbnQsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZENoaWxkKHBhcmVudCwgaXRlbSwgdHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGNoaWxkIGxpbmsgYXMgbGFzdCB0byB0aGUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3BhcmVudCcgYXJndW1lbnRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRMYXN0Q2hpbGQ6IGZ1bmN0aW9uKHBhcmVudCwgaXRlbSkge1xuICAgICAgICAgICAgYWRkQ2hpbGQocGFyZW50LCBpdGVtLCBmYWxzZSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGxpbmsgdG8gdGhlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICdwYXJlbnQnIGJlZm9yZSBjaGlsZCBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRCZWZvcmVDaGlsZDogZnVuY3Rpb24ocGFyZW50LCB0aXRsZSwgaXRlbSkge1xuICAgICAgICAgICAgYWRkQmVmb3JlQWZ0ZXJDaGlsZChwYXJlbnQsIHRpdGxlLCBpdGVtLCAnYmVmb3JlJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGxpbmsgdG8gdGhlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICdwYXJlbnQnIGFmdGVyIGNoaWxkIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHBhcmVudCBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZEFmdGVyQ2hpbGQ6IGZ1bmN0aW9uKHBhcmVudCwgdGl0bGUsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZEJlZm9yZUFmdGVyQ2hpbGQocGFyZW50LCB0aXRsZSwgaXRlbSwgJ2FmdGVyJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiByZXR1cm4gaXRlbXMgZnJvbSBtZW51XG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgICAgICovXG4gICAgICAgIGdldEl0ZW1zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGV4cG9ydHMgbGlua3MgdG8gJ2Ryb3Bkb3duJyBtZW51XG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgICAgICovXG4gICAgICAgIGV4cG9ydFRvRHJvcGRvd25NZW51OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgICAgICB2YXIgbmV3SXRlbSA9IHt9O1xuICAgICAgICAgICAgXy5mb3JFYWNoKGl0ZW1zLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIF8uZm9ySW4odmFsdWUsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gJ3RpdGxlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS50ZXh0ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChuZXdJdGVtKTtcbiAgICAgICAgICAgICAgICBuZXdJdGVtID0ge307XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICB9XG4gICAgfTtcbn1cbm1vZHVsZS5leHBvcnRzID0gTmF2aWdhdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU2V0dGluZ3NDdHJsKCRzY29wZSwgVXRpbHMsIFNldHRpbmdzUmVwb3NpdG9yeSwgY2F0ZWdvcmllcywgc2V0dGluZ3MpIHtcblxuICAgIC8vIGZpZWxkcyB0aGF0IHdpbGwgdXNlIG51bWJlciB0eXBlIGlucHV0XG4gICAgJHNjb3BlLm51bWVyaWNGaWVsZHMgPSBbJ2RlZmF1bHRQYWdlU2l6ZScsICdzZW9EZXNjTGVuZ3RoJ107XG5cbiAgICAvLyBvcHRpb24gY2F0ZWdvcnlcbiAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5rZXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5jYXRlZ29yeUtleSA9IFV0aWxzLiRzdGF0ZVBhcmFtcy5rZXk7XG4gICAgfVxuXG4gICAgLy8gbGFuZyBjb2RlIGV4aXN0c1xuICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLmxhbmdDb2RlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubGFuZ0NvZGUgPSBVdGlscy4kc3RhdGVQYXJhbXMubGFuZ0NvZGU7XG4gICAgfVxuXG4gICAgLy8gY2F0ZWdvcmllcyBleGlzdHNcbiAgICBpZiAodHlwZW9mIGNhdGVnb3JpZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5jYXRlZ29yaWVzID0gU2V0dGluZ3NSZXBvc2l0b3J5LmNsZWFuKGNhdGVnb3JpZXMpOyAvLyBvcHRpb25zIGNhdGVnb3JpZXNcbiAgICB9XG5cbiAgICAvLyBzZXR0aW5ncyBleGlzdHNcbiAgICBpZiAodHlwZW9mIHNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUuc2V0dGluZ3MgPSBTZXR0aW5nc1JlcG9zaXRvcnkuY2xlYW4oc2V0dGluZ3MpOyAvLyBjYXRlZ29yeSBzZXR0aW5nc1xuICAgIH1cblxuICAgIC8vIHdlIG5lZWQgaW50ZWdlciB2YWx1ZXMgZm9yIG51bWJlciB0eXBlIGlucHV0c1xuICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUubnVtZXJpY0ZpZWxkcywgZnVuY3Rpb24ocHJvcGVydHlOYW1lKXtcbiAgICAgICAgaWYgKCRzY29wZS5zZXR0aW5ncy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnNldHRpbmdzW3Byb3BlcnR5TmFtZV0sIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2V0dGluZ3NbcHJvcGVydHlOYW1lXVtrXSA9IHBhcnNlSW50KHYpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIHNhdmUgc2V0dGluZ3MgY2F0ZWdvcnkgb3B0aW9uc1xuICAgICRzY29wZS5zYXZlID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICAvLyBwcmVwYXJlIG9wdGlvbiBkYXRhXG4gICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBzYXZlIG9wdGlvblxuICAgICAgICBTZXR0aW5nc1JlcG9zaXRvcnkudXBkYXRlKCRzY29wZS5jYXRlZ29yeUtleSwgZGF0YSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnVEhFX0NIQU5HRVNfSEFWRV9CRUVOX1NBVkVEJyk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cblNldHRpbmdzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnU2V0dGluZ3NSZXBvc2l0b3J5JywgJ2NhdGVnb3JpZXMnLCAnc2V0dGluZ3MnXTtcbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ3NDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTZXR0aW5nQ29weUN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBTZXR0aW5nc1JlcG9zaXRvcnkpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9zZXR0aW5ncy9kaXJlY3RpdmVzLyc7XG4gICAgLy8gQ29weSBtb2RhbFxuICAgIHZtLmNvcHlNb2RhbCA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGluaXRpYXRlcyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSB0cmFuc2xhdGFibGUgdGl0bGUgb2YgbW9kYWxcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2UgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdzZXR0aW5nQ29weU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBhdHRycyBhdHRyaWJ1dGVzIGZyb20gZGlyZWN0aXZlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5hdHRycyA9IGF0dHJzO1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ09QVElPTlNfTEFORy5DT1BZX09QVElPTl9RVUVTVElPTicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFwcGx5IHNldHRpbmcgdmFsdWUgdG8gb3RoZXIgbGFuZ3VhZ2VzIGFuZCBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgUFVUIGFjdGlvbiBmb3Igb3B0aW9uIHZhbHVlXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBzYXZlU2V0dGluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9uIGRhdGFcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGtleTogdm0uYXR0cnMub3B0aW9uS2V5LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBhbmd1bGFyLmZyb21Kc29uKHZtLmF0dHJzLm9wdGlvblZhbHVlKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gc2V0IG9wdGlvbiB2YWx1ZSB0byBhbGwgb3RoZXIgbGFuZ3VhZ2VzXG4gICAgICAgICAgICBfLmZvckVhY2goZGF0YS52YWx1ZSwgZnVuY3Rpb24obiwga2V5KSB7XG4gICAgICAgICAgICAgICAgZGF0YS52YWx1ZVtrZXldID0gdm0uYXR0cnMub3B0aW9uTmV3VmFsdWU7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gc2F2ZSBvcHRpb25cbiAgICAgICAgICAgIFNldHRpbmdzUmVwb3NpdG9yeS51cGRhdGUodm0uYXR0cnMuY2F0ZWdvcnlLZXksIGRhdGEpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdPUFRJT05TX0xBTkcuQ09QWV9DT05GSVJNJyk7XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLnJlbG9hZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuU2V0dGluZ0NvcHlDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICckbW9kYWwnLCAnU2V0dGluZ3NSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdDb3B5Q3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU2V0dGluZ0NvcHlCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6ICc9JyxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1NldHRpbmdDb3B5Q3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBTZXR0aW5nQ29weUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgU2V0dGluZ0NvcHlDdHJsLmNvcHlNb2RhbC5zaG93TW9kYWwoYXR0cnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5TZXR0aW5nQ29weUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdDb3B5QnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4uc2V0dGluZ3MnLCBbXSlcbiAgICAuY29uZmlnKFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgICAgICdSZXN0YW5ndWxhclByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgUmVzdGFuZ3VsYXJQcm92aWRlcikge1xuXG4gICAgICAgICAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3Mvc2V0dGluZ3MvJztcblxuICAgICAgICAgICAgLy8gTm93IHNldCB1cCB0aGUgc3RhdGVzXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnc2V0dGluZ3MnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9zZXR0aW5ncy97a2V5fScsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdpbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1NldHRpbmdzQ3RybCcsXG4gICAgICAgICAgICAgICAgICAgIGRlZXBTdGF0ZVJlZGlyZWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NldHRpbmdzUmVwb3NpdG9yeScsIGZ1bmN0aW9uKFNldHRpbmdzUmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgdHJlZSBvZiBhbGwgY2F0ZWdvcmllc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gU2V0dGluZ3NSZXBvc2l0b3J5Lmxpc3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJywgJ1NldHRpbmdzUmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgU2V0dGluZ3NSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBTZXR0aW5nc1JlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5rZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gU0VUVElOR1MgU0hPV1xuICAgICAgICAgICAgICAgIC5zdGF0ZSgnc2V0dGluZ3Muc2hvdycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tsYW5nQ29kZX0nLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnRUYWInOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3Nob3cuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1NldHRpbmdzQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSlcbiAgICAuY29udHJvbGxlcignU2V0dGluZ3NDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9TZXR0aW5nc0N0cmwnKSlcbiAgICAuY29udHJvbGxlcignU2V0dGluZ0NvcHlDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL1NldHRpbmdDb3B5Q3RybCcpKVxuICAgIC5kaXJlY3RpdmUoJ3NldHRpbmdDb3B5QnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL1NldHRpbmdDb3B5QnV0dG9uLmpzJykpXG4gICAgLmZhY3RvcnkoJ1NldHRpbmdzUmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvU2V0dGluZ3NSZXBvc2l0b3J5LmpzJykpXG4gICAgLnJ1bihbXG4gICAgICAgICdOYXZCYXInLFxuICAgICAgICBmdW5jdGlvbihOYXZCYXIpIHtcbiAgICAgICAgICAgIE5hdkJhci5hZGQoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAnU0VUVElOR1MnLCBhY3Rpb246ICdzZXR0aW5ncycsIGljb246ICdmYSBmYS1jb2dzJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU2V0dGluZ3NSZXBvc2l0b3J5KFJlc3Rhbmd1bGFyKSB7XG4gICAgdmFyIGFwaSA9ICdhZG1pbi9vcHRpb25zJztcbiAgICB2YXIgb3B0aW9uID0gUmVzdGFuZ3VsYXIuYWxsKGFwaSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmdldChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0OiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRpb24uZ2V0TGlzdChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBjbGVhbjogZnVuY3Rpb24oZWxlbSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLnN0cmlwUmVzdGFuZ3VsYXIoZWxlbSk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGV0ZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkucmVtb3ZlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24oY2F0ZWdvcnlLZXksIGRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBjYXRlZ29yeUtleSkuY3VzdG9tUFVUKGRhdGEpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuU2V0dGluZ3NSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzUmVwb3NpdG9yeTtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJEZXRhaWxzQ3RybCgkc2NvcGUsIFV0aWxzLCBVc2VyUmVwb3NpdG9yeSkge1xuICAgIC8vIGdldCBzaW5nbGUgdXNlclxuICAgIFVzZXJSZXBvc2l0b3J5Lm9uZShVdGlscy4kc3RhdGVQYXJhbXMudXNlcklkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICRzY29wZS51c2VyID0gVXNlclJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpO1xuICAgIH0pO1xufVxuVXNlckRldGFpbHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdVc2VyUmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBVc2VyRGV0YWlsc0N0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyRGV0YWlsc0N0cmwoJHNjb3BlLCBVc2VyUmVwb3NpdG9yeSwgVXRpbHMpIHtcbiAgICAvLyBnZXQgc2luZ2xlIHVzZXJcbiAgICBVc2VyUmVwb3NpdG9yeS5vbmUoVXRpbHMuJHN0YXRlUGFyYW1zLnVzZXJJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAkc2NvcGUudXNlciA9IFVzZXJSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zYXZlVXNlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBVc2VyUmVwb3NpdG9yeS51cGRhdGUoJHNjb3BlLnVzZXIuaWQsICRzY29wZS51c2VyKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ3VzZXIubGlzdCcpO1xuICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdUSEVfQ0hBTkdFU19IQVZFX0JFRU5fU0FWRUQnKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufVxuVXNlckRldGFpbHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVc2VyUmVwb3NpdG9yeScsICdVdGlscyddO1xubW9kdWxlLmV4cG9ydHMgPSBVc2VyRGV0YWlsc0N0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyTGlzdEN0cmwoJHNjb3BlLCBVdGlscywgVXNlclJlcG9zaXRvcnksIE5nVGFibGVQYXJhbXMpIHtcbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ2lkJzogJ2Rlc2MnIC8vIGluaXRpYWwgc29ydGluZ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgICRzY29wZS5yZXF1ZXN0UGVuZGluZyA9IHRydWU7XG4gICAgICAgICAgICAvLyBwcmVwYXJlIG9wdGlvbnMgdG8gYmUgc2VudCB0byBhcGlcbiAgICAgICAgICAgIHZhciBxdWVyeU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3VzZXInXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBwYXJhbXMuY291bnQoKSAtIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSBkZWNsYXJlZCBpbiB2aWV3XG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5jb3VudChVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBlclBhZ2UgPSBwYXJhbXMuY291bnQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyYW1zLnBhZ2UoKSAtIGN1cnJlbnQgcGFnZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucGFnZShVdGlscy4kc3RhdGVQYXJhbXMucGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBhZ2UgPSBwYXJhbXMucGFnZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0YWJsZVBhcmFtcy5vcmRlckJ5KCkgLSBhbiBhcnJheSBvZiBzdHJpbmcgaW5kaWNhdGluZyBib3RoIHRoZSBzb3J0aW5nIGNvbHVtbiBhbmQgZGlyZWN0aW9uIChlLmcuIFtcIituYW1lXCIsIFwiLWVtYWlsXCJdKVxuICAgICAgICAgICAgaWYgKHBhcmFtcy5zb3J0aW5nKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IGludGVyZXN0ZWQgaW4gZmlyc3Qgc29ydCBjb2x1bW4gZm9yIG5vd1xuICAgICAgICAgICAgICAgIHZhciBvcmRlckJ5ID0gcGFyYW1zLm9yZGVyQnkoKVswXTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMuc29ydCA9IG9yZGVyQnlbMF0gPT09ICcrJyA/IG9yZGVyQnkuc3Vic3RyaW5nKDEpIDogb3JkZXJCeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZ2V0IGxpc3QgYnkgZGVmYXVsdFxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBVc2VyUmVwb3NpdG9yeS5saXN0KHF1ZXJ5T3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIFByb21pc2UgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlcXVlc3RQZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKFVzZXJSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS51c2VyTGlzdEFjdGlvbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdWSUVXJyxcbiAgICAgICAgICAgIHVybDogJ3VzZXIuc2hvdyh7IHVzZXJJZDogcmVjb3JkX2lkIH0pJyxcbiAgICAgICAgICAgIGljb246ICdmYSBmYS1zZWFyY2gnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdFRElUJyxcbiAgICAgICAgICAgIGhyZWY6ICd1c2VyLmVkaXQoeyB1c2VySWQ6IHJlY29yZF9pZCB9KScsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtcGVuY2lsJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiAnREVMRVRFJyxcbiAgICAgICAgICAgIGNsaWNrOiAnZGVsZXRlJywgLy8gdGhpcyB3aWxsIGJlIHJlcGxhY2VkIHdpdGggZGVsZXRlIGFjdGlvblxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLXRpbWVzJ1xuICAgICAgICB9XG4gICAgXTtcbn1cblxuVXNlckxpc3RDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdVc2VyUmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJMaXN0Q3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJMaXN0Q3RybCgkc2NvcGUsIFV0aWxzLCBVc2VyUmVwb3NpdG9yeSwgJG1vZGFsKSB7XG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvdXNlci9kaXJlY3RpdmVzLyc7XG4gICAgXG4gICAgLy8gRGVsZXRlIG1vZGFsXG4gICAgdm0uZGVsZXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAndXNlckRlbGV0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBCaW5kIGhvdGtleXNcbiAgICAgICAgICAgIFV0aWxzLmhvdGtleXMuYWRkKHtcbiAgICAgICAgICAgICAgICBjb21ibzogJ2VudGVyJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NPTkZJUk1fREVMRVRFJyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZGVsZXRlVXNlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSB1c2VySWQgY29udGVudCBpZCB0byBiZSByZW1vdmVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24odXNlcklkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS51c2VySWQgPSB1c2VySWQ7XG4gICAgICAgICAgICBpZiAodXNlcklkICE9PSBVdGlscy5Db25maWcuY3VycmVudFVzZXJJZCkge1xuICAgICAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdERUxFVEVfVVNFUl9RVUVTVElPTicpO1xuICAgICAgICAgICAgICAgIFV0aWxzLmhvdGtleXMuZGVsKCdlbnRlcicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvL1lvdSBjYW4gbm90IGRlbGV0ZSB5b3VyIG93biBhY2NvdW50IVxuICAgICAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ0RFTEVURV9TRUxGX1VTRVJfRVJST1InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgdXNlciBpZCBpbiBzY29wZVxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgZGVsZXRlVXNlcjogZnVuY3Rpb24odXNlcklkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBVc2VyUmVwb3NpdG9yeS5kZWxldGUodm0udXNlcklkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKFV0aWxzLiRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Vc2VyTGlzdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ1VzZXJSZXBvc2l0b3J5JywgJyRtb2RhbCddO1xubW9kdWxlLmV4cG9ydHMgPSBVc2VyTGlzdEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJBY3Rpb25zRHJvcGRvd24oJGRyb3Bkb3duKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHt1c2VyQWN0aW9uc0Ryb3Bkb3duOiAnPScsIHJlY29yZDogJz0nfSxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJEZWxldGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIFVzZXJEZWxldGVDdHJsKSB7XG4gICAgICAgICAgICB2YXIgZHJvcGRvd24gPSAkZHJvcGRvd24oZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZ3plcm8vYWRtaW4vdmlld3MvdXNlci9kaXJlY3RpdmVzL3VzZXJBY3Rpb25zRHJvcGRvd24udHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbjogJ2FtLWZsaXAteCcsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnYm90dG9tLXJpZ2h0J1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBiZXR0ZXIgcGFyYW1zIHJlcGxhY2VtZW50IGFuZCBmdW5jdGlvbnMgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICBfLm1hcFZhbHVlcyhzY29wZS51c2VyQWN0aW9uc0Ryb3Bkb3duLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbi51cmwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmQgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuLnVybC5pbmRleE9mKCdyZWNvcmRfaWQnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuLnVybCA9IG4udXJsLnJlcGxhY2UoJ3JlY29yZF9pZCcsIHNjb3BlLnJlY29yZC5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG4uaHJlZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlY29yZCBpZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG4uaHJlZi5pbmRleE9mKCdyZWNvcmRfaWQnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuLmhyZWYgPSBuLmhyZWYucmVwbGFjZSgncmVjb3JkX2lkJywgc2NvcGUucmVjb3JkLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS51c2VyID0gc2NvcGUudXNlckFjdGlvbnNEcm9wZG93bjtcbiAgICAgICAgICAgICAgICBkcm9wZG93bi4kc2NvcGUucmVjb3JkID0gc2NvcGUucmVjb3JkOyAvLyBQYXNzIHVzZXIgaWQgdG8gdGhlIHZpZXdcbiAgICAgICAgICAgICAgICBkcm9wZG93bi4kc2NvcGUuZGVsZXRlTW9kYWwgPSBVc2VyRGVsZXRlQ3RybC5kZWxldGVNb2RhbDsgLy8gUGFzcyBkZWxldGUgYWN0aW9uIHRvIHRoZSB2aWV3XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblVzZXJBY3Rpb25zRHJvcGRvd24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBVc2VyQWN0aW9uc0Ryb3Bkb3duO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlckRlbGV0ZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdXNlcklkOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1VzZXJEZWxldGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIFVzZXJEZWxldGVDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgYSBkZWxldGUgbW9kYWwgZnJvbSBhIGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICBVc2VyRGVsZXRlQ29udHJvbGxlci5kZWxldGVNb2RhbC5zaG93TW9kYWwoc2NvcGUudXNlcklkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuVXNlckRlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJEZWxldGVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhZG1pbi51c2VyJywgWyduZ1RhYmxlJ10pXG4gICAgLmNvbmZpZyhbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgICckdXJsUm91dGVyUHJvdmlkZXInLFxuICAgICAgICAnUmVzdGFuZ3VsYXJQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsIFJlc3Rhbmd1bGFyUHJvdmlkZXIpIHtcblxuICAgICAgICAgICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL3VzZXIvJztcblxuICAgICAgICAgICAgLy8gTm93IHNldCB1cCB0aGUgc3RhdGVzXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgIC5zdGF0ZSgndXNlcicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3VzZXInLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnaW5kZXguaHRtbCdcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgndXNlci5zaG93Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve3VzZXJJZH0vc2hvdycsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVXNlckRldGFpbHNDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuc3RhdGUoJ3VzZXIuZWRpdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3t1c2VySWR9L2VkaXQnLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2VkaXQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1VzZXJFZGl0Q3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCd1c2VyLmxpc3QnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9saXN0P3BhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnbGlzdC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmNvbnRyb2xsZXIoJ1VzZXJMaXN0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvVXNlckxpc3RDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ1VzZXJEZWxldGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL1VzZXJEZWxldGVDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ1VzZXJFZGl0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvVXNlckVkaXRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ1VzZXJEZXRhaWxzQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvVXNlckRldGFpbHNDdHJsJykpXG4gICAgLmZhY3RvcnkoJ1VzZXJSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9Vc2VyUmVwb3NpdG9yeS5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ3VzZXJEZWxldGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvVXNlckRlbGV0ZUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ3VzZXJBY3Rpb25zRHJvcGRvd24nLCBbJyRkcm9wZG93bicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Vc2VyQWN0aW9uc0Ryb3Bkb3duLmpzJyldKVxuICAgIC5ydW4oW1xuICAgICAgICAnTmF2QmFyJyxcbiAgICAgICAgZnVuY3Rpb24oTmF2QmFyKSB7XG4gICAgICAgICAgICBOYXZCYXIuYWRkKHtcbiAgICAgICAgICAgICAgICB0aXRsZTogJ1VTRVJTJywgYWN0aW9uOiAndXNlci5saXN0JywgaWNvbjogJ2ZhIGZhLXVzZXInXG4gICAgICAgICAgICAgICAgLy9jaGlsZHJlbjogW1xuICAgICAgICAgICAgICAgIC8vICAgIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgdGl0bGU6ICdVU0VSX0xJU1QnLFxuICAgICAgICAgICAgICAgIC8vICAgICAgICBhY3Rpb246ICd1c2VyLmxpc3QnLFxuICAgICAgICAgICAgICAgIC8vICAgICAgICBpY29uOiAnZmEgZmEtdGgnXG4gICAgICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgICAgIC8vXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJSZXBvc2l0b3J5KFJlc3Rhbmd1bGFyKSB7XG4gICAgdmFyIGFwaSA9ICdhZG1pbi91c2Vycyc7XG4gICAgdmFyIHVzZXJzID0gUmVzdGFuZ3VsYXIuYWxsKGFwaSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmdldChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICB0cmVlOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpKS5nZXRMaXN0KCd0cmVlJywgcGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGlzdDogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gdXNlcnMuZ2V0TGlzdChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBjbGVhbjogZnVuY3Rpb24oZWxlbSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLnN0cmlwUmVzdGFuZ3VsYXIoZWxlbSk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGV0ZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkucmVtb3ZlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24oaWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuY3VzdG9tUFVUKHVzZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuVXNlclJlcG9zaXRvcnkuJGluamVjdCA9IFsnUmVzdGFuZ3VsYXInXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlclJlcG9zaXRvcnk7XG4iXX0=
