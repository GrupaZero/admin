(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"_process":5,"base64-js":2,"buffer":1,"ieee754":3,"is-array":4}],2:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],3:[function(require,module,exports){
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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../../node_modules/browserify/node_modules/buffer/node_modules/ieee754")

},{"_process":5,"buffer":1}],4:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],5:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

require('./core/module.js');
require('./content/module.js');
require('./user/module.js');

var dependencies = [
    'restangular',
    'ui.router',
    'ui.router.default',
    'ct.ui.router.extras',
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

        //User more secure variant sanitize strategy for escaping;
        $translateProvider.useSanitizeValueStrategy('escape');

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

},{"./content/module.js":27,"./core/module.js":32,"./user/module.js":46,"_process":5,"buffer":1}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentAddCtrl($scope, Utils, listParent, ContentRepository) {
    var parentId = null;
    $scope.contentType = Utils.$stateParams.type;
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
            langCode: $scope.listLang.code
        }
    };

    // Angular strap dropdown for save button
    $scope.contentSaveButtonLinks = [
        {
            text: 'SAVE_AND_CONTINUE_EDITING',
            click: 'addNewContent(newContent, "content.edit.details")'
        },
        {
            divider: true
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
            var route = _.pluck(_.filter($scope.listParent.route.translations, 'lang', newContent.translations.langCode), 'url');
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

},{"_process":5,"buffer":1}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentAddTranslationCtrl($scope, Utils, PreviousState, ContentRepository) {
    $scope.showTeaser = false;
    // default translations lang code
    $scope.newContentTranslation = {
        contentId: Utils.$stateParams.contentId,
        langCode: Utils.$stateParams.langCode
    };
    // contents POST action
    $scope.addnewContentTranslation = function addNewContent(newContentTranslation) {
        ContentRepository.newContentTranslation(Utils.$stateParams.contentId, newContentTranslation).then(function(response) {
            if (PreviousState.url.length > 0) {
                // redirected back to the state we came from
                Utils.$state.go(PreviousState.name, PreviousState.params, {reload: true});
            } else {
                // otherwise go to content list
                Utils.$state.go('content.list', {}, {reload: true});
            }
        });
    };
}
ContentAddTranslationCtrl.$inject = ['$scope', 'Utils', 'PreviousState', 'ContentRepository'];
module.exports = ContentAddTranslationCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentAddTranslationCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":1}],9:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDashboardCtrl($scope) {

}
ContentDashboardCtrl.$inject = ['$scope'];
module.exports = ContentDashboardCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDashboardCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":1}],11:[function(require,module,exports){
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
                Utils.Notifications.addSuccess('SAVED');
            });
    };

}
ContentDetailsCtrl.$inject = ['$scope', 'content', 'langCode', 'ContentRepository', 'Utils'];
module.exports = ContentDetailsCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDetailsCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":1}],12:[function(require,module,exports){
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
     * Return translation with specified lang property from translations array
     * and fetch lang property
     *
     * @param translations Translations array
     * @param langCode language code
     * @returns Object
     */
    function getTranslationByLang(translations, langCode) {
        var translation = translations.shift();

        if (translation.lang === langCode) {
            translation.langCode = translation.lang; // Couse we change name of this property in ContentTranslationTransformer
            return translation;
        } else {
            return getTranslationByLang(translations, langCode);
        }
    }

    /**
     * Currently active translation object
     *
     * @type Object
     */
    $scope.activeTranslation = getTranslationByLang((content.translations.slice(0)), langCode);

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
            Utils.Notifications.addSuccess('SUCCESS');
        });
    };

}
ContentDetailsEditCtrl.$inject = ['$scope', 'Utils', 'content', 'langCode', 'ContentRepository'];
module.exports = ContentDetailsEditCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/ContentDetailsEditCtrl.js","/src/content/controllers")

},{"_process":5,"buffer":1}],13:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],14:[function(require,module,exports){
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

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
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

},{"_process":5,"buffer":1}],15:[function(require,module,exports){
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
            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.listLang.code
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

},{"_process":5,"buffer":1}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentDeleteCtrl($scope, Utils, $modal, Storage, ContentRepository, Notifications) { // jshint ignore:line
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
            ContentRepository.deleteContent(vm.contentId, vm.forceDelete).then(function() {
                self.closeModal();
                // refresh current state
                if (vm.contentType === 'category') {
                    // removed category
                    Storage.removeStorageItem('contentListParent');
                    Utils.$state.go('content.list', {contentId: null}, {reload: true, inherit: false});
                    Notifications.addSuccess('CATEGORY_HAS_BEEN_DELETED');
                } else {
                    // removed content
                    if (Utils.$state.$current.name === 'content.show.details') {
                        Utils.$state.go('content.list', {contentId: null}, {reload: true, inherit: false});
                    } else {
                        Utils.$state.go(Utils.$state.current, {}, {reload: true});
                    }
                    Notifications.addSuccess(
                        vm.forceDelete ? 'CONTENT_HAS_BEEN_DELETED' : 'CONTENT_HAS_BEEN_MOVED_TO_TRASH'
                    );
                }
            });
        }
    };
}
ContentDeleteCtrl.$inject = ['$scope', 'Utils', '$modal', 'Storage', 'ContentRepository', 'Notifications'];
module.exports = ContentDeleteCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentDeleteCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":1}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function ContentRestoreCtrl($scope, Utils, $modal, ContentRepository, Notifications) {
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
                Notifications.addSuccess('CONTENT_HAS_BEEN_RESTORED');
            });
        }
    };
}
ContentRestoreCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository', 'Notifications'];
module.exports = ContentRestoreCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentRestoreCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":1}],18:[function(require,module,exports){
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
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
            });

        }
    };
}
ContentRouteCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = ContentRouteCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/ContentRouteCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":1}],19:[function(require,module,exports){
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
                translation.langCode = translation.lang; // Couse we change name of this property in ContentTranslationTransformer
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
                Utils.Notifications.addSuccess('SUCCESS');
                Utils.$state.reload();
                self.closeModal();
            });
        }
    };
}
SetTranslationAsActiveCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = SetTranslationAsActiveCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/SetTranslationAsActiveCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":1}],20:[function(require,module,exports){
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
                Utils.Notifications.addSuccess('CONTENT_HAS_BEEN_DELETED');
                Utils.$state.reload();
            });
        }
    };
}
DeleteTranslationCtrl.$inject = ['$scope', 'Utils', '$modal', 'ContentRepository'];
module.exports = DeleteTranslationCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/content/controllers/directives/TranslationDeleteCtrl.js","/src/content/controllers/directives")

},{"_process":5,"buffer":1}],21:[function(require,module,exports){
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
                templateUrl: 'gzero/admin/views/content/directives/ContentActionsDropdown.tpl.html',
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

},{"_process":5,"buffer":1}],22:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],23:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],24:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],25:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],26:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],27:[function(require,module,exports){
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
                        editMode: true // enter edit mode
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
                        },
                        'contentSettings': {
                            templateUrl: viewPath + 'details/settingsEdit.html'
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
                .state('content.edit.history', {
                    url: '/history',
                    views: {
                        'contentTab': {
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
                // CONTENT ADD TRANSLATION
                .state('content.addTranslation', {
                    url: '/{contentId}/add-translation/{langCode}',
                    resolve: {
                        PreviousState: [
                            '$state', function($state) {
                                return {
                                    name: $state.current.name,
                                    params: $state.params,
                                    url: $state.href($state.current.name, $state.params)
                                };
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
    .controller('ContentListCtrl', require('./controllers/ContentListCtrl'))
    .controller('ContentTrashcanCtrl', require('./controllers/ContentTrashcanCtrl'))
    .controller('ContentAddTranslationCtrl', require('./controllers/ContentAddTranslationCtrl'))
    .controller('ContentRouteCtrl', require('./controllers/directives/ContentRouteCtrl'))
    .controller('SetTranslationAsActiveCtrl', require('./controllers/directives/SetTranslationAsActiveCtrl'))
    .controller('TranslationDeleteCtrl', require('./controllers/directives/TranslationDeleteCtrl'))
    .factory('ContentRepository', require('./services/ContentRepository.js'))
    .directive('contentDeleteButton', require('./directives/ContentDeleteButton.js'))
    .directive('contentRestoreButton', require('./directives/ContentRestoreButton.js'))
    .directive('contentEditRouteButton', require('./directives/ContentEditRouteButton.js'))
    .directive('setTranslationAsActiveButton', require('./directives/SetTranslationAsActiveButton.js'))
    .directive('translationDeleteButton', require('./directives/TranslationDeleteButton.js'))
    .directive('contentActionsDropdown', ['$dropdown', require('./directives/ContentActionsDropdown.js')])
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

},{"./controllers/ContentAddCtrl":7,"./controllers/ContentAddTranslationCtrl":8,"./controllers/ContentCategoryTreeCtrl":9,"./controllers/ContentDashboardCtrl":10,"./controllers/ContentDetailsCtrl":11,"./controllers/ContentDetailsEditCtrl":12,"./controllers/ContentHistoryCtrl":13,"./controllers/ContentListCtrl":14,"./controllers/ContentTrashcanCtrl":15,"./controllers/directives/ContentDeleteCtrl":16,"./controllers/directives/ContentRestoreCtrl":17,"./controllers/directives/ContentRouteCtrl":18,"./controllers/directives/SetTranslationAsActiveCtrl":19,"./controllers/directives/TranslationDeleteCtrl":20,"./directives/ContentActionsDropdown.js":21,"./directives/ContentDeleteButton.js":22,"./directives/ContentEditRouteButton.js":23,"./directives/ContentRestoreButton.js":24,"./directives/SetTranslationAsActiveButton.js":25,"./directives/TranslationDeleteButton.js":26,"./services/ContentRepository.js":28,"_process":5,"buffer":1}],28:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],29:[function(require,module,exports){
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

    // check for edit state
    $scope.$on('$stateChangeStart', function(event, toState) {
        if (typeof toState.data !== 'undefined') {
            if(toState.name !== 'content.edit.index'){
                $scope.editStateName = toState.name;
            }
            $scope.editMode = toState.data.editMode;
        } else {
            $scope.editStateName = null;
            $scope.editMode = false;
        }
    });
}

CoreCtrl.$inject = ['$scope', '$state', 'Translations', 'NavBar', 'TopNavBar'];
module.exports = CoreCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/controllers/CoreCtrl.js","/src/core/controllers")

},{"_process":5,"buffer":1}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function StatesDropdown($dropdown) {
    return {
        scope: {statesDropdown: '='},
        restrict: 'A',
        link: function(scope, element, attrs) {
            var dropdown = $dropdown(element, {
                templateUrl: 'gzero/admin/views/core/directives/StatesDropdown.tpl.html',
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

},{"_process":5,"buffer":1}],31:[function(require,module,exports){
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
            str = str.replace(/<\/?[^>]+(>|$)/g, '').substr(0, len);
            str = str.substr(0, Math.min(str.length, str.lastIndexOf(' ')));
            return str;
        };
    });

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/filters/CoreFilters.js","/src/core/filters")

},{"_process":5,"buffer":1}],32:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

require('./filters/CoreFilters.js');

angular.module('admin.core', ['CoreFilters'])
    .controller('CoreCtrl', require('./controllers/CoreCtrl.js'))
    .factory('LangRepository', require('./services/LangRepository.js'))
    .factory('NavBar', require('./services/NavBar.js'))
    .factory('TopNavBar', require('./services/TopNavBar.js'))
    .factory('Notifications', require('../lib/Notifications.js'))
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
                        action: 'user.edit({userId: '+user.id+'})'
                    }
                );
                TopNavBar.addLastChild(
                    user.fullName,
                    {
                        title: 'LOG_OUT',
                        action: false,
                        url: '/admin/logout'
                    }
                );
            });

        }
    ]);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/module.js","/src/core")

},{"../lib/Notifications.js":38,"../lib/Storage.js":39,"./controllers/CoreCtrl.js":29,"./directives/StatesDropdown.js":30,"./filters/CoreFilters.js":31,"./services/LangRepository.js":33,"./services/NavBar.js":34,"./services/TopNavBar.js":35,"./services/Translations.js":36,"./services/Utils.js":37,"_process":5,"buffer":1}],33:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],34:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function NavBar() {
    /** @var Navigation */
    return require('../../lib/navigation.js')();
}

module.$inject = [];
module.exports = NavBar;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/NavBar.js","/src/core/services")

},{"../../lib/navigation.js":40,"_process":5,"buffer":1}],35:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function TopNavBar() {
    /** @var Navigation */
    return require('../../lib/navigation.js')();
}

module.$inject = [];
module.exports = TopNavBar;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/TopNavBar.js","/src/core/services")

},{"../../lib/navigation.js":40,"_process":5,"buffer":1}],36:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],37:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function Utils(Notifications, Storage, $state, $stateParams) {

    return {

        Notifications: Notifications,
        Storage: Storage,
        $state: $state,
        $stateParams: $stateParams,
        Config: Config
    };

}

module.$inject = ['Notifications', 'Storage', '$state', '$stateParams'];
module.exports = Utils;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/core/services/Utils.js","/src/core/services")

},{"_process":5,"buffer":1}],38:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function Notifications($translate) {
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
            return new PNotify({
                title: $translate.instant('INFORMATION') + ':',
                text: $translate.instant(message),
                type: 'info'
            });
        },
        /**
         * Function shows the AngularStrap danger type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         */
        addError: function(message) {
            return new PNotify({
                title: $translate.instant('ERROR') + ':',
                text: $translate.instant(message),
                type: 'error',
                icon: 'fa fa-times'
            });
        },
        /**
         * Function shows the AngularStrap warning type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         */
        addWarning: function(message) {
            return new PNotify({
                title: $translate.instant('WARNING') + ':',
                text: $translate.instant(message),
                type: 'warning'
            });
        },
        /**
         * Function shows the AngularStrap success type alert
         *
         * @param message translatable message string eg. 'COMMON_ERROR'
         */
        addSuccess: function(message) {
            return new PNotify({
                title: $translate.instant('SUCCESS') + ':',
                text: $translate.instant(message),
                type: 'success'
            });
        }
    };
}

module.$inject = ['$translate'];
module.exports = Notifications;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/lib/Notifications.js","/src/lib")

},{"_process":5,"buffer":1}],39:[function(require,module,exports){
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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/lib/Storage.js","/src/lib")

},{"_process":5,"buffer":1}],40:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],41:[function(require,module,exports){
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
                Utils.$state.go(Utils.$state.current, {}, {reload: true});
            });
        }

    };
}

UserListCtrl.$inject = ['$scope', 'Utils', 'UserRepository', '$modal'];
module.exports = UserListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserDeleteCtrl.js","/src/user/controllers")

},{"_process":5,"buffer":1}],42:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],43:[function(require,module,exports){
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

},{"_process":5,"buffer":1}],44:[function(require,module,exports){
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

function UserListCtrl($scope, Utils, $rootScope, UserRepository, NgTableParams) {
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

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(UserRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

UserListCtrl.$inject = ['$scope', 'Utils', '$rootScope', 'UserRepository', 'ngTableParams'];
module.exports = UserListCtrl;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/user/controllers/UserListCtrl.js","/src/user/controllers")

},{"_process":5,"buffer":1}],45:[function(require,module,exports){
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
        scope: true,
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

},{"_process":5,"buffer":1}],46:[function(require,module,exports){
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
                    }

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

},{"./controllers/UserDeleteCtrl":41,"./controllers/UserDetailsCtrl":42,"./controllers/UserEditCtrl":43,"./controllers/UserListCtrl":44,"./directives/UserDeleteButton.js":45,"./services/UserRepository.js":47,"_process":5,"buffer":1}],47:[function(require,module,exports){
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

},{"_process":5,"buffer":1}]},{},[6])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaXMtYXJyYXkvaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2FwcC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRBZGRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL0NvbnRlbnRDYXRlZ29yeVRyZWVDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudERhc2hib2FyZEN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50RGV0YWlsc0N0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9Db250ZW50RGV0YWlsc0VkaXRDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudEhpc3RvcnlDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudExpc3RDdHJsLmpzIiwic3JjL2NvbnRlbnQvY29udHJvbGxlcnMvQ29udGVudFRyYXNoY2FuQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRSZXN0b3JlQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudFJvdXRlQ3RybC5qcyIsInNyYy9jb250ZW50L2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwuanMiLCJzcmMvY29udGVudC9jb250cm9sbGVycy9kaXJlY3RpdmVzL1RyYW5zbGF0aW9uRGVsZXRlQ3RybC5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudEFjdGlvbnNEcm9wZG93bi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudEVkaXRSb3V0ZUJ1dHRvbi5qcyIsInNyYy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudFJlc3RvcmVCdXR0b24uanMiLCJzcmMvY29udGVudC9kaXJlY3RpdmVzL1NldFRyYW5zbGF0aW9uQXNBY3RpdmVCdXR0b24uanMiLCJzcmMvY29udGVudC9kaXJlY3RpdmVzL1RyYW5zbGF0aW9uRGVsZXRlQnV0dG9uLmpzIiwic3JjL2NvbnRlbnQvbW9kdWxlLmpzIiwic3JjL2NvbnRlbnQvc2VydmljZXMvQ29udGVudFJlcG9zaXRvcnkuanMiLCJzcmMvY29yZS9jb250cm9sbGVycy9Db3JlQ3RybC5qcyIsInNyYy9jb3JlL2RpcmVjdGl2ZXMvU3RhdGVzRHJvcGRvd24uanMiLCJzcmMvY29yZS9maWx0ZXJzL0NvcmVGaWx0ZXJzLmpzIiwic3JjL2NvcmUvbW9kdWxlLmpzIiwic3JjL2NvcmUvc2VydmljZXMvTGFuZ1JlcG9zaXRvcnkuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9OYXZCYXIuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9Ub3BOYXZCYXIuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9UcmFuc2xhdGlvbnMuanMiLCJzcmMvY29yZS9zZXJ2aWNlcy9VdGlscy5qcyIsInNyYy9saWIvTm90aWZpY2F0aW9ucy5qcyIsInNyYy9saWIvU3RvcmFnZS5qcyIsInNyYy9saWIvbmF2aWdhdGlvbi5qcyIsInNyYy91c2VyL2NvbnRyb2xsZXJzL1VzZXJEZWxldGVDdHJsLmpzIiwic3JjL3VzZXIvY29udHJvbGxlcnMvVXNlckRldGFpbHNDdHJsLmpzIiwic3JjL3VzZXIvY29udHJvbGxlcnMvVXNlckVkaXRDdHJsLmpzIiwic3JjL3VzZXIvY29udHJvbGxlcnMvVXNlckxpc3RDdHJsLmpzIiwic3JjL3VzZXIvZGlyZWN0aXZlcy9Vc2VyRGVsZXRlQnV0dG9uLmpzIiwic3JjL3VzZXIvbW9kdWxlLmpzIiwic3JjL3VzZXIvc2VydmljZXMvVXNlclJlcG9zaXRvcnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN0NENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDblRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpcy1hcnJheScpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG52YXIga01heExlbmd0aCA9IDB4M2ZmZmZmZmZcbnZhciByb290UGFyZW50ID0ge31cblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAtIEltcGxlbWVudGF0aW9uIG11c3Qgc3VwcG9ydCBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcy5cbiAqICAgRmlyZWZveCA0LTI5IGxhY2tlZCBzdXBwb3J0LCBmaXhlZCBpbiBGaXJlZm94IDMwKy5cbiAqICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cbiAqXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleSB3aWxsXG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCB3aWxsIHdvcmsgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IChmdW5jdGlvbiAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBuZXcgVWludDhBcnJheSgxKS5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChhcmcpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICAvLyBBdm9pZCBnb2luZyB0aHJvdWdoIGFuIEFyZ3VtZW50c0FkYXB0b3JUcmFtcG9saW5lIGluIHRoZSBjb21tb24gY2FzZS5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHJldHVybiBuZXcgQnVmZmVyKGFyZywgYXJndW1lbnRzWzFdKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKGFyZylcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gMFxuICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZFxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gZnJvbU51bWJlcih0aGlzLCBhcmcpXG4gIH1cblxuICAvLyBTbGlnaHRseSBsZXNzIGNvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGlzLCBhcmcsIGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogJ3V0ZjgnKVxuICB9XG5cbiAgLy8gVW51c3VhbC5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhpcywgYXJnKVxufVxuXG5mdW5jdGlvbiBmcm9tTnVtYmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChsZW5ndGgpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIC8vIEFzc3VtcHRpb246IGJ5dGVMZW5ndGgoKSByZXR1cm4gdmFsdWUgaXMgYWx3YXlzIDwga01heExlbmd0aC5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgdGhhdC53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpKSByZXR1cm4gZnJvbUJ1ZmZlcih0aGF0LCBvYmplY3QpXG5cbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkgcmV0dXJuIGZyb21BcnJheSh0aGF0LCBvYmplY3QpXG5cbiAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzdGFydCB3aXRoIG51bWJlciwgYnVmZmVyLCBhcnJheSBvciBzdHJpbmcnKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgb2JqZWN0LmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIGZyb21UeXBlZEFycmF5KHRoYXQsIG9iamVjdClcbiAgfVxuXG4gIGlmIChvYmplY3QubGVuZ3RoKSByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmplY3QpXG5cbiAgcmV0dXJuIGZyb21Kc29uT2JqZWN0KHRoYXQsIG9iamVjdClcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlciAodGhhdCwgYnVmZmVyKSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGJ1ZmZlci5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBidWZmZXIuY29weSh0aGF0LCAwLCAwLCBsZW5ndGgpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIER1cGxpY2F0ZSBvZiBmcm9tQXJyYXkoKSB0byBrZWVwIGZyb21BcnJheSgpIG1vbm9tb3JwaGljLlxuZnVuY3Rpb24gZnJvbVR5cGVkQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIC8vIFRydW5jYXRpbmcgdGhlIGVsZW1lbnRzIGlzIHByb2JhYmx5IG5vdCB3aGF0IHBlb3BsZSBleHBlY3QgZnJvbSB0eXBlZFxuICAvLyBhcnJheXMgd2l0aCBCWVRFU19QRVJfRUxFTUVOVCA+IDEgYnV0IGl0J3MgY29tcGF0aWJsZSB3aXRoIHRoZSBiZWhhdmlvclxuICAvLyBvZiB0aGUgb2xkIEJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEZXNlcmlhbGl6ZSB7IHR5cGU6ICdCdWZmZXInLCBkYXRhOiBbMSwyLDMsLi4uXSB9IGludG8gYSBCdWZmZXIgb2JqZWN0LlxuLy8gUmV0dXJucyBhIHplcm8tbGVuZ3RoIGJ1ZmZlciBmb3IgaW5wdXRzIHRoYXQgZG9uJ3QgY29uZm9ybSB0byB0aGUgc3BlYy5cbmZ1bmN0aW9uIGZyb21Kc29uT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgdmFyIGFycmF5XG4gIHZhciBsZW5ndGggPSAwXG5cbiAgaWYgKG9iamVjdC50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iamVjdC5kYXRhKSkge1xuICAgIGFycmF5ID0gb2JqZWN0LmRhdGFcbiAgICBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIH1cbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gYWxsb2NhdGUgKHRoYXQsIGxlbmd0aCkge1xuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIHRoYXQubGVuZ3RoID0gbGVuZ3RoXG4gICAgdGhhdC5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgZnJvbVBvb2wgPSBsZW5ndGggIT09IDAgJiYgbGVuZ3RoIDw9IEJ1ZmZlci5wb29sU2l6ZSA+Pj4gMVxuICBpZiAoZnJvbVBvb2wpIHRoYXQucGFyZW50ID0gcm9vdFBhcmVudFxuXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBrTWF4TGVuZ3RoYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IGtNYXhMZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xvd0J1ZmZlcikpIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcbiAgZGVsZXRlIGJ1Zi5wYXJlbnRcbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgdmFyIGkgPSAwXG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSBicmVha1xuXG4gICAgKytpXG4gIH1cblxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0IGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycy4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHN0cmluZyA9IFN0cmluZyhzdHJpbmcpXG5cbiAgaWYgKHN0cmluZy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHN0cmluZy5sZW5ndGggKiAyXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoID4+PiAxXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG4vLyBwcmUtc2V0IGZvciB2YWx1ZXMgdGhhdCBtYXkgZXhpc3QgaW4gdGhlIGZ1dHVyZVxuQnVmZmVyLnByb3RvdHlwZS5sZW5ndGggPSB1bmRlZmluZWRcbkJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG5cbi8vIHRvU3RyaW5nKGVuY29kaW5nLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICBzdGFydCA9IHN0YXJ0IHwgMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPT09IEluZmluaXR5ID8gdGhpcy5sZW5ndGggOiBlbmQgfCAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiAwXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSByZXR1cm4gLTEgLy8gc3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcgYWx3YXlzIGZhaWxzXG4gICAgcmV0dXJuIFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldClcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yICh2YXIgaSA9IDA7IGJ5dGVPZmZzZXQgKyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyW2J5dGVPZmZzZXQgKyBpXSA9PT0gdmFsW2ZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4XSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbC5sZW5ndGgpIHJldHVybiBieXRlT2Zmc2V0ICsgZm91bmRJbmRleFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0IChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoIHwgMFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIGlmIChuZXdCdWYubGVuZ3RoKSBuZXdCdWYucGFyZW50ID0gdGhpcy5wYXJlbnQgfHwgdGhpc1xuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYnVmZmVyIG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmIChsZW4gPCAxMDAwIHx8ICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0U3RhcnQpXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uIHRvQXJyYXlCdWZmZXIgKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIF9hdWdtZW50IChhcnIpIHtcbiAgYXJyLmNvbnN0cnVjdG9yID0gQnVmZmVyXG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBzZXQgbWV0aG9kIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5lcXVhbHMgPSBCUC5lcXVhbHNcbiAgYXJyLmNvbXBhcmUgPSBCUC5jb21wYXJlXG4gIGFyci5pbmRleE9mID0gQlAuaW5kZXhPZlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50TEUgPSBCUC5yZWFkVUludExFXG4gIGFyci5yZWFkVUludEJFID0gQlAucmVhZFVJbnRCRVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnRMRSA9IEJQLnJlYWRJbnRMRVxuICBhcnIucmVhZEludEJFID0gQlAucmVhZEludEJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludExFID0gQlAud3JpdGVVSW50TEVcbiAgYXJyLndyaXRlVUludEJFID0gQlAud3JpdGVVSW50QkVcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludExFID0gQlAud3JpdGVJbnRMRVxuICBhcnIud3JpdGVJbnRCRSA9IEJQLndyaXRlSW50QkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS16XFwtXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cbiAgdmFyIGkgPSAwXG5cbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgICAgIGNvZGVQb2ludCA9IGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDAgfCAweDEwMDAwXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcblxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICAgIH1cblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MjAwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsIlxuLyoqXG4gKiBpc0FycmF5XG4gKi9cblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIHRvU3RyaW5nXG4gKi9cblxudmFyIHN0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogV2hldGhlciBvciBub3QgdGhlIGdpdmVuIGB2YWxgXG4gKiBpcyBhbiBhcnJheS5cbiAqXG4gKiBleGFtcGxlOlxuICpcbiAqICAgICAgICBpc0FycmF5KFtdKTtcbiAqICAgICAgICAvLyA+IHRydWVcbiAqICAgICAgICBpc0FycmF5KGFyZ3VtZW50cyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICogICAgICAgIGlzQXJyYXkoJycpO1xuICogICAgICAgIC8vID4gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge21peGVkfSB2YWxcbiAqIEByZXR1cm4ge2Jvb2x9XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5IHx8IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuICEhIHZhbCAmJiAnW29iamVjdCBBcnJheV0nID09IHN0ci5jYWxsKHZhbCk7XG59O1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJy4vY29yZS9tb2R1bGUuanMnKTtcbnJlcXVpcmUoJy4vY29udGVudC9tb2R1bGUuanMnKTtcbnJlcXVpcmUoJy4vdXNlci9tb2R1bGUuanMnKTtcblxudmFyIGRlcGVuZGVuY2llcyA9IFtcbiAgICAncmVzdGFuZ3VsYXInLFxuICAgICd1aS5yb3V0ZXInLFxuICAgICd1aS5yb3V0ZXIuZGVmYXVsdCcsXG4gICAgJ2N0LnVpLnJvdXRlci5leHRyYXMnLFxuICAgICduZ0FuaW1hdGUnLFxuICAgICdtZ2NyZWEubmdTdHJhcCcsXG4gICAgJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUnLFxuICAgICdhZG1pbi5jb3JlJyxcbiAgICAnYWRtaW4uY29udGVudCcsXG4gICAgJ2FkbWluLnVzZXInXG5dO1xuZGVwZW5kZW5jaWVzLnB1c2guYXBwbHkoZGVwZW5kZW5jaWVzLCBtb2R1bGVzKTsgLy8gT3RoZXIgbW9kdWxlcyBhcmUgbG9hZGVkIGJ5IHR3aWdcblxuYW5ndWxhci5tb2R1bGUoJ2FkbWluJywgZGVwZW5kZW5jaWVzKS5jb25maWcoW1xuICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgJ1Jlc3Rhbmd1bGFyUHJvdmlkZXInLFxuICAgICckdHJhbnNsYXRlUHJvdmlkZXInLFxuICAgICckdHJhbnNsYXRlUGFydGlhbExvYWRlclByb3ZpZGVyJyxcbiAgICBmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCBSZXN0YW5ndWxhclByb3ZpZGVyLCAkdHJhbnNsYXRlUHJvdmlkZXIsICR0cmFuc2xhdGVQYXJ0aWFsTG9hZGVyUHJvdmlkZXIpIHtcbiAgICAgICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzLyc7XG5cbiAgICAgICAgLy8gRm9yIGFueSB1bm1hdGNoZWQgdXJsLCByZWRpcmVjdCB0byAvc3RhdGUxXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcblxuICAgICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnaG9tZS5odG1sJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgJHRyYW5zbGF0ZVByb3ZpZGVyLnVzZUxvYWRlcignJHRyYW5zbGF0ZVBhcnRpYWxMb2FkZXInLCB7XG4gICAgICAgICAgICB1cmxUZW1wbGF0ZTogJ2d6ZXJvL3twYXJ0fS9sYW5nL3tsYW5nfS5qc29uJ1xuICAgICAgICB9KTtcbiAgICAgICAgJHRyYW5zbGF0ZVBhcnRpYWxMb2FkZXJQcm92aWRlci5hZGRQYXJ0KCdhZG1pbicpO1xuXG4gICAgICAgIC8vJHRyYW5zbGF0ZVByb3ZpZGVyLnByZWZlcnJlZExhbmd1YWdlKCdwbF9QTCcpO1xuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIucHJlZmVycmVkTGFuZ3VhZ2UoJ2VuX1VTJyk7XG5cbiAgICAgICAgLy9Vc2VyIG1vcmUgc2VjdXJlIHZhcmlhbnQgc2FuaXRpemUgc3RyYXRlZ3kgZm9yIGVzY2FwaW5nO1xuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIudXNlU2FuaXRpemVWYWx1ZVN0cmF0ZWd5KCdlc2NhcGUnKTtcblxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldEJhc2VVcmwoQ29uZmlnLmFwaVVybCArICcvdjEnKTtcblxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldERlZmF1bHRIdHRwRmllbGRzKHtcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZW5hbWUgUmVzdGFuZ3VsYXIgcm91dGUgZmllbGQgdG8gdXNlIGEgJCBwcmVmaXggZm9yIGVhc3kgZGlzdGluY3Rpb24gYmV0d2VlbiBkYXRhIGFuZCBtZXRhZGF0YVxuICAgICAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldFJlc3Rhbmd1bGFyRmllbGRzKHtyb3V0ZTogJyRyb3V0ZSd9KTtcblxuICAgICAgICAvLyBhZGQgYSByZXNwb25zZSBpbnRlcmVjZXB0b3JcbiAgICAgICAgUmVzdGFuZ3VsYXJQcm92aWRlci5hZGRSZXNwb25zZUludGVyY2VwdG9yKGZ1bmN0aW9uKGRhdGEsIG9wZXJhdGlvbikge1xuICAgICAgICAgICAgdmFyIGV4dHJhY3RlZERhdGE7XG4gICAgICAgICAgICAvLyAuLiB0byBsb29rIGZvciBnZXRMaXN0IG9wZXJhdGlvbnNcblxuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJ2dldExpc3QnKSB7XG4gICAgICAgICAgICAgICAgLy8gLi4gYW5kIGhhbmRsZSB0aGUgZGF0YSBhbmQgbWV0YSBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhLmRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEubWV0YSA9IGRhdGEubWV0YTtcbiAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkRGF0YS5wYXJhbXMgPSBkYXRhLnBhcmFtcztcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyBvbmx5IG9uZSBpdGVtIGluIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkRGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4dHJhY3RlZERhdGEgPSBkYXRhO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZXh0cmFjdGVkRGF0YTtcbiAgICAgICAgfSk7XG4gICAgfVxuXSkucnVuKFtcbiAgICAnTmF2QmFyJyxcbiAgICAnJHJvb3RTY29wZScsXG4gICAgJ1Jlc3Rhbmd1bGFyJyxcbiAgICAnTm90aWZpY2F0aW9ucycsXG4gICAgZnVuY3Rpb24oTmF2QmFyLCAkcm9vdFNjb3BlLCBSZXN0YW5ndWxhciwgTm90aWZpY2F0aW9ucykge1xuICAgICAgICBOYXZCYXIuYWRkRmlyc3Qoe3RpdGxlOiAnREFTSEJPQVJEJywgYWN0aW9uOiAnaG9tZScsIGljb246ICdmYSBmYS1ob21lJ30pO1xuICAgICAgICAkcm9vdFNjb3BlLmJhc2VVcmwgPSBDb25maWcudXJsO1xuXG4gICAgICAgIFJlc3Rhbmd1bGFyLnNldEVycm9ySW50ZXJjZXB0b3IoZnVuY3Rpb24ocmVzcG9uc2UsIGRlZmVycmVkLCByZXNwb25zZUhhbmRsZXIpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ0NPTU1PTl9FUlJPUicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gZXJyb3IgaGFuZGxlZFxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDUwMCkge1xuICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkRXJyb3IocmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkRXJyb3JzKHJlc3BvbnNlLmRhdGEubWVzc2FnZXMpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBlcnJvciBub3QgaGFuZGxlZFxuICAgICAgICB9KTtcbiAgICB9XG5dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEFkZEN0cmwoJHNjb3BlLCBVdGlscywgbGlzdFBhcmVudCwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICB2YXIgcGFyZW50SWQgPSBudWxsO1xuICAgICRzY29wZS5jb250ZW50VHlwZSA9IFV0aWxzLiRzdGF0ZVBhcmFtcy50eXBlO1xuICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5saXN0UGFyZW50ID0gbGlzdFBhcmVudDsgLy8gc2VsZWN0ZWQgY2F0ZWdvcnlcbiAgICAgICAgcGFyZW50SWQgPSBsaXN0UGFyZW50LmlkO1xuICAgIH1cbiAgICAvLyBkZWZhdWx0IHRyYW5zbGF0aW9ucyBsYW5nIGNvZGVcbiAgICAkc2NvcGUubmV3Q29udGVudCA9IHtcbiAgICAgICAgdHlwZTogVXRpbHMuJHN0YXRlUGFyYW1zLnR5cGUsXG4gICAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgICAgICB0cmFuc2xhdGlvbnM6IHtcbiAgICAgICAgICAgIGxhbmdDb2RlOiAkc2NvcGUubGlzdExhbmcuY29kZVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIEFuZ3VsYXIgc3RyYXAgZHJvcGRvd24gZm9yIHNhdmUgYnV0dG9uXG4gICAgJHNjb3BlLmNvbnRlbnRTYXZlQnV0dG9uTGlua3MgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdTQVZFX0FORF9DT05USU5VRV9FRElUSU5HJyxcbiAgICAgICAgICAgIGNsaWNrOiAnYWRkTmV3Q29udGVudChuZXdDb250ZW50LCBcImNvbnRlbnQuZWRpdC5kZXRhaWxzXCIpJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBkaXZpZGVyOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdTQVZFX0FORF9BRERfQU5PVEhFUicsXG4gICAgICAgICAgICBjbGljazogJ2FkZE5ld0NvbnRlbnQobmV3Q29udGVudCwgXCJjb250ZW50LmFkZFwiKSdcbiAgICAgICAgfVxuICAgIF07XG5cbiAgICAvLyBjb250ZW50cyBQT1NUIGFjdGlvblxuICAgICRzY29wZS5hZGROZXdDb250ZW50ID0gZnVuY3Rpb24gYWRkTmV3Q29udGVudChuZXdDb250ZW50LCByZWRpcmVjdCkge1xuICAgICAgICBuZXdDb250ZW50LnBhcmVudElkID0gcGFyZW50SWQ7IC8vIHNldCBwYXJlbnQgY2F0ZWdvcnkgYXMgbnVsbFxuICAgICAgICBuZXdDb250ZW50LnB1Ymxpc2hlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDE5KS5yZXBsYWNlKCdUJywgJyAnKTsgLy8gc2V0IHB1Ymxpc2ggYXQgZGF0ZVxuICAgICAgICAvLyBpZiBwYXJlbnQgY2F0ZWdvcnkgZXhpc3RzXG4gICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLmxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBmb3Igcm91dGUgdHJhbnNsYXRpb24gaW4gc2VsZWN0ZWQgbGFuZ3VhZ2VcbiAgICAgICAgICAgIHZhciByb3V0ZSA9IF8ucGx1Y2soXy5maWx0ZXIoJHNjb3BlLmxpc3RQYXJlbnQucm91dGUudHJhbnNsYXRpb25zLCAnbGFuZycsIG5ld0NvbnRlbnQudHJhbnNsYXRpb25zLmxhbmdDb2RlKSwgJ3VybCcpO1xuICAgICAgICAgICAgaWYgKCFyb3V0ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBuZXdDb250ZW50LnBhcmVudElkID0gbnVsbDsgLy8gaWYgbm90IGZvdW5kIHNldCBhcyB1bmNhdGVnb3JpemVkXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgQ29udGVudFJlcG9zaXRvcnkubmV3Q29udGVudChuZXdDb250ZW50KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFV0aWxzLiRzdGF0ZVBhcmFtcy50eXBlID09PSAnY2F0ZWdvcnknID8gJ0NBVEVHT1JZX0NSRUFURUQnIDogJ0NPTlRFTlRfQ1JFQVRFRCc7XG4gICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MobWVzc2FnZSk7XG4gICAgICAgICAgICAvLyB3aGVuIHRoZXJlIGlzIGN1c3RvbSByZWRpcmVjdFxuICAgICAgICAgICAgaWYgKHR5cGVvZiByZWRpcmVjdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gKHJlZGlyZWN0ID09PSAnY29udGVudC5lZGl0LmRldGFpbHMnKSA/IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudElkOiByZXNwb25zZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgbGFuZ0NvZGU6IG5ld0NvbnRlbnQudHJhbnNsYXRpb25zLmxhbmdDb2RlXG4gICAgICAgICAgICAgICAgfSA6IHt0eXBlOiBVdGlscy4kc3RhdGVQYXJhbXMudHlwZX07XG5cbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28ocmVkaXJlY3QsIHBhcmFtcywge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoVXRpbHMuJHN0YXRlUGFyYW1zLnR5cGUgPT09ICdjYXRlZ29yeScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiBjcmVhdGUgYSBjYXRlZ29yeSB0aGVuIHNldCBpdCBhcyBhIG5ldyBsaXN0UGFyZW50IG9uIGNvbnRlbnQgbGlzdFxuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2NvbnRlbnQubGlzdCcsIHtjb250ZW50SWQ6IHJlc3BvbnNlLmlkfSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSBnbyB0byBsaXN0IHdpdGhvdXQgbmV3IGxpc3RQYXJlbnRcbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50Lmxpc3QnLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbn1cbkNvbnRlbnRBZGRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdsaXN0UGFyZW50JywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRBZGRDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsKCRzY29wZSwgVXRpbHMsIFByZXZpb3VzU3RhdGUsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgJHNjb3BlLnNob3dUZWFzZXIgPSBmYWxzZTtcbiAgICAvLyBkZWZhdWx0IHRyYW5zbGF0aW9ucyBsYW5nIGNvZGVcbiAgICAkc2NvcGUubmV3Q29udGVudFRyYW5zbGF0aW9uID0ge1xuICAgICAgICBjb250ZW50SWQ6IFV0aWxzLiRzdGF0ZVBhcmFtcy5jb250ZW50SWQsXG4gICAgICAgIGxhbmdDb2RlOiBVdGlscy4kc3RhdGVQYXJhbXMubGFuZ0NvZGVcbiAgICB9O1xuICAgIC8vIGNvbnRlbnRzIFBPU1QgYWN0aW9uXG4gICAgJHNjb3BlLmFkZG5ld0NvbnRlbnRUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uIGFkZE5ld0NvbnRlbnQobmV3Q29udGVudFRyYW5zbGF0aW9uKSB7XG4gICAgICAgIENvbnRlbnRSZXBvc2l0b3J5Lm5ld0NvbnRlbnRUcmFuc2xhdGlvbihVdGlscy4kc3RhdGVQYXJhbXMuY29udGVudElkLCBuZXdDb250ZW50VHJhbnNsYXRpb24pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmIChQcmV2aW91c1N0YXRlLnVybC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gcmVkaXJlY3RlZCBiYWNrIHRvIHRoZSBzdGF0ZSB3ZSBjYW1lIGZyb21cbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oUHJldmlvdXNTdGF0ZS5uYW1lLCBQcmV2aW91c1N0YXRlLnBhcmFtcywge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgZ28gdG8gY29udGVudCBsaXN0XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50Lmxpc3QnLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xufVxuQ29udGVudEFkZFRyYW5zbGF0aW9uQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnUHJldmlvdXNTdGF0ZScsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50Q2F0ZWdvcnlUcmVlQ3RybCgkc2NvcGUsIGNhdGVnb3JpZXMsIG9wZW5DYXRlZ29yaWVzLCBsaXN0UGFyZW50LCBVdGlscykge1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHJldHVybnMgcm9vdCBpZCBmcm9tIHByb3ZpZGVkIHBhdGhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXRoIHRvIHNlYXJjaCBvdmVyXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7aW50fSByb290IGlkXG4gICAgICogQHRocm93cyBFcnJvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJvb3RJZEZyb21QYXRoKHBhdGgpIHtcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHBhdGhbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vZGUgcGF0aCBpcyB0b28gc2hvcnQhJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiByZXR1cm5zIHNwZWNpZmllZCBub2RlIGZvcm0gcHJvdmlkZWQgY29sbGVjdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbGxlY3Rpb24gdGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyXG4gICAgICogQHBhcmFtIGlkICBub2RlIGlkXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSByZXR1cm5zIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIHVuZGVmaW5lZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE5vZGVCeUlkKGNvbGxlY3Rpb24sIGlkKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQoY29sbGVjdGlvbiwgZnVuY3Rpb24oY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIHJldHVybiBjYXRlZ29yeS5pZCA9PT0gaWQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGlmIHRoZXJlIGFyZSBvcGVuIGNhdGVnb3JpZXMgaW4gdGhlIFV0aWxzLlN0b3JhZ2VcbiAgICBpZiAodHlwZW9mIG9wZW5DYXRlZ29yaWVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUub3BlbkNhdGVnb3JpZXMgPSBvcGVuQ2F0ZWdvcmllcztcbiAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUub3BlbkNhdGVnb3JpZXMgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBpZiBjYXRlZ29yaWVzIHRyZWUgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBjYXRlZ29yaWVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUuY2F0ZWdvcmllcyA9IGNhdGVnb3JpZXM7XG4gICAgfVxuXG4gICAgLy8gaWYgcGFyZW50IGNhdGVnb3J5IGV4aXN0c1xuICAgIGlmICh0eXBlb2YgbGlzdFBhcmVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmFjdGl2ZU5vZGUgPSBsaXN0UGFyZW50LmlkO1xuXG4gICAgICAgIC8vIG1lcmdlIG9wZW4gY2F0ZWdvcmllcyB3aXRoIGFjdGl2ZSBjYXRlZ29yeSBwYXRoXG4gICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllcyA9IF8udW5pb24oJHNjb3BlLm9wZW5DYXRlZ29yaWVzLCBsaXN0UGFyZW50LnBhdGgpO1xuICAgICAgICAkc2NvcGUucm9vdCA9IGdldE5vZGVCeUlkKCRzY29wZS5jYXRlZ29yaWVzLCBnZXRSb290SWRGcm9tUGF0aChsaXN0UGFyZW50LnBhdGgpKTtcbiAgICAgICAgLy8gc2F2ZSBvcGVuIGNhdGVnb3JpZXMgaW4gdGhlIHN0b3JlXG4gICAgICAgIFV0aWxzLlN0b3JhZ2Uuc2V0U3RvcmFnZUl0ZW0oe29wZW5DYXRlZ29yaWVzOiAkc2NvcGUub3BlbkNhdGVnb3JpZXN9KTtcbiAgICB9XG5cbiAgICAvLyByZW1vdmVzIGxpc3RQYXJlbnQgaWQgZnJvbSBVdGlscy5TdG9yYWdlXG4gICAgJHNjb3BlLnVuY2F0ZWdvcml6ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgVXRpbHMuU3RvcmFnZS5yZW1vdmVTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKTtcbiAgICB9O1xuXG4gICAgLy8gdG9nZ2xlcyBOb2RlIGluIGNhdGVnb3JpZXMgdHJlZSBhbmQgbWFuYWdlIFV0aWxzLlN0b3JhZ2Ugb3BlbiBjYXRlZ29yaWVzIG9iamVjdFxuICAgICRzY29wZS50b2dnbGVOb2RlID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgc2NvcGUudG9nZ2xlKCk7XG4gICAgICAgIHZhciBub2RlSWQgPSBfLnBhcnNlSW50KHNjb3BlLiRlbGVtZW50WzBdLmlkLCAxMCk7XG4gICAgICAgIC8vIGlmIG5vZGUgaXMgb3BlblxuICAgICAgICBpZiAoIXNjb3BlLmNvbGxhcHNlZCkge1xuICAgICAgICAgICAgLy8gYWRkIHRvIHNjb3BlXG4gICAgICAgICAgICAkc2NvcGUub3BlbkNhdGVnb3JpZXMucHVzaChub2RlSWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGZyb20gc2NvcGVcbiAgICAgICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllcyA9IF8ud2l0aG91dCgkc2NvcGUub3BlbkNhdGVnb3JpZXMsIG5vZGVJZCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2F2ZSBpbiB0aGUgc3RvcmVcbiAgICAgICAgVXRpbHMuU3RvcmFnZS5zZXRTdG9yYWdlSXRlbSh7b3BlbkNhdGVnb3JpZXM6ICRzY29wZS5vcGVuQ2F0ZWdvcmllc30pO1xuICAgIH07XG5cbn1cbkNvbnRlbnRDYXRlZ29yeVRyZWVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdjYXRlZ29yaWVzJywgJ29wZW5DYXRlZ29yaWVzJywgJ2xpc3RQYXJlbnQnLCAnVXRpbHMnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudENhdGVnb3J5VHJlZUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnREYXNoYm9hcmRDdHJsKCRzY29wZSkge1xuXG59XG5Db250ZW50RGFzaGJvYXJkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudERhc2hib2FyZEN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnREZXRhaWxzQ3RybCgkc2NvcGUsIGNvbnRlbnQsIGxhbmdDb2RlLCBDb250ZW50UmVwb3NpdG9yeSwgVXRpbHMpIHtcblxuICAgICRzY29wZS5Db25maWcgPSBVdGlscy5Db25maWc7XG5cbiAgICAvLyBUT0RPOiBnZXQgcmVnaXN0ZXJlZCB0YWJzXG4gICAgJHNjb3BlLnRhYnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnQ09OVEVOVCcsXG4gICAgICAgICAgICBhY3Rpb246ICdkZXRhaWxzJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRydWUgLy8gZGVmYXVsdCBhY3RpdmUgdGFiIGluIHNldHRpbmdzIGVkaXQgbW9kZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0hJU1RPUllfT0ZfQ0hBTkdFUycsXG4gICAgICAgICAgICBhY3Rpb246ICdoaXN0b3J5J1xuICAgICAgICB9XG4gICAgXTtcblxuICAgIC8vIGlmIGxhbmcgY29kZSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxhbmdDb2RlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAkc2NvcGUubGFuZ0NvZGUgPSBsYW5nQ29kZTtcbiAgICB9XG5cbiAgICAvLyBpZiBjb250ZW50IGV4aXN0c1xuICAgIGlmICh0eXBlb2YgY29udGVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJHNjb3BlLmNvbnRlbnQgPSBDb250ZW50UmVwb3NpdG9yeS5jbGVhbihjb250ZW50KTtcbiAgICAgICAgLy8gaWYgY29udGVudCBwYXJlbnQgZXhpc3RzXG4gICAgICAgIGlmIChjb250ZW50LnBhdGgubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgLy8gdGhlIGxhc3QgYnV0IG9uZSBpZCBudW1iZXIgZnJvbSBwYXRoXG4gICAgICAgICAgICB2YXIgcGFyZW50SWQgPSBfLnRha2VSaWdodChjb250ZW50LnBhdGgsIDIpWzBdO1xuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkub25lKHBhcmVudElkKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbnRlbnRQYXJlbnQgPSBDb250ZW50UmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS5zYXZlQ29udGVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBDb250ZW50UmVwb3NpdG9yeVxuICAgICAgICAgICAgLnVwZGF0ZUNvbnRlbnQoJHNjb3BlLmNvbnRlbnQuaWQsICRzY29wZS5jb250ZW50KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdTQVZFRCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxufVxuQ29udGVudERldGFpbHNDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdjb250ZW50JywgJ2xhbmdDb2RlJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREZXRhaWxzQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBDb250ZW50RGV0YWlsc0VkaXRDdHJsXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudERldGFpbHNFZGl0Q3RybCgkc2NvcGUsIFV0aWxzLCBjb250ZW50LCBsYW5nQ29kZSwgQ29udGVudFJlcG9zaXRvcnkpIHsgLy9qc2hpbnQgaWdub3JlOmxpbmVcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0cmFuc2xhdGlvbiB3aXRoIHNwZWNpZmllZCBsYW5nIHByb3BlcnR5IGZyb20gdHJhbnNsYXRpb25zIGFycmF5XG4gICAgICogYW5kIGZldGNoIGxhbmcgcHJvcGVydHlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0cmFuc2xhdGlvbnMgVHJhbnNsYXRpb25zIGFycmF5XG4gICAgICogQHBhcmFtIGxhbmdDb2RlIGxhbmd1YWdlIGNvZGVcbiAgICAgKiBAcmV0dXJucyBPYmplY3RcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRUcmFuc2xhdGlvbkJ5TGFuZyh0cmFuc2xhdGlvbnMsIGxhbmdDb2RlKSB7XG4gICAgICAgIHZhciB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9ucy5zaGlmdCgpO1xuXG4gICAgICAgIGlmICh0cmFuc2xhdGlvbi5sYW5nID09PSBsYW5nQ29kZSkge1xuICAgICAgICAgICAgdHJhbnNsYXRpb24ubGFuZ0NvZGUgPSB0cmFuc2xhdGlvbi5sYW5nOyAvLyBDb3VzZSB3ZSBjaGFuZ2UgbmFtZSBvZiB0aGlzIHByb3BlcnR5IGluIENvbnRlbnRUcmFuc2xhdGlvblRyYW5zZm9ybWVyXG4gICAgICAgICAgICByZXR1cm4gdHJhbnNsYXRpb247XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0VHJhbnNsYXRpb25CeUxhbmcodHJhbnNsYXRpb25zLCBsYW5nQ29kZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXJyZW50bHkgYWN0aXZlIHRyYW5zbGF0aW9uIG9iamVjdFxuICAgICAqXG4gICAgICogQHR5cGUgT2JqZWN0XG4gICAgICovXG4gICAgJHNjb3BlLmFjdGl2ZVRyYW5zbGF0aW9uID0gZ2V0VHJhbnNsYXRpb25CeUxhbmcoKGNvbnRlbnQudHJhbnNsYXRpb25zLnNsaWNlKDApKSwgbGFuZ0NvZGUpO1xuXG4gICAgLyoqXG4gICAgICogc2F2ZSBjdXJyZW50IGFjdGl2ZSB0cmFuc2xhdGlvbiBhcyBuZXcgYWN0aXZlIHRyYW5zbGF0aW9uXG4gICAgICogYW5kIGdvIGJhY2sgdG8gZGV0YWlscyBzaG93IHN0YXRlXG4gICAgICovXG4gICAgJHNjb3BlLnNhdmVUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5uZXdDb250ZW50VHJhbnNsYXRpb24oY29udGVudC5pZCwgJHNjb3BlLmFjdGl2ZVRyYW5zbGF0aW9uKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCdjb250ZW50LnNob3cuZGV0YWlscycsIHtcbiAgICAgICAgICAgICAgICBjb250ZW50SWQ6IGNvbnRlbnQuaWQsXG4gICAgICAgICAgICAgICAgbGFuZ0NvZGU6IGxhbmdDb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnU1VDQ0VTUycpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG59XG5Db250ZW50RGV0YWlsc0VkaXRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICdjb250ZW50JywgJ2xhbmdDb2RlJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREZXRhaWxzRWRpdEN0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgQ29udGVudEhpc3RvcnlDdHJsXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudEhpc3RvcnlDdHJsKCRzY29wZSwgVXRpbHMsIGNvbnRlbnQsIGxhbmdDb2RlLCBDb250ZW50UmVwb3NpdG9yeSwgTmdUYWJsZVBhcmFtcykgeyAvL2pzaGludCBpZ25vcmU6bGluZVxuICAgICRzY29wZS50YWJsZVBhcmFtcyA9IG5ldyBOZ1RhYmxlUGFyYW1zKHtcbiAgICAgICAgY291bnQ6IDI1LCAvLyBjb3VudCBwZXIgcGFnZVxuICAgICAgICBzb3J0aW5nOiB7XG4gICAgICAgICAgICAnY3JlYXRlZEF0JzogJ2Rlc2MnIC8vIGluaXRpYWwgc29ydGluZ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBsYW5nQ29kZTogbGFuZ0NvZGVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQgbGlzdCBieSBkZWZhdWx0XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IENvbnRlbnRSZXBvc2l0b3J5LnRyYW5zbGF0aW9ucyhjb250ZW50LmlkLCBxdWVyeU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAvLyBDb250ZW50cyBpcyBhIFJFU1QgQW5ndWxhckpTIHNlcnZpY2UgdGhhdCB0YWxrcyB0byBhcGkgYW5kIHJldHVybiBwcm9taXNlXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMudG90YWwocmVzcG9uc2UubWV0YS50b3RhbCk7XG4gICAgICAgICAgICAgICAgJGRlZmVyLnJlc29sdmUoQ29udGVudFJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5Db250ZW50SGlzdG9yeUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ2NvbnRlbnQnLCAnbGFuZ0NvZGUnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnbmdUYWJsZVBhcmFtcyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50SGlzdG9yeUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRMaXN0Q3RybCgkc2NvcGUsIFV0aWxzLCBsaXN0UGFyZW50LCBDb250ZW50UmVwb3NpdG9yeSwgTmdUYWJsZVBhcmFtcykge1xuICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBleGlzdHNcbiAgICBpZiAodHlwZW9mIGxpc3RQYXJlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICRzY29wZS5saXN0UGFyZW50ID0gbGlzdFBhcmVudDsgLy8gc2VsZWN0ZWQgY2F0ZWdvcnlcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBjb250ZW50IGFkZCBidXR0b24gbGlua3NcbiAgICAkc2NvcGUuY29udGVudEFkZEJ1dHRvbkxpbmtzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiAnQUREX0NPTlRFTlQnLFxuICAgICAgICAgICAgaHJlZjogJ2NvbnRlbnQuYWRkKHsgdHlwZTogXCJjb250ZW50XCIgfSknLFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWZpbGUtdGV4dC1vJ1xuXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdBRERfQ0FURUdPUlknLFxuICAgICAgICAgICAgaHJlZjogJ2NvbnRlbnQuYWRkKHsgdHlwZTogXCJjYXRlZ29yeVwiIH0pJyxcbiAgICAgICAgICAgIGljb246ICdmYSBmYS1mb2xkZXItbydcbiAgICAgICAgfVxuICAgIF07XG5cbiAgICAvLyBUT0RPOiBjb250ZW50IGxpc3QgYWN0aW9uc1xuICAgICRzY29wZS5jb250ZW50TGlzdEFjdGlvbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdWSUVXJyxcbiAgICAgICAgICAgIHVybDogJ3B1YmxpY1VybCcsIC8vIHRoaXMgd2lsbCBiZSByZXBsYWNlZCB3aXRoIGNvbnRlbnQgcHVibGljIHVybFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLXNlYXJjaCdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogJ0VESVQnLFxuICAgICAgICAgICAgaHJlZjogJ2NvbnRlbnQuc2hvdyh7IGNvbnRlbnRJZDogcmVjb3JkX2lkLCBsYW5nQ29kZTogbGFuZ19jb2RlIH0pJyxcbiAgICAgICAgICAgIGljb246ICdmYSBmYS1wZW5jaWwnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6ICdNT1ZFX1RPX1RSQVNIJyxcbiAgICAgICAgICAgIGNsaWNrOiAnZGVsZXRlJywgLy8gdGhpcyB3aWxsIGJlIHJlcGxhY2VkIHdpdGggZGVsZXRlIGFjdGlvblxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLXRpbWVzJ1xuICAgICAgICB9XG4gICAgXTtcblxuICAgIC8vICBuZ1RhYmxlIGNvbmZpZ3VyYXRpb25cbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ3RyYW5zbGF0aW9ucy50aXRsZSc6ICdhc2MnIC8vIGluaXRpYWwgc29ydGluZ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBsYW5nOiAkc2NvcGUubGlzdExhbmcuY29kZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnY29udGVudCdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5jb3VudCgpIC0gbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlIGRlY2xhcmVkIGluIHZpZXdcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmNvdW50KFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGVyUGFnZSA9IHBhcmFtcy5jb3VudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJhbXMucGFnZSgpIC0gY3VycmVudCBwYWdlXG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5wYWdlKFV0aWxzLiRzdGF0ZVBhcmFtcy5wYWdlKTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMucGFnZSA9IHBhcmFtcy5wYWdlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRhYmxlUGFyYW1zLm9yZGVyQnkoKSAtIGFuIGFycmF5IG9mIHN0cmluZyBpbmRpY2F0aW5nIGJvdGggdGhlIHNvcnRpbmcgY29sdW1uIGFuZCBkaXJlY3Rpb24gKGUuZy4gW1wiK25hbWVcIiwgXCItZW1haWxcIl0pXG4gICAgICAgICAgICBpZiAocGFyYW1zLnNvcnRpbmcoKSkge1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBpbiBmaXJzdCBzb3J0IGNvbHVtbiBmb3Igbm93XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyQnkgPSBwYXJhbXMub3JkZXJCeSgpWzBdO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5zb3J0ID0gb3JkZXJCeVswXSA9PT0gJysnID8gb3JkZXJCeS5zdWJzdHJpbmcoMSkgOiBvcmRlckJ5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVdGlscy4kc3RhdGVQYXJhbXMgLSBmaWx0ZXJzIHdpdGhvdXQgY29udGVudElkXG4gICAgICAgICAgICB2YXIgZmlsdGVycyA9IF8ub21pdChVdGlscy4kc3RhdGVQYXJhbXMsICdjb250ZW50SWQnKTtcbiAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucyA9IF8ubWVyZ2UocXVlcnlPcHRpb25zLCBmaWx0ZXJzKTtcbiAgICAgICAgICAgICRzY29wZS5hY3RpdmVGaWx0ZXIgPSBmaWx0ZXJzO1xuXG4gICAgICAgICAgICAvLyBsaXN0IHByb21pc2VcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0ge307XG5cbiAgICAgICAgICAgIC8vIGlmIHBhcmVudCBjYXRlZ29yeSBpcyBub3Qgc2VsZWN0ZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGlzdFBhcmVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgdW5jYXRlZ29yaXplZFxuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5sZXZlbCA9IDA7XG4gICAgICAgICAgICAgICAgcHJvbWlzZSA9IENvbnRlbnRSZXBvc2l0b3J5Lmxpc3QocXVlcnlPcHRpb25zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IGNoaWxkcmVuJ3NcbiAgICAgICAgICAgICAgICBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkuY2hpbGRyZW4obGlzdFBhcmVudC5pZCwgcXVlcnlPcHRpb25zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ29udGVudHMgaXMgYSBSRVNUIEFuZ3VsYXJKUyBzZXJ2aWNlIHRoYXQgdGFsa3MgdG8gYXBpIGFuZCByZXR1cm4gcHJvbWlzZVxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRvdGFsKHJlc3BvbnNlLm1ldGEudG90YWwpO1xuICAgICAgICAgICAgICAgICRkZWZlci5yZXNvbHZlKENvbnRlbnRSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm1ldGEgPSByZXNwb25zZS5tZXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbkNvbnRlbnRMaXN0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnbGlzdFBhcmVudCcsICdDb250ZW50UmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRMaXN0Q3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRUcmFzaGNhbkN0cmwoJHNjb3BlLCBDb250ZW50UmVwb3NpdG9yeSwgTmdUYWJsZVBhcmFtcywgVXRpbHMpIHtcbiAgICAkc2NvcGUudGFibGVQYXJhbXMgPSBuZXcgTmdUYWJsZVBhcmFtcyh7XG4gICAgICAgIGNvdW50OiAyNSwgLy8gY291bnQgcGVyIHBhZ2VcbiAgICAgICAgc29ydGluZzoge1xuICAgICAgICAgICAgJ2lkJzogJ2Rlc2MnIC8vIGluaXRpYWwgc29ydGluZ1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICB0b3RhbDogMCwgLy8gbGVuZ3RoIG9mIGRhdGFcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oJGRlZmVyLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIC8vIHByZXBhcmUgb3B0aW9ucyB0byBiZSBzZW50IHRvIGFwaVxuICAgICAgICAgICAgdmFyIHF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBsYW5nOiAkc2NvcGUubGlzdExhbmcuY29kZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gcGFyYW1zLmNvdW50KCkgLSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgZGVjbGFyZWQgaW4gdmlld1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuY291bnQoVXRpbHMuJHN0YXRlUGFyYW1zLnBlclBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wZXJQYWdlID0gcGFyYW1zLmNvdW50KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHBhcmFtcy5wYWdlKCkgLSBjdXJyZW50IHBhZ2VcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVXRpbHMuJHN0YXRlUGFyYW1zLnBhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnBhZ2UoVXRpbHMuJHN0YXRlUGFyYW1zLnBhZ2UpO1xuICAgICAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucy5wYWdlID0gcGFyYW1zLnBhZ2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGFibGVQYXJhbXMub3JkZXJCeSgpIC0gYW4gYXJyYXkgb2Ygc3RyaW5nIGluZGljYXRpbmcgYm90aCB0aGUgc29ydGluZyBjb2x1bW4gYW5kIGRpcmVjdGlvbiAoZS5nLiBbXCIrbmFtZVwiLCBcIi1lbWFpbFwiXSlcbiAgICAgICAgICAgIGlmIChwYXJhbXMuc29ydGluZygpKSB7XG4gICAgICAgICAgICAgICAgLy8gb25seSBpbnRlcmVzdGVkIGluIGZpcnN0IHNvcnQgY29sdW1uIGZvciBub3dcbiAgICAgICAgICAgICAgICB2YXIgb3JkZXJCeSA9IHBhcmFtcy5vcmRlckJ5KClbMF07XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnNvcnQgPSBvcmRlckJ5WzBdID09PSAnKycgPyBvcmRlckJ5LnN1YnN0cmluZygxKSA6IG9yZGVyQnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFV0aWxzLiRzdGF0ZVBhcmFtcyBmaWx0ZXJzXG4gICAgICAgICAgICBxdWVyeU9wdGlvbnMgPSBfLm1lcmdlKHF1ZXJ5T3B0aW9ucywgVXRpbHMuJHN0YXRlUGFyYW1zKTtcbiAgICAgICAgICAgICRzY29wZS5hY3RpdmVGaWx0ZXIgPSBVdGlscy4kc3RhdGVQYXJhbXM7XG5cbiAgICAgICAgICAgIC8vIGdldCBsaXN0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gQ29udGVudFJlcG9zaXRvcnkuZGVsZXRlZChxdWVyeU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAvLyBDb250ZW50cyBpcyBhIFJFU1QgQW5ndWxhckpTIHNlcnZpY2UgdGhhdCB0YWxrcyB0byBhcGkgYW5kIHJldHVybiBwcm9taXNlXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMudG90YWwocmVzcG9uc2UubWV0YS50b3RhbCk7XG4gICAgICAgICAgICAgICAgJGRlZmVyLnJlc29sdmUoQ29udGVudFJlcG9zaXRvcnkuY2xlYW4ocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubWV0YSA9IHJlc3BvbnNlLm1ldGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5Db250ZW50VHJhc2hjYW5DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdDb250ZW50UmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJywgJ1V0aWxzJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRUcmFzaGNhbkN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnREZWxldGVDdHJsKCRzY29wZSwgVXRpbHMsICRtb2RhbCwgU3RvcmFnZSwgQ29udGVudFJlcG9zaXRvcnksIE5vdGlmaWNhdGlvbnMpIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC9kaXJlY3RpdmVzLyc7XG4gICAgLy8gRGVsZXRlIG1vZGFsXG4gICAgdm0uZGVsZXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY29udGVudERlbGV0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWQgdG8gYmUgcmVtb3ZlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50VHlwZSBjb250ZW50IHR5cGVcbiAgICAgICAgICogQHBhcmFtIGZvcmNlRGVsZXRlIHVzZSBmb3JjZURlbGV0ZVxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbihjb250ZW50SWQsIGNvbnRlbnRUeXBlLCBmb3JjZURlbGV0ZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0uY29udGVudElkID0gY29udGVudElkO1xuICAgICAgICAgICAgdm0uY29udGVudFR5cGUgPSBjb250ZW50VHlwZTtcbiAgICAgICAgICAgIHZtLmZvcmNlRGVsZXRlID0gZm9yY2VEZWxldGU7XG4gICAgICAgICAgICBpZiAodm0uZm9yY2VEZWxldGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnREVMRVRFX0NPTlRFTlRfUVVFU1RJT04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ01PVkVfQ09OVEVOVF9UT19UUkFTSF9RVUVTVElPTicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIERFTEVURSBhY3Rpb24gZm9yIGNvbnRlbnQgaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGRlbGV0ZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkuZGVsZXRlQ29udGVudCh2bS5jb250ZW50SWQsIHZtLmZvcmNlRGVsZXRlKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgICAgIC8vIHJlZnJlc2ggY3VycmVudCBzdGF0ZVxuICAgICAgICAgICAgICAgIGlmICh2bS5jb250ZW50VHlwZSA9PT0gJ2NhdGVnb3J5Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmVkIGNhdGVnb3J5XG4gICAgICAgICAgICAgICAgICAgIFN0b3JhZ2UucmVtb3ZlU3RvcmFnZUl0ZW0oJ2NvbnRlbnRMaXN0UGFyZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbygnY29udGVudC5saXN0Jywge2NvbnRlbnRJZDogbnVsbH0sIHtyZWxvYWQ6IHRydWUsIGluaGVyaXQ6IGZhbHNlfSk7XG4gICAgICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnQ0FURUdPUllfSEFTX0JFRU5fREVMRVRFRCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZWQgY29udGVudFxuICAgICAgICAgICAgICAgICAgICBpZiAoVXRpbHMuJHN0YXRlLiRjdXJyZW50Lm5hbWUgPT09ICdjb250ZW50LnNob3cuZGV0YWlscycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbygnY29udGVudC5saXN0Jywge2NvbnRlbnRJZDogbnVsbH0sIHtyZWxvYWQ6IHRydWUsIGluaGVyaXQ6IGZhbHNlfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKFxuICAgICAgICAgICAgICAgICAgICAgICAgdm0uZm9yY2VEZWxldGUgPyAnQ09OVEVOVF9IQVNfQkVFTl9ERUxFVEVEJyA6ICdDT05URU5UX0hBU19CRUVOX01PVkVEX1RPX1RSQVNIJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cbkNvbnRlbnREZWxldGVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICckbW9kYWwnLCAnU3RvcmFnZScsICdDb250ZW50UmVwb3NpdG9yeScsICdOb3RpZmljYXRpb25zJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnREZWxldGVDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50UmVzdG9yZUN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSwgTm90aWZpY2F0aW9ucykge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIFJlc3RvcmUgbW9kYWxcbiAgICB2bS5yZXN0b3JlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY29udGVudFJlc3RvcmVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGNvbnRlbnRJZCBjb250ZW50IGlkIHRvIGJlIHJlc3RvcmVkLCBpdCBpcyBzYXZlZCBpbiB0aGUgc2NvcGVcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oY29udGVudElkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnUExFQVNFX0NPTkZJUk0nLCAnUkVTVE9SRV9DT05URU5UX1FVRVNUSU9OJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBjbG9zZSB0aGUgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGNsb3NlTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiByZXN0b3JlIHNvZnREZWxldGVkIGNvbnRlbnRcbiAgICAgICAgICogQHBhcmFtIGVkaXRBZnRlclJlc3RvcmUgaWYgdHJ1ZSByZWRpcmVjdCB0byBlZGl0IHN0YXRlIGFmdGVyIHJlc3RvcmVcbiAgICAgICAgICovXG4gICAgICAgIHJlc3RvcmVDb250ZW50OiBmdW5jdGlvbihlZGl0QWZ0ZXJSZXN0b3JlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5yZXN0b3JlQ29udGVudCh2bS5jb250ZW50SWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNsb3NlTW9kYWwoKTtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdEFmdGVyUmVzdG9yZSkge1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oJ2NvbnRlbnQuZWRpdC5kZXRhaWxzJywge2NvbnRlbnRJZDogdm0uY29udGVudElkLCBsYW5nQ29kZTogJHNjb3BlLmN1cnJlbnRMYW5nLmNvZGV9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUuZ28oVXRpbHMuJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnQ09OVEVOVF9IQVNfQkVFTl9SRVNUT1JFRCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuQ29udGVudFJlc3RvcmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICckbW9kYWwnLCAnQ29udGVudFJlcG9zaXRvcnknLCAnTm90aWZpY2F0aW9ucyddO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50UmVzdG9yZUN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRSb3V0ZUN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIFJvdXRlIG1vZGFsXG4gICAgdm0uZWRpdFJvdXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqL1xuICAgICAgICBpbml0TW9kYWw6IGZ1bmN0aW9uKHRpdGxlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsID0gJG1vZGFsKHtcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY29udGVudEVkaXRSb3V0ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWQgdG8gYmUgcmVtb3ZlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50Um91dGUgY29udGVudCByb3V0ZVxuICAgICAgICAgKiBAcGFyYW0gbGFuZ0NvZGUgcm91dGUgdHJhbnNsYXRpb24gbGFuZ3VhZ2VcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oY29udGVudElkLCBjb250ZW50Um91dGUsIGxhbmdDb2RlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICB2bS5jb250ZW50Um91dGUgPSBjb250ZW50Um91dGUuc3Vic3RyKGNvbnRlbnRSb3V0ZS5sYXN0SW5kZXhPZignLycpICsgMSk7IC8vIGxhc3QgdXJsIHNlZ21lbnRcbiAgICAgICAgICAgIHZtLmxhbmdDb2RlID0gbGFuZ0NvZGU7XG4gICAgICAgICAgICBzZWxmLmluaXRNb2RhbCgnRURJVCcpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIERFTEVURSBhY3Rpb24gZm9yIGNvbnRlbnQgaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIHNhdmVDb250ZW50Um91dGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIG5ld1JvdXRlID0ge1xuICAgICAgICAgICAgICAgIGxhbmdDb2RlOiB2bS5sYW5nQ29kZSxcbiAgICAgICAgICAgICAgICB1cmw6IHZtLmNvbnRlbnRSb3V0ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIENvbnRlbnRSZXBvc2l0b3J5Lm5ld0NvbnRlbnRSb3V0ZSh2bS5jb250ZW50SWQsIG5ld1JvdXRlKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKFV0aWxzLiRzdGF0ZS5jdXJyZW50LCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgIH07XG59XG5Db250ZW50Um91dGVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdVdGlscycsICckbW9kYWwnLCAnQ29udGVudFJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudFJvdXRlQ3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBTZXRUcmFuc2xhdGlvbkFzQWN0aXZlXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwoJHNjb3BlLCBVdGlscywgJG1vZGFsLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL2NvbnRlbnQvZGlyZWN0aXZlcy8nO1xuICAgIC8vIFNldCBhcyBhY3RpdmUgbW9kYWxcbiAgICB2bS5zZXRBc0FjdGl2ZU1vZGFsID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gdHJhbnNsYXRpb24gd2l0aCBzcGVjaWZpZWQgaWQgcHJvcGVydHkgZnJvbSB0cmFuc2xhdGlvbnMgYXJyYXlcbiAgICAgICAgICogYW5kIGZldGNoIGxhbmcgcHJvcGVydHlcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9ucyBUcmFuc2xhdGlvbnMgYXJyYXlcbiAgICAgICAgICogQHBhcmFtIGlkIHRyYW5zbGF0aW9uIGlkXG4gICAgICAgICAqIEByZXR1cm5zIE9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0VHJhbnNsYXRpb25CeUlkOiBmdW5jdGlvbih0cmFuc2xhdGlvbnMsIGlkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgdHJhbnNsYXRpb24gPSB0cmFuc2xhdGlvbnMuc2hpZnQoKTtcbiAgICAgICAgICAgIGlmIChwYXJzZUludCh0cmFuc2xhdGlvbi5pZCkgPT09IHBhcnNlSW50KGlkKSkge1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uLmxhbmdDb2RlID0gdHJhbnNsYXRpb24ubGFuZzsgLy8gQ291c2Ugd2UgY2hhbmdlIG5hbWUgb2YgdGhpcyBwcm9wZXJ0eSBpbiBDb250ZW50VHJhbnNsYXRpb25UcmFuc2Zvcm1lclxuICAgICAgICAgICAgICAgIHJldHVybiB0cmFuc2xhdGlvbjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuZ2V0VHJhbnNsYXRpb25CeUlkKHRyYW5zbGF0aW9ucywgaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2V0VHJhbnNsYXRpb25Bc0FjdGl2ZU1vZGFsLnRwbC5odG1sJyxcbiAgICAgICAgICAgICAgICBzaG93OiB0cnVlLFxuICAgICAgICAgICAgICAgIHBsYWNlbWVudDogJ2NlbnRlcidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB0cmFuc2xhdGlvbklkIGlkIG9mIHNlbGVjdGVkIHRyYW5zbGF0aW9uXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50SWQgY3VycmVudCBhY3RpdmUgY29udGVudCBpZFxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd01vZGFsOiBmdW5jdGlvbih0cmFuc2xhdGlvbklkLCBjb250ZW50SWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZtLmNvbnRlbnRJZCA9IGNvbnRlbnRJZDtcbiAgICAgICAgICAgIHZtLnRyYW5zbGF0aW9ucyA9ICRzY29wZS50YWJsZVBhcmFtcy5kYXRhLnNsaWNlKDApO1xuICAgICAgICAgICAgdm0udHJhbnNsYXRpb25JZCA9IHRyYW5zbGF0aW9uSWQ7XG4gICAgICAgICAgICB2bS5zZWxlY3RlZFRyYW5zbGF0aW9uID0gc2VsZi5nZXRUcmFuc2xhdGlvbkJ5SWQodm0udHJhbnNsYXRpb25zLCB2bS50cmFuc2xhdGlvbklkKTtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdTRVRfVFJBTlNMQVRJT05fQVNfQUNUSVZFX1FVRVNUSU9OJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIGFjdGlvbiBhbmQgc2V0IHNlbGVjdGVkIHRyYW5zbGF0aW9uXG4gICAgICAgICAqIGFzIGEgbmV3IGFjdGl2ZSB0cmFuc2xhdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgc2V0QXNBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgQ29udGVudFJlcG9zaXRvcnkubmV3Q29udGVudFRyYW5zbGF0aW9uKHZtLmNvbnRlbnRJZCwgdm0uc2VsZWN0ZWRUcmFuc2xhdGlvbikudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBVdGlscy5Ob3RpZmljYXRpb25zLmFkZFN1Y2Nlc3MoJ1NVQ0NFU1MnKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5TZXRUcmFuc2xhdGlvbkFzQWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJG1vZGFsJywgJ0NvbnRlbnRSZXBvc2l0b3J5J107XG5tb2R1bGUuZXhwb3J0cyA9IFNldFRyYW5zbGF0aW9uQXNBY3RpdmVDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIERlbGV0ZVRyYW5zbGF0aW9uQ3RybFxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIERlbGV0ZVRyYW5zbGF0aW9uQ3RybCgkc2NvcGUsIFV0aWxzLCAkbW9kYWwsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgdmFyIHZtID0gdGhpcztcbiAgICB2YXIgdmlld1BhdGggPSAnZ3plcm8vYWRtaW4vdmlld3MvY29udGVudC9kaXJlY3RpdmVzLyc7XG4gICAgLy8gRGVsZXRlIG1vZGFsXG4gICAgdm0uZGVsZXRlTW9kYWwgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBpbml0aWF0ZXMgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgdHJhbnNsYXRhYmxlIHRpdGxlIG9mIG1vZGFsXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyBvZiBtb2RhbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdE1vZGFsOiBmdW5jdGlvbih0aXRsZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5tb2RhbCA9ICRtb2RhbCh7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICAgICAgY29udGVudDogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAndHJhbnNsYXRpb25EZWxldGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gY29udGVudElkIGNvbnRlbnQgaWRcbiAgICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9uSWQgdHJhbnNsYXRpb24gaWRcbiAgICAgICAgICovXG4gICAgICAgIHNob3dNb2RhbDogZnVuY3Rpb24oY29udGVudElkLCB0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2bS5jb250ZW50SWQgPSBjb250ZW50SWQ7XG4gICAgICAgICAgICB2bS50cmFuc2xhdGlvbklkID0gdHJhbnNsYXRpb25JZDtcbiAgICAgICAgICAgIHNlbGYuaW5pdE1vZGFsKCdQTEVBU0VfQ09ORklSTScsICdERUxFVEVfVFJBTlNMQVRJT05fUVVFU1RJT04nKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gY2xvc2UgdGhlIG1vZGFsXG4gICAgICAgICAqXG4gICAgICAgICAqL1xuICAgICAgICBjbG9zZU1vZGFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwuaGlkZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBwZXJmb3JtcyB0aGUgUmVzdEFuZ3VsYXIgREVMRVRFIGFjdGlvbiBmb3IgdHJhbnNsYXRpb24gaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGRlbGV0ZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5jbG9zZU1vZGFsKCk7XG4gICAgICAgICAgICBDb250ZW50UmVwb3NpdG9yeS5kZWxldGVUcmFuc2xhdGlvbih2bS5jb250ZW50SWQsIHZtLnRyYW5zbGF0aW9uSWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVXRpbHMuTm90aWZpY2F0aW9ucy5hZGRTdWNjZXNzKCdDT05URU5UX0hBU19CRUVOX0RFTEVURUQnKTtcbiAgICAgICAgICAgICAgICBVdGlscy4kc3RhdGUucmVsb2FkKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5EZWxldGVUcmFuc2xhdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJyRtb2RhbCcsICdDb250ZW50UmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBEZWxldGVUcmFuc2xhdGlvbkN0cmw7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRBY3Rpb25zRHJvcGRvd24oJGRyb3Bkb3duKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHtjb250ZW50QWN0aW9uc0Ryb3Bkb3duOiAnPScsIHJlY29yZDogJz0nLCBsYW5nOiAnPSd9LFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQ29udGVudERlbGV0ZUN0cmwpIHtcbiAgICAgICAgICAgIHZhciBkcm9wZG93biA9ICRkcm9wZG93bihlbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50L2RpcmVjdGl2ZXMvQ29udGVudEFjdGlvbnNEcm9wZG93bi50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uOiAnYW0tZmxpcC14JyxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdib3R0b20tcmlnaHQnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGJldHRlciBwYXJhbXMgcmVwbGFjZW1lbnQgYW5kIGZ1bmN0aW9ucyBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIF8ubWFwVmFsdWVzKHNjb3BlLmNvbnRlbnRBY3Rpb25zRHJvcGRvd24sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBuLmhyZWYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmQgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuLmhyZWYuaW5kZXhPZigncmVjb3JkX2lkJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbi5ocmVmID0gbi5ocmVmLnJlcGxhY2UoJ3JlY29yZF9pZCcsIHNjb3BlLnJlY29yZC5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBMYW5nIGNvZGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuLmhyZWYuaW5kZXhPZignbGFuZ19jb2RlJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbi5ocmVmID0gbi5ocmVmLnJlcGxhY2UoJ2xhbmdfY29kZScsICdcIicgKyBzY29wZS5sYW5nLmNvZGUgKyAnXCInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS5jb250ZW50ID0gc2NvcGUuY29udGVudEFjdGlvbnNEcm9wZG93bjtcbiAgICAgICAgICAgICAgICBkcm9wZG93bi4kc2NvcGUucmVjb3JkID0gc2NvcGUucmVjb3JkOyAvLyBQYXNzIHJlY29yZCB0byB0aGUgdmlld1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLiRzY29wZS5sYW5nID0gc2NvcGUubGFuZzsgLy8gUGFzcyBsYW5nIHRvIHRoZSB2aWV3XG4gICAgICAgICAgICAgICAgZHJvcGRvd24uJHNjb3BlLmRlbGV0ZU1vZGFsID0gQ29udGVudERlbGV0ZUN0cmwuZGVsZXRlTW9kYWw7IC8vIFBhc3MgZGVsZXRlIGFjdGlvbiB0byB0aGUgdmlld1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50QWN0aW9uc0Ryb3Bkb3duLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudEFjdGlvbnNEcm9wZG93bjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQ29udGVudERlbGV0ZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnREZWxldGVDdHJsJyxcbiAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLC8vIGJlY2F1c2UgdGhlIHNjb3BlIGlzIGlzb2xhdGVkXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgQ29udGVudERlbGV0ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIENvbnRlbnREZWxldGVDdHJsLmRlbGV0ZU1vZGFsLnNob3dNb2RhbChhdHRycy5pZCwgYXR0cnMudHlwZSwgYXR0cnMuZm9yY2UgPT09ICd0cnVlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnREZWxldGVCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RGVsZXRlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50RWRpdFJvdXRlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudFJvdXRlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIENvbnRlbnRSb3V0ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIGRlbGV0ZSBtb2RhbCBmcm9tIGEgY29udHJvbGxlclxuICAgICAgICAgICAgICAgIENvbnRlbnRSb3V0ZUN0cmwuZWRpdFJvdXRlTW9kYWwuc2hvd01vZGFsKGF0dHJzLmlkLCBhdHRycy5yb3V0ZSwgYXR0cnMubGFuZyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnRFZGl0Um91dGVCdXR0b24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50RWRpdFJvdXRlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb250ZW50UmVzdG9yZUJ1dHRvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRSZXN0b3JlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIENvbnRlbnRSZXN0b3JlQ3RybCkge1xuICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgZGVsZXRlIG1vZGFsIGZyb20gYSBjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgQ29udGVudFJlc3RvcmVDdHJsLnJlc3RvcmVNb2RhbC5zaG93TW9kYWwoYXR0cnMuaWQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5Db250ZW50UmVzdG9yZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRSZXN0b3JlQnV0dG9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTZXRUcmFuc2xhdGlvbkFzQWN0aXZlQnV0dG9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUN0cmwuc2V0QXNBY3RpdmVNb2RhbC5zaG93TW9kYWwoYXR0cnMuaWQsIGF0dHJzLmNvbnRlbnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5TZXRUcmFuc2xhdGlvbkFzQWN0aXZlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gU2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVHJhbnNsYXRpb25EZWxldGVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdUcmFuc2xhdGlvbkRlbGV0ZUN0cmwnLFxuICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgVHJhbnNsYXRpb25EZWxldGVDdHJsKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFRyYW5zbGF0aW9uRGVsZXRlQ3RybC5kZWxldGVNb2RhbC5zaG93TW9kYWwoYXR0cnMuY29udGVudCwgYXR0cnMudHJhbnNsYXRpb25JZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblRyYW5zbGF0aW9uRGVsZXRlQnV0dG9uLiRpbmplY3QgPSBbXTtcbm1vZHVsZS5leHBvcnRzID0gVHJhbnNsYXRpb25EZWxldGVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhZG1pbi5jb250ZW50JywgWyduZ1RhYmxlJywgJ3VpLnRyZWUnXSlcbiAgICAuY29uZmlnKFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAgICAgICAgIHZhciB2aWV3UGF0aCA9ICdnemVyby9hZG1pbi92aWV3cy9jb250ZW50Lyc7XG4gICAgICAgICAgICAvLyBOb3cgc2V0IHVwIHRoZSBzdGF0ZXNcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvY29udGVudCcsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50RGFzaGJvYXJkQ3RybCcsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdpbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDb250ZW50UmVwb3NpdG9yeScsIGZ1bmN0aW9uKENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCB0cmVlIG9mIGFsbCBjYXRlZ29yaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS50cmVlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYXRlZ29yeSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBDT05URU5UIExJU1RcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQubGlzdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2xpc3Qve2NvbnRlbnRJZH0/aXNBY3RpdmUmcGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdFBhcmVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnU3RvcmFnZScsICdDb250ZW50UmVwb3NpdG9yeScsIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgU3RvcmFnZSwgQ29udGVudFJlcG9zaXRvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgc3RhdGUgcGFyYW0gaGFzIGNhdGVnb3J5IGlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc3RhdGVQYXJhbXMuY29udGVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTdG9yYWdlLnNldFN0b3JhZ2VJdGVtKHtjb250ZW50TGlzdFBhcmVudDogJHN0YXRlUGFyYW1zLmNvbnRlbnRJZH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZSgkc3RhdGVQYXJhbXMuY29udGVudElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHN0b3JhZ2UgaGFzIGNhdGVnb3J5IGlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZVBhcmFtcy5jb250ZW50SWQgPSBTdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS5vbmUoU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkNhdGVnb3JpZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgb3BlbiBjYXRlZ29yaWVzIGZyb20gU3RvcmFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTdG9yYWdlJywgZnVuY3Rpb24oU3RvcmFnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnb3BlbkNhdGVnb3JpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnbGlzdC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudExpc3RDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdxdWlja1NpZGViYXJMZWZ0Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdjYXRlZ29yaWVzLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50Q2F0ZWdvcnlUcmVlQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gQ09OVEVOVCBTSE9XXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LnNob3cnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy97Y29udGVudElkfS9zaG93L3tsYW5nQ29kZX0nLFxuICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgdG8gYWN0aXZlIHRhYiBvbiBsYW5ndWFnZSBjaGFuZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCBmdW5jdGlvbigkc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXy5zdGFydHNXaXRoKCRzdGF0ZS5jdXJyZW50Lm5hbWUsICdjb250ZW50LnNob3cnKSA/ICRzdGF0ZS5jdXJyZW50Lm5hbWUgOiAnLmRldGFpbHMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYW5nQ29kZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24oJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy5sYW5nQ29kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLCAnQ29udGVudFJlcG9zaXRvcnknLCBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIENvbnRlbnRSZXBvc2l0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDb250ZW50UmVwb3NpdG9yeS5vbmUoJHN0YXRlUGFyYW1zLmNvbnRlbnRJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3Nob3cuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnREZXRhaWxzQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGFuZ1N3aXRjaGVyQGNvbnRlbnQuc2hvdyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy9sYW5nU3dpdGNoZXIuaHRtbCdcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50U2V0dGluZ3NAY29udGVudC5zaG93Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3NldHRpbmdzLmh0bWwnXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LnNob3cuZGV0YWlscycsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2RldGFpbHMnLFxuICAgICAgICAgICAgICAgICAgICBkZWVwU3RhdGVSZWRpcmVjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc3RpY2t5OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnRUYWInOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvdGFicy9kZXRhaWxzLmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5zaG93Lmhpc3RvcnknLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9oaXN0b3J5P2lzQWN0aXZlJnR5cGUmcGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgZGVlcFN0YXRlUmVkaXJlY3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHN0aWNreTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50VGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3RhYnMvaGlzdG9yeS5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudEhpc3RvcnlDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBDT05URU5UIEVESVRcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQuZWRpdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tjb250ZW50SWR9L2VkaXQve2xhbmdDb2RlfScsXG4gICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiAnLmluZGV4JyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFuZ0NvZGU6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzdGF0ZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMubGFuZ0NvZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJywgJ0NvbnRlbnRSZXBvc2l0b3J5JywgZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ29udGVudFJlcG9zaXRvcnkub25lKCRzdGF0ZVBhcmFtcy5jb250ZW50SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdE1vZGU6IHRydWUgLy8gZW50ZXIgZWRpdCBtb2RlXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudERldGFpbHNDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdsYW5nU3dpdGNoZXJAY29udGVudC5lZGl0Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL2xhbmdTd2l0Y2hlci5odG1sJ1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnRTZXR0aW5nc0Bjb250ZW50LmVkaXQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvc2V0dGluZ3MuaHRtbCdcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3RhdGUoJ2NvbnRlbnQuZWRpdC5pbmRleCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50VGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3RhYnMvZGV0YWlscy5odG1sJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50U2V0dGluZ3MnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2RldGFpbHMvc2V0dGluZ3NFZGl0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5lZGl0LmRldGFpbHMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9kZXRhaWxzJyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50VGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50RGV0YWlsc0VkaXRDdHJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnZGV0YWlscy90YWJzL2RldGFpbHNFZGl0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5lZGl0Lmhpc3RvcnknLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9oaXN0b3J5JyxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50VGFiJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdkZXRhaWxzL3RhYnMvZGV0YWlsc0VkaXQuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gQ09OVEVOVCBUUkFTSENBTlxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC50cmFzaGNhbicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3RyYXNoY2FuP2lzQWN0aXZlJnR5cGUmcGFnZSZwZXJQYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdFBhcmVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuQ2F0ZWdvcmllczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCBvcGVuIGNhdGVnb3JpZXMgZnJvbSBTdG9yYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1N0b3JhZ2UnLCBmdW5jdGlvbihTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBTdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdvcGVuQ2F0ZWdvcmllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICd0cmFzaGNhbi5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudFRyYXNoY2FuQ3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAncXVpY2tTaWRlYmFyTGVmdCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnY2F0ZWdvcmllcy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQ29udGVudENhdGVnb3J5VHJlZUN0cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIENPTlRFTlQgQUREXG4gICAgICAgICAgICAgICAgLnN0YXRlKCdjb250ZW50LmFkZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2FkZC97dHlwZX0nLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0UGFyZW50OiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1N0b3JhZ2UnLCAnQ29udGVudFJlcG9zaXRvcnknLCBmdW5jdGlvbihTdG9yYWdlLCBDb250ZW50UmVwb3NpdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdG9yYWdlIGhhcyBjYXRlZ29yeSBpZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoU3RvcmFnZS5nZXRTdG9yYWdlSXRlbSgnY29udGVudExpc3RQYXJlbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIENvbnRlbnRSZXBvc2l0b3J5Lm9uZShTdG9yYWdlLmdldFN0b3JhZ2VJdGVtKCdjb250ZW50TGlzdFBhcmVudCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjb250ZW50Jzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB2aWV3UGF0aCArICdhZGQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0NvbnRlbnRBZGRDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAvLyBDT05URU5UIEFERCBUUkFOU0xBVElPTlxuICAgICAgICAgICAgICAgIC5zdGF0ZSgnY29udGVudC5hZGRUcmFuc2xhdGlvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3tjb250ZW50SWR9L2FkZC10cmFuc2xhdGlvbi97bGFuZ0NvZGV9JyxcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgUHJldmlvdXNTdGF0ZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLCBmdW5jdGlvbigkc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICRzdGF0ZS5jdXJyZW50Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6ICRzdGF0ZS5wYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICRzdGF0ZS5ocmVmKCRzdGF0ZS5jdXJyZW50Lm5hbWUsICRzdGF0ZS5wYXJhbXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2FkZFRyYW5zbGF0aW9uLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50QWRkQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudEFkZEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERlbGV0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudFJlc3RvcmVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXJlY3RpdmVzL0NvbnRlbnRSZXN0b3JlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50Q2F0ZWdvcnlUcmVlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudENhdGVnb3J5VHJlZUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudERhc2hib2FyZEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnREYXNoYm9hcmRDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnREZXRhaWxzQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudERldGFpbHNDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnREZXRhaWxzRWRpdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvbnRlbnREZXRhaWxzRWRpdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudEhpc3RvcnlDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50SGlzdG9yeUN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudExpc3RDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50TGlzdEN0cmwnKSlcbiAgICAuY29udHJvbGxlcignQ29udGVudFRyYXNoY2FuQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvQ29udGVudFRyYXNoY2FuQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdDb250ZW50QWRkVHJhbnNsYXRpb25DdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Db250ZW50QWRkVHJhbnNsYXRpb25DdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ0NvbnRlbnRSb3V0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvQ29udGVudFJvdXRlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdTZXRUcmFuc2xhdGlvbkFzQWN0aXZlQ3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyZWN0aXZlcy9TZXRUcmFuc2xhdGlvbkFzQWN0aXZlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdUcmFuc2xhdGlvbkRlbGV0ZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcmVjdGl2ZXMvVHJhbnNsYXRpb25EZWxldGVDdHJsJykpXG4gICAgLmZhY3RvcnkoJ0NvbnRlbnRSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9Db250ZW50UmVwb3NpdG9yeS5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnREZWxldGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudERlbGV0ZUJ1dHRvbi5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ2NvbnRlbnRSZXN0b3JlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL0NvbnRlbnRSZXN0b3JlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnY29udGVudEVkaXRSb3V0ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9Db250ZW50RWRpdFJvdXRlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgnc2V0VHJhbnNsYXRpb25Bc0FjdGl2ZUJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9TZXRUcmFuc2xhdGlvbkFzQWN0aXZlQnV0dG9uLmpzJykpXG4gICAgLmRpcmVjdGl2ZSgndHJhbnNsYXRpb25EZWxldGVCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvVHJhbnNsYXRpb25EZWxldGVCdXR0b24uanMnKSlcbiAgICAuZGlyZWN0aXZlKCdjb250ZW50QWN0aW9uc0Ryb3Bkb3duJywgWyckZHJvcGRvd24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvQ29udGVudEFjdGlvbnNEcm9wZG93bi5qcycpXSlcbiAgICAucnVuKFtcbiAgICAgICAgJ05hdkJhcicsXG4gICAgICAgIGZ1bmN0aW9uKE5hdkJhcikge1xuICAgICAgICAgICAgTmF2QmFyLmFkZChcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQ09OVEVOVCcsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2NvbnRlbnQubGlzdCcsXG4gICAgICAgICAgICAgICAgICAgIGljb246ICdmYSBmYS1maWxlLXRleHQtbydcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy9OYXZCYXIuYWRkTGFzdENoaWxkKFxuICAgICAgICAgICAgLy8gICAgJ0NPTlRFTlQnLFxuICAgICAgICAgICAgLy8gICAge1xuICAgICAgICAgICAgLy8gICAgICAgIHRpdGxlOiAnQUxMX0NPTlRFTlRTJyxcbiAgICAgICAgICAgIC8vICAgICAgICBhY3Rpb246ICdjb250ZW50Lmxpc3QnLFxuICAgICAgICAgICAgLy8gICAgICAgIGljb246ICdmYSBmYS10aCdcbiAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgIC8vKTtcbiAgICAgICAgICAgIC8vTmF2QmFyLmFkZExhc3RDaGlsZChcbiAgICAgICAgICAgIC8vICAgICdDT05URU5UJyxcbiAgICAgICAgICAgIC8vICAgIHtcbiAgICAgICAgICAgIC8vICAgICAgICB0aXRsZTogJ0FERF9DT05URU5UJyxcbiAgICAgICAgICAgIC8vICAgICAgICBhY3Rpb246ICdjb250ZW50LmFkZCh7IHR5cGU6IFwiY29udGVudFwiIH0pJyxcbiAgICAgICAgICAgIC8vICAgICAgICBpY29uOiAnZmEgZmEtZmlsZS10ZXh0LW8nXG4gICAgICAgICAgICAvLyAgICB9XG4gICAgICAgICAgICAvLyk7XG4gICAgICAgICAgICAvL05hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgICAvLyAgICAnQ09OVEVOVCcsXG4gICAgICAgICAgICAvLyAgICB7XG4gICAgICAgICAgICAvLyAgICAgICAgdGl0bGU6ICdBRERfQ0FURUdPUlknLFxuICAgICAgICAgICAgLy8gICAgICAgIGFjdGlvbjogJ2NvbnRlbnQuYWRkKHsgdHlwZTogXCJjYXRlZ29yeVwiIH0pJyxcbiAgICAgICAgICAgIC8vICAgICAgICBpY29uOiAnZmEgZmEtZmlsZS10ZXh0J1xuICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgLy8pO1xuICAgICAgICB9XG4gICAgXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIENvbnRlbnRSZXBvc2l0b3J5KFJlc3Rhbmd1bGFyKSB7XG4gICAgdmFyIGFwaSA9ICdhZG1pbi9jb250ZW50cyc7XG4gICAgdmFyIGNvbnRlbnRzID0gUmVzdGFuZ3VsYXIuYWxsKGFwaSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihpZCwgcGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmdldChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICB0cmVlOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpKS5nZXRMaXN0KCd0cmVlJywgcGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGlzdDogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udGVudHMuZ2V0TGlzdChwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGVkOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpKS5nZXRMaXN0KCdkZWxldGVkJywgcGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IGZ1bmN0aW9uKGlkLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuZ2V0TGlzdCgnY2hpbGRyZW4nLCBwYXJhbXMpO1xuICAgICAgICB9LFxuICAgICAgICBuZXdDb250ZW50OiBmdW5jdGlvbihuZXdDb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gY29udGVudHMucG9zdChuZXdDb250ZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlQ29udGVudDogZnVuY3Rpb24oaWQsIGNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoYXBpLCBpZCkuY3VzdG9tUFVUKGNvbnRlbnQpO1xuICAgICAgICB9LFxuICAgICAgICBuZXdDb250ZW50VHJhbnNsYXRpb246IGZ1bmN0aW9uKGlkLCBuZXdUcmFuc2xhdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5hbGwoJ3RyYW5zbGF0aW9ucycpLnBvc3QobmV3VHJhbnNsYXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICBuZXdDb250ZW50Um91dGU6IGZ1bmN0aW9uKGlkLCBuZXdSb3V0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5hbGwoJ3JvdXRlJykucG9zdChuZXdSb3V0ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zbGF0aW9uczogZnVuY3Rpb24oaWQsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5hbGwoJ3RyYW5zbGF0aW9ucycpLmdldExpc3QocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlVHJhbnNsYXRpb246IGZ1bmN0aW9uKGNvbnRlbnRJZCwgdHJhbnNsYXRpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGNvbnRlbnRJZCkub25lKCd0cmFuc2xhdGlvbnMnLCB0cmFuc2xhdGlvbklkKS5yZW1vdmUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlQ29udGVudDogZnVuY3Rpb24oaWQsIGZvcmNlRGVsZXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLm9uZShmb3JjZURlbGV0ZSkucmVtb3ZlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3RvcmVDb250ZW50OiBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGkgKyAnL3Jlc3RvcmUnLCBpZCkucHV0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuc3RyaXBSZXN0YW5ndWxhcihlbGVtKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkNvbnRlbnRSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRSZXBvc2l0b3J5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBDb3JlQ3RybCgkc2NvcGUsICRzdGF0ZSwgVHJhbnNsYXRpb25zLCBOYXZCYXIsIFRvcE5hdkJhcikge1xuICAgIC8vIGdldCB0cmFuc2xhdGlvbnMgbGFuZ3VhZ2VzXG4gICAgVHJhbnNsYXRpb25zLmdldFRyYW5zbGF0aW9ucygpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgJHNjb3BlLmxhbmdzID0gcmVzcG9uc2UubGFuZ3M7XG4gICAgICAgICRzY29wZS5jdXJyZW50TGFuZyA9ICRzY29wZS5saXN0TGFuZyA9IHJlc3BvbnNlLmN1cnJlbnRMYW5nO1xuICAgIH0pO1xuXG4gICAgLy8gYWRtaW4gcGFuZWwgbGFuZ3VhZ2VcbiAgICAkc2NvcGUuc2VsZWN0QWRtaW5MYW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIFRyYW5zbGF0aW9ucy5zZWxlY3RBZG1pbkxhbmcoJHNjb3BlLmN1cnJlbnRMYW5nKTtcbiAgICB9O1xuXG4gICAgLy8gdHJhbnNsYXRpb25zIGxhbmd1YWdlXG4gICAgJHNjb3BlLnNlbGVjdExhbmd1YWdlID0gZnVuY3Rpb24obGFuZykge1xuICAgICAgICAkc2NvcGUubGlzdExhbmcgPSBsYW5nO1xuICAgIH07XG5cbiAgICAvLyByZWZyZXNoIGN1cnJlbnQgc3RhdGVcbiAgICAkc2NvcGUucmVmcmVzaEN1cnJlbnRTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc3RhdGUuZ28oJHN0YXRlLmN1cnJlbnQsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5uYXZCYXIgPSBOYXZCYXIuZ2V0SXRlbXMoKTtcbiAgICAkc2NvcGUudG9wTmF2QmFyID0gVG9wTmF2QmFyLmdldEl0ZW1zKCk7XG5cbiAgICAvL09mZiBjYW52YXMgc2lkZWJhclxuICAgICRzY29wZS5zaG93U2lkZWJhciA9IGZhbHNlO1xuXG4gICAgLy8gdG9nZ2xlIHNpZGViYXJcbiAgICAkc2NvcGUuJHN0YXRlID0gJHN0YXRlO1xuXG4gICAgLy8gY2hlY2sgZm9yIGVkaXQgc3RhdGVcbiAgICAkc2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uKGV2ZW50LCB0b1N0YXRlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdG9TdGF0ZS5kYXRhICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgaWYodG9TdGF0ZS5uYW1lICE9PSAnY29udGVudC5lZGl0LmluZGV4Jyl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVkaXRTdGF0ZU5hbWUgPSB0b1N0YXRlLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuZWRpdE1vZGUgPSB0b1N0YXRlLmRhdGEuZWRpdE1vZGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdFN0YXRlTmFtZSA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdE1vZGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5Db3JlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHN0YXRlJywgJ1RyYW5zbGF0aW9ucycsICdOYXZCYXInLCAnVG9wTmF2QmFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IENvcmVDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTdGF0ZXNEcm9wZG93bigkZHJvcGRvd24pIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzY29wZToge3N0YXRlc0Ryb3Bkb3duOiAnPSd9LFxuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgIHZhciBkcm9wZG93biA9ICRkcm9wZG93bihlbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdnemVyby9hZG1pbi92aWV3cy9jb3JlL2RpcmVjdGl2ZXMvU3RhdGVzRHJvcGRvd24udHBsLmh0bWwnLFxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbjogJ2FtLWZsaXAteCcsXG4gICAgICAgICAgICAgICAgcGxhY2VtZW50OiAnYm90dG9tLXJpZ2h0J1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZHJvcGRvd24uJHNjb3BlLmNvbnRlbnQgPSBzY29wZS5zdGF0ZXNEcm9wZG93bjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuU3RhdGVzRHJvcGRvd24uJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBTdGF0ZXNEcm9wZG93bjtcbiIsImFuZ3VsYXIubW9kdWxlKCdDb3JlRmlsdGVycycsIFtdKVxuLyoqXG4gKiBGaWx0ZXIgcmV0dXJucyB0cmFuc2xhdGFibGUgc3RyaW5nIGJhc2VkIG9uIHByb3ZpZGVkIGxhbmd1YWdlIGNvZGVcbiAqXG4gKiBAcGFyYW0gbGFuZ0NvZGUgIGxhbmd1YWdlIGNvZGVcbiAqXG4gKiBAcmV0dXJucyB7c3RyaW5nfSB0cmFuc2xhdGFibGUgc3RyaW5nXG4gKi9cbiAgICAuZmlsdGVyKCdsYW5nTmFtZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihsYW5nQ29kZSkge1xuICAgICAgICAgICAgcmV0dXJuICdMQU5HX05BTUVfJyArIGFuZ3VsYXIudXBwZXJjYXNlKGxhbmdDb2RlKTtcbiAgICAgICAgfTtcbiAgICB9KVxuLyoqXG4gKiBGaWx0ZXIgcmV0dXJucyB0aGUgdHJhbnNsYXRpb24gaW4gcHJvdmlkZWQgbGFuZ3VhZ2VcbiAqXG4gKiBAcGFyYW0gdHJhbnNsYXRpb25zIHRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3ZlclxuICogQHBhcmFtIGxhbmdDb2RlICBsYW5ndWFnZSBjb2RlXG4gKiBAcGFyYW0gZmllbGQgIGZpZWxkIG5hbWVcbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSB0cmFuc2xhdGlvbiBmaWVsZFxuICovXG4gICAgLmZpbHRlcignZ2V0VHJhbnNsYXRpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24odHJhbnNsYXRpb25zLCBsYW5nQ29kZSwgZmllbGQpIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50VHJhbnNsYXRpb24gPSBfLmZpbHRlcih0cmFuc2xhdGlvbnMsIGZ1bmN0aW9uKHRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uLmxhbmcgPT09IGxhbmdDb2RlO1xuICAgICAgICAgICAgfSkuc2hpZnQoKTtcbiAgICAgICAgICAgIGlmIChfLmhhcyhjdXJyZW50VHJhbnNsYXRpb24sIGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50VHJhbnNsYXRpb25bZmllbGRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KVxuLyoqXG4gKiBGaWx0ZXIgY2hlY2tzIGlmIHNwZWNpZmllZCBub2RlIGV4aXN0cyBpbiBwcm92aWRlZCBwYXRoXG4gKlxuICogQHBhcmFtIHBhdGggdGhlIG5vZGUgcGF0aCB0byBpdGVyYXRlIG92ZXJcbiAqIEBwYXJhbSBpZCAgbm9kZSBpZFxuICpcbiAqIEByZXR1cm5zIHtib29sfSB0cnVlIG9yIGZhbHNlXG4gKi9cbiAgICAuZmlsdGVyKCdub2RlSW5QYXRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHBhdGgsIGlkKSB7XG4gICAgICAgICAgICAvLyBpZiBwYXRoIGV4aXN0cyBhbmQgbm90IGVtcHR5XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhdGggIT09ICd1bmRlZmluZWQnICYmIHBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoLmluZGV4T2YoaWQpID4gLTE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KVxuXG4vKipcbiAqIFRoaXMgZmlsdGVyIGxldHMgeW91IG1hcmsgSFRNTCBhcyDigJxzYWZl4oCdIGZvciBhbmd1bGFyIHRvIHVzZSBhbmQgc2hvdyBvbiBhIHBhZ2UuXG4gKiBPdGhlcndpc2UsIGFuZ3VsYXIgd291bGQganVzdCBzaG93IHRoZSBIVE1MIGFzIHBsYWluIHRleHQuXG4gKi9cbiAgICAuZmlsdGVyKCd0cnVzdEFzSHRtbCcsIGZ1bmN0aW9uKCRzY2UpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gJHNjZS50cnVzdEFzSHRtbDtcbiAgICB9KVxuXG4vKipcbiAqIFBhcnNlIElTTyA4NjAxIGRhdGUgdG8gc3BlY2lmaWVkIGZvcm1hdFxuICogQHBhcmFtIGZvcm1hdCBzdHJpbmcgZXhwZWN0ZWQgZGF0ZSBmb3JtYXRcbiAqL1xuICAgIC5maWx0ZXIoJ2Zvcm1hdERhdGUnLCBmdW5jdGlvbigkZmlsdGVyKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGVTVFIsIGZvcm1hdCkge1xuICAgICAgICAgICAgdmFyIGQgPSBEYXRlLnBhcnNlKGRhdGVTVFIpO1xuICAgICAgICAgICAgaWYgKCFmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSAneXl5eS1NTS1kZCBoaDptbTpzcyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJGZpbHRlcignZGF0ZScpKGQsIGZvcm1hdCk7XG4gICAgICAgIH07XG4gICAgfSlcblxuLyoqXG4gKiBSZW1vdmUgaHRtbCB0YWdzLCBhbmQgdHJpbSBzdHJpbmcgdG8gZ2l2ZW4gbGVuZ3RoIHdpdGhvdXQgYnJlYWtpbmcgd29yZHNcbiAqIEBwYXJhbSBsZW4gZXhwZWN0ZWQgbGVuZ3RoXG4gKi9cbiAgICAuZmlsdGVyKCdzdHJpcFRhZ3NBbmRUcmltJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHN0ciwgbGVuKSB7XG4gICAgICAgICAgICBzdHIgPSBzdHIucmVwbGFjZSgvPFxcLz9bXj5dKyg+fCQpL2csICcnKS5zdWJzdHIoMCwgbGVuKTtcbiAgICAgICAgICAgIHN0ciA9IHN0ci5zdWJzdHIoMCwgTWF0aC5taW4oc3RyLmxlbmd0aCwgc3RyLmxhc3RJbmRleE9mKCcgJykpKTtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH07XG4gICAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJy4vZmlsdGVycy9Db3JlRmlsdGVycy5qcycpO1xuXG5hbmd1bGFyLm1vZHVsZSgnYWRtaW4uY29yZScsIFsnQ29yZUZpbHRlcnMnXSlcbiAgICAuY29udHJvbGxlcignQ29yZUN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL0NvcmVDdHJsLmpzJykpXG4gICAgLmZhY3RvcnkoJ0xhbmdSZXBvc2l0b3J5JywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9MYW5nUmVwb3NpdG9yeS5qcycpKVxuICAgIC5mYWN0b3J5KCdOYXZCYXInLCByZXF1aXJlKCcuL3NlcnZpY2VzL05hdkJhci5qcycpKVxuICAgIC5mYWN0b3J5KCdUb3BOYXZCYXInLCByZXF1aXJlKCcuL3NlcnZpY2VzL1RvcE5hdkJhci5qcycpKVxuICAgIC5mYWN0b3J5KCdOb3RpZmljYXRpb25zJywgcmVxdWlyZSgnLi4vbGliL05vdGlmaWNhdGlvbnMuanMnKSlcbiAgICAuZmFjdG9yeSgnVHJhbnNsYXRpb25zJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9UcmFuc2xhdGlvbnMuanMnKSlcbiAgICAuZmFjdG9yeSgnU3RvcmFnZScsIHJlcXVpcmUoJy4uL2xpYi9TdG9yYWdlLmpzJykpXG4gICAgLmZhY3RvcnkoJ1V0aWxzJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy9VdGlscy5qcycpKVxuICAgIC5kaXJlY3RpdmUoJ3N0YXRlc0Ryb3Bkb3duJywgWyckZHJvcGRvd24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvU3RhdGVzRHJvcGRvd24uanMnKV0pXG4gICAgLnJ1bihbXG4gICAgICAgICdUb3BOYXZCYXInLFxuICAgICAgICAnVXNlclJlcG9zaXRvcnknLFxuICAgICAgICAnVXRpbHMnLFxuICAgICAgICBmdW5jdGlvbihUb3BOYXZCYXIsIFVzZXJSZXBvc2l0b3J5LCBVdGlscykge1xuXG4gICAgICAgICAgICBVc2VyUmVwb3NpdG9yeS5vbmUoVXRpbHMuQ29uZmlnLmN1cnJlbnRVc2VySWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIHVzZXIuZnVsbE5hbWUgPSB1c2VyLmZpcnN0TmFtZSArICcgJyArIHVzZXIubGFzdE5hbWU7XG5cbiAgICAgICAgICAgICAgICBUb3BOYXZCYXIuYWRkKFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1BBR0VfUFJFVklFVycsXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnLydcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgVG9wTmF2QmFyLmFkZChcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHVzZXIuZnVsbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdjb250ZW50Lmxpc3QnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFRvcE5hdkJhci5hZGRMYXN0Q2hpbGQoXG4gICAgICAgICAgICAgICAgICAgIHVzZXIuZnVsbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnUFJPRklMRScsXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICd1c2VyLmVkaXQoe3VzZXJJZDogJyt1c2VyLmlkKyd9KSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgVG9wTmF2QmFyLmFkZExhc3RDaGlsZChcbiAgICAgICAgICAgICAgICAgICAgdXNlci5mdWxsTmFtZSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdMT0dfT1VUJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvYWRtaW4vbG9nb3V0J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICBdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTGFuZ1JlcG9zaXRvcnkoUmVzdGFuZ3VsYXIpIHtcbiAgICAvKipcbiAgICAgKiBDdXN0b20gbWV0aG9kc1xuICAgICAqL1xuICAgIFJlc3Rhbmd1bGFyLmV4dGVuZE1vZGVsKCdsYW5ncycsIGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIG1vZGVsLnRlc3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAndGVzdCc7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9KTtcblxuICAgIHZhciBhcGkgPSBSZXN0YW5ndWxhci5hbGwoJ2FkbWluL2xhbmdzJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25lOiBmdW5jdGlvbihjb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gYXBpLmdldChjb2RlKTtcbiAgICAgICAgfSxcbiAgICAgICAgbGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gYXBpLmdldExpc3QoKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkxhbmdSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IExhbmdSZXBvc2l0b3J5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBOYXZCYXIoKSB7XG4gICAgLyoqIEB2YXIgTmF2aWdhdGlvbiAqL1xuICAgIHJldHVybiByZXF1aXJlKCcuLi8uLi9saWIvbmF2aWdhdGlvbi5qcycpKCk7XG59XG5cbm1vZHVsZS4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IE5hdkJhcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVG9wTmF2QmFyKCkge1xuICAgIC8qKiBAdmFyIE5hdmlnYXRpb24gKi9cbiAgICByZXR1cm4gcmVxdWlyZSgnLi4vLi4vbGliL25hdmlnYXRpb24uanMnKSgpO1xufVxuXG5tb2R1bGUuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBUb3BOYXZCYXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRyYW5zbGF0aW9ucygkcSwgJHRyYW5zbGF0ZSwgTGFuZ1JlcG9zaXRvcnkpIHtcbiAgICAvL2NyZWF0ZSBkZWZlcnJlZCBwcm9taXNlXG4gICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgIC8vZ2V0IGxhbmd1YWdlc1xuICAgIExhbmdSZXBvc2l0b3J5Lmxpc3QoKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIHZhciBsYW5ndWFnZXMgPSB7fTtcbiAgICAgICAgbGFuZ3VhZ2VzLmxhbmdzID0gcmVzcG9uc2U7XG4gICAgICAgIGxhbmd1YWdlcy5jdXJyZW50TGFuZyA9IGxhbmd1YWdlcy5saXN0TGFuZyA9IHJlc3BvbnNlWzBdO1xuXG4gICAgICAgIC8vIHJlc29sdmUgdGhyIHByb21pc2VcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShsYW5ndWFnZXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJldHVybnMgdGhlIG9iamVjdCBvZiBsYW5ndWFnZXNcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGdldFRyYW5zbGF0aW9uczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNldHMgdGhlIGxhbmd1YWdlIG9mIHRoZSB0cmFuc2xhdGlvbiBmb3IgdGhlIGFuZ3VsYXItdHJhbnNsYXRlIG1vZHVsZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbGFuZyBvYmplY3QgdGhhdCB3aWxsIGJlIHVzZWQgdG8gdHJhbnNsYXRlXG4gICAgICAgICAqL1xuICAgICAgICBzZWxlY3RBZG1pbkxhbmc6IGZ1bmN0aW9uKGxhbmcpIHtcbiAgICAgICAgICAgICR0cmFuc2xhdGUuZmFsbGJhY2tMYW5ndWFnZShbJ2VuX1VTJ10pO1xuICAgICAgICAgICAgJHRyYW5zbGF0ZS51c2UobGFuZy5pMThuKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5UcmFuc2xhdGlvbnMuJGluamVjdCA9IFsnJHEnLCAnJHRyYW5zbGF0ZScsICdMYW5nUmVwb3NpdG9yeSddO1xubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2xhdGlvbnM7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXRpbHMoTm90aWZpY2F0aW9ucywgU3RvcmFnZSwgJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcblxuICAgIHJldHVybiB7XG5cbiAgICAgICAgTm90aWZpY2F0aW9uczogTm90aWZpY2F0aW9ucyxcbiAgICAgICAgU3RvcmFnZTogU3RvcmFnZSxcbiAgICAgICAgJHN0YXRlOiAkc3RhdGUsXG4gICAgICAgICRzdGF0ZVBhcmFtczogJHN0YXRlUGFyYW1zLFxuICAgICAgICBDb25maWc6IENvbmZpZ1xuICAgIH07XG5cbn1cblxubW9kdWxlLiRpbmplY3QgPSBbJ05vdGlmaWNhdGlvbnMnLCAnU3RvcmFnZScsICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJ107XG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBOb3RpZmljYXRpb25zKCR0cmFuc2xhdGUpIHtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB3aGljaCBzaG93cyBtZXNzYWdlcyBvZiBnaXZlbiB0eXBlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb24gdXNlZCB0byBzaG93IGVhY2ggbWVzc2FnZVxuICAgICAqIEBwYXJhbSBtZXNzYWdlcyBtZXNzYWdlcyB0byBzaG93XG4gICAgICovXG4gICAgdmFyIGFkZE1lc3NhZ2VzID0gZnVuY3Rpb24oY2FsbGJhY2ssIG1lc3NhZ2VzKSB7XG4gICAgICAgIF8uZm9yRWFjaChtZXNzYWdlcywgZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG1lc3NhZ2VzWzBdKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgbXVsdGlwbGUgQW5ndWxhclN0cmFwIGluZm8gdHlwZSBhbGVydHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG1lc3NhZ2VzIHRyYW5zbGF0YWJsZSBtZXNzYWdlcyB0byBzaG93XG4gICAgICAgICAqL1xuICAgICAgICBhZGRJbmZvczogZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGFkZE1lc3NhZ2VzKHNlbGYuYWRkSW5mbywgbWVzc2FnZXMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgbXVsdGlwbGUgQW5ndWxhclN0cmFwIGRhbmdlciB0eXBlIGFsZXJ0c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZXMgdHJhbnNsYXRhYmxlIG1lc3NhZ2VzIHRvIHNob3dcbiAgICAgICAgICovXG4gICAgICAgIGFkZEVycm9yczogZnVuY3Rpb24obWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGFkZE1lc3NhZ2VzKHNlbGYuYWRkRXJyb3IsIG1lc3NhZ2VzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIG11bHRpcGxlIEFuZ3VsYXJTdHJhcCB3YXJuaW5nIHR5cGUgYWxlcnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlcyB0cmFuc2xhdGFibGUgbWVzc2FnZXMgdG8gc2hvd1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkV2FybmluZ3M6IGZ1bmN0aW9uKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBhZGRNZXNzYWdlcyhzZWxmLmFkZFdhcm5pbmcsIG1lc3NhZ2VzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIG11bHRpcGxlIEFuZ3VsYXJTdHJhcCBzdWNjZXNzIHR5cGUgYWxlcnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlcyB0cmFuc2xhdGFibGUgbWVzc2FnZXMgdG8gc2hvd1xuICAgICAgICAgKi9cbiAgICAgICAgYWRkU3VjY2Vzc2VzOiBmdW5jdGlvbihtZXNzYWdlcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgYWRkTWVzc2FnZXMoc2VsZi5hZGRTdWNjZXNzLCBtZXNzYWdlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIGluZm8gdHlwZSBhbGVydFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZSBzdHJpbmcgZWcuICdDT01NT05fRVJST1InXG4gICAgICAgICAqL1xuICAgICAgICBhZGRJbmZvOiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBOb3RpZnkoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAkdHJhbnNsYXRlLmluc3RhbnQoJ0lORk9STUFUSU9OJykgKyAnOicsXG4gICAgICAgICAgICAgICAgdGV4dDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdpbmZvJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIGRhbmdlciB0eXBlIGFsZXJ0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlIHN0cmluZyBlZy4gJ0NPTU1PTl9FUlJPUidcbiAgICAgICAgICovXG4gICAgICAgIGFkZEVycm9yOiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBOb3RpZnkoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAkdHJhbnNsYXRlLmluc3RhbnQoJ0VSUk9SJykgKyAnOicsXG4gICAgICAgICAgICAgICAgdGV4dDogJHRyYW5zbGF0ZS5pbnN0YW50KG1lc3NhZ2UpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLXRpbWVzJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBzaG93cyB0aGUgQW5ndWxhclN0cmFwIHdhcm5pbmcgdHlwZSBhbGVydFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZSBzdHJpbmcgZWcuICdDT01NT05fRVJST1InXG4gICAgICAgICAqL1xuICAgICAgICBhZGRXYXJuaW5nOiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBOb3RpZnkoe1xuICAgICAgICAgICAgICAgIHRpdGxlOiAkdHJhbnNsYXRlLmluc3RhbnQoJ1dBUk5JTkcnKSArICc6JyxcbiAgICAgICAgICAgICAgICB0ZXh0OiAkdHJhbnNsYXRlLmluc3RhbnQobWVzc2FnZSksXG4gICAgICAgICAgICAgICAgdHlwZTogJ3dhcm5pbmcnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHNob3dzIHRoZSBBbmd1bGFyU3RyYXAgc3VjY2VzcyB0eXBlIGFsZXJ0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBtZXNzYWdlIHRyYW5zbGF0YWJsZSBtZXNzYWdlIHN0cmluZyBlZy4gJ0NPTU1PTl9FUlJPUidcbiAgICAgICAgICovXG4gICAgICAgIGFkZFN1Y2Nlc3M6IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUE5vdGlmeSh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICR0cmFuc2xhdGUuaW5zdGFudCgnU1VDQ0VTUycpICsgJzonLFxuICAgICAgICAgICAgICAgIHRleHQ6ICR0cmFuc2xhdGUuaW5zdGFudChtZXNzYWdlKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VjY2VzcydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxubW9kdWxlLiRpbmplY3QgPSBbJyR0cmFuc2xhdGUnXTtcbm1vZHVsZS5leHBvcnRzID0gTm90aWZpY2F0aW9ucztcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3RvcmFnZSgpIHtcbiAgICB2YXIgc3RvcmFnZUl0ZW1zID0ge307XG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgc3BlY2lmaWVkIG9iamVjdCB0byB0aGUgc3RvcmFnZUl0ZW1zXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIHNldFN0b3JhZ2VJdGVtOiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJdGVtcyA9ICAgXy5tZXJnZShzdG9yYWdlSXRlbXMsIG9iamVjdCwgZnVuY3Rpb24ob2JqZWN0VmFsdWUsIHNvdXJjZVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheShvYmplY3RWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICBzb3VyY2VWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJldHVybnMgdGhlIHNwZWNpZmllZCBvYmplY3QgZnJvbSB0aGUgc3RvcmFnZUl0ZW1zXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0U3RvcmFnZUl0ZW06IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gc3RvcmFnZUl0ZW1zW2luZGV4XTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIHJlbW92ZXMgc3BlY2lmaWVkIG9iamVjdCBmcm9tIHRoZSBzdG9yYWdlSXRlbXNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGluZGV4XG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVTdG9yYWdlSXRlbTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJdGVtcyA9IF8ub21pdChzdG9yYWdlSXRlbXMsIGluZGV4KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblN0b3JhZ2UuJGluamVjdCA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlO1xuIiwiZnVuY3Rpb24gTmF2aWdhdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIGNoZWNrcyBpZiAnaXRlbScgc3RydWN0dXJlIGlzIHZhbGlkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB2YXIgY2hlY2tTdHJ1Y3R1cmUgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGlmIChfLmhhcyhpdGVtLCAnZGl2aWRlcicpKSB7XG4gICAgICAgICAgICBpZiAoaXRlbS5kaXZpZGVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9wZXJ0eTogJyArICdcXCdkaXZpZGVyXFwnJyArICcgbXVzdCBiZSBzZXQgdG8gXFwndHJ1ZVxcJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFfLmhhcyhpdGVtLCAndGl0bGUnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9wZXJ0eTogJyArICd0aXRsZScgKyAnIGlzIG1pc3NpbmcnKTtcbiAgICAgICAgfSBlbHNlIGlmICghXy5oYXMoaXRlbSwgJ2FjdGlvbicpICYmICFfLmhhcyhpdGVtLCAnaHJlZicpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb3BlcnR5OiAnICsgJ1xcJ2FjdGlvblxcJyBvciBcXCdocmVmXFwnJyArICcgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiByZXR1cm5zIGNoaWxkcmVuIG9mIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgdmFyIGdldENoaWxkcmVuID0gZnVuY3Rpb24odGl0bGUpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW10sXG4gICAgICAgICAgICBmb3VuZEZsYWcgPSBmYWxzZTtcbiAgICAgICAgXy5mb3JFYWNoKGl0ZW1zLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS50aXRsZSA9PT0gdGl0bGUpIHtcbiAgICAgICAgICAgICAgICBmb3VuZEZsYWcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChfLmhhcyh2YWx1ZSwgJ2NoaWxkcmVuJykgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZS5jaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW4gPSB2YWx1ZS5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGZvdW5kRmxhZyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGFyZW50OiBcXCcnICsgdGl0bGUgKyAnXFwnIGhhdmUgbm8gY2hpbGRyZW4sIGJlY2F1c2UgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiBhZGRzIGVsZW1lbnQgYWNjb3JkaW5nIHRvICdwb3NpdGlvbicgYXJndW1lbnRcbiAgICAgKiBwb3NpdGlvbiA9ICdiZWZvcmUnIC0gZWxlbWVudCB3aWxsIGJlIGFkZGVkIGJlZm9yZSBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICogcG9zaXRpb24gPSAnYWZ0ZXInIC0gZWxlbWVudCB3aWxsIGJlIGFkZGVkIGFmdGVyIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICd0aXRsZSdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgKiBAcGFyYW0gcG9zaXRpb24gc3RyaW5nXG4gICAgICovXG4gICAgdmFyIGFkZEJlZm9yZUFmdGVyID0gZnVuY3Rpb24odGl0bGUsIGl0ZW0sIHBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcG9zaXRpb24gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIGlzIHJlcXVpcmVkLCB2YWx1ZXM6IFxcJ2JlZm9yZVxcJyBvciBcXCdhZnRlclxcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwb3NpdGlvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgXFwncG9zaXRpb25cXCcgbXVzdCBiZSBvZiBzdHJpbmcgdHlwZSwgdmFsdWVzOiBcXCdiZWZvcmVcXCcgb3IgXFwnYWZ0ZXJcXCcnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgIHZhciBmb3VuZEZsYWcgPSBmYWxzZTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChpdGVtcywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnRpdGxlID09PSB0aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZEZsYWcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT09ICdiZWZvcmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXgsIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnYWZ0ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5zcGxpY2UoaW5kZXggKyAxLCAwLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZm91bmRGbGFnID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRWxlbWVudDogXFwnJyArIHRpdGxlICsgJ1xcJyBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiBhZGRzIGNoaWxkIGxpbmsgYWNjb3JkaW5nIHRvICdwb3NpdGlvbicgYXJndW1lbnRcbiAgICAgKiBwb3NpdGlvbiA9IHRydWUgLSBjaGlsZCB3aWxsIGJlIGFkZGVkIGFzIGZpcnN0IGVsZW1lbnRcbiAgICAgKiBwb3NpdGlvbiA9IGZhbHNlIC0gY2hpbGQgd2lsbCBiZSBhZGRlZCBhcyBsYXN0IGVsZW1lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICogQHBhcmFtIHBvc2l0aW9uIGJvb2xlYW5cbiAgICAgKi9cbiAgICB2YXIgYWRkQ2hpbGQgPSBmdW5jdGlvbihwYXJlbnQsIGl0ZW0sIHBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcG9zaXRpb24gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwb3NpdGlvbiAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIG11c3QgYmUgb2YgYm9vbGVhbiB0eXBlJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoZWNrU3RydWN0dXJlKGl0ZW0pKSB7XG4gICAgICAgICAgICB2YXIgZm91bmRGbGFnID0gZmFsc2U7XG4gICAgICAgICAgICBfLmZvckVhY2goaXRlbXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS50aXRsZSA9PT0gcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghXy5oYXModmFsdWUsICdjaGlsZHJlbicpIHx8ICFBcnJheS5pc0FycmF5KHZhbHVlLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUuY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmNoaWxkcmVuLnVuc2hpZnQoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5jaGlsZHJlbi5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kRmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChmb3VuZEZsYWcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJlbnQ6IFxcJycgKyBwYXJlbnQgKyAnXFwnIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIGFkZHMgY2hpbGQgbGluayBhY2NvcmRpbmcgdG8gJ3Bvc2l0aW9uJyBhcmd1bWVudFxuICAgICAqIHBvc2l0aW9uID0gJ2JlZm9yZScgLSBjaGlsZCB3aWxsIGJlIGFkZGVkIGJlZm9yZSBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICogcG9zaXRpb24gPSAnYWZ0ZXInIC0gY2hpbGQgd2lsbCBiZSBhZGRlZCBhZnRlciBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyZW50IHN0cmluZ1xuICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgKiBAcGFyYW0gcG9zaXRpb24gc3RyaW5nXG4gICAgICovXG4gICAgdmFyIGFkZEJlZm9yZUFmdGVyQ2hpbGQgPSBmdW5jdGlvbihwYXJlbnQsIHRpdGxlLCBpdGVtLCBwb3NpdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIHBvc2l0aW9uID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBcXCdwb3NpdGlvblxcJyBpcyByZXF1aXJlZCwgdmFsdWVzOiBcXCdiZWZvcmVcXCcgb3IgXFwnYWZ0ZXJcXCcnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcG9zaXRpb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IFxcJ3Bvc2l0aW9uXFwnIG11c3QgYmUgb2Ygc3RyaW5nIHR5cGUsIHZhbHVlczogXFwnYmVmb3JlXFwnIG9yIFxcJ2FmdGVyXFwnJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoZWNrU3RydWN0dXJlKGl0ZW0pKSB7XG4gICAgICAgICAgICB2YXIgZm91bmRGbGFnID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgY2hpbGRyZW4gPSBnZXRDaGlsZHJlbihwYXJlbnQpO1xuXG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJlbnQ6IFxcJycgKyBwYXJlbnQgKyAnXFwnIGhhdmUgbm8gY2hpbGRyZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF8uZm9yRWFjaChjaGlsZHJlbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnRpdGxlID09PSB0aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZEZsYWcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT09ICdiZWZvcmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnYWZ0ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbi5zcGxpY2UoaW5kZXggKyAxLCAwLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZm91bmRGbGFnID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2hpbGQ6IFxcJycgKyB0aXRsZSArICdcXCcgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50IHRvIHRoZSBlbmQgb2YgbWVudVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZDogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgaWYgKGNoZWNrU3RydWN0dXJlKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgZWxlbWVudCB0byB0aGUgbWVudSBhcyBmaXJzdFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gaXRlbSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGFkZEZpcnN0OiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tTdHJ1Y3R1cmUoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBlbGVtZW50ICdpdGVtJyB0byB0aGUgbWVudSBiZWZvcmUgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQmVmb3JlOiBmdW5jdGlvbih0aXRsZSwgaXRlbSkge1xuICAgICAgICAgICAgYWRkQmVmb3JlQWZ0ZXIodGl0bGUsIGl0ZW0sICdiZWZvcmUnKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGFkZHMgZWxlbWVudCAnaXRlbScgdG8gdGhlIG1lbnUgYWZ0ZXIgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBuZXdJdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQWZ0ZXI6IGZ1bmN0aW9uKHRpdGxlLCBuZXdJdGVtKSB7XG4gICAgICAgICAgICBhZGRCZWZvcmVBZnRlcih0aXRsZSwgbmV3SXRlbSwgJ2FmdGVyJyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBhZGRzIGNoaWxkIGxpbmsgYXMgZmlyc3QgdG8gdGhlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICdwYXJlbnQnIGFyZ3VtZW50XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkRmlyc3RDaGlsZDogZnVuY3Rpb24ocGFyZW50LCBpdGVtKSB7XG4gICAgICAgICAgICBhZGRDaGlsZChwYXJlbnQsIGl0ZW0sIHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBjaGlsZCBsaW5rIGFzIGxhc3QgdG8gdGhlIGVsZW1lbnQgc3BlY2lmaWVkIGJ5ICdwYXJlbnQnIGFyZ3VtZW50XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkTGFzdENoaWxkOiBmdW5jdGlvbihwYXJlbnQsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZENoaWxkKHBhcmVudCwgaXRlbSwgZmFsc2UpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBsaW5rIHRvIHRoZSBlbGVtZW50IHNwZWNpZmllZCBieSAncGFyZW50JyBiZWZvcmUgY2hpbGQgZWxlbWVudCBzcGVjaWZpZWQgYnkgJ3RpdGxlJ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gcGFyZW50IHN0cmluZ1xuICAgICAgICAgKiBAcGFyYW0gdGl0bGUgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSBpdGVtIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQmVmb3JlQ2hpbGQ6IGZ1bmN0aW9uKHBhcmVudCwgdGl0bGUsIGl0ZW0pIHtcbiAgICAgICAgICAgIGFkZEJlZm9yZUFmdGVyQ2hpbGQocGFyZW50LCB0aXRsZSwgaXRlbSwgJ2JlZm9yZScpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gYWRkcyBsaW5rIHRvIHRoZSBlbGVtZW50IHNwZWNpZmllZCBieSAncGFyZW50JyBhZnRlciBjaGlsZCBlbGVtZW50IHNwZWNpZmllZCBieSAndGl0bGUnXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnQgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSB0aXRsZSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIGl0ZW0gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBhZGRBZnRlckNoaWxkOiBmdW5jdGlvbihwYXJlbnQsIHRpdGxlLCBpdGVtKSB7XG4gICAgICAgICAgICBhZGRCZWZvcmVBZnRlckNoaWxkKHBhcmVudCwgdGl0bGUsIGl0ZW0sICdhZnRlcicpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcmV0dXJuIGl0ZW1zIGZyb20gbWVudVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICAgICAqL1xuICAgICAgICBnZXRJdGVtczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBleHBvcnRzIGxpbmtzIHRvICdkcm9wZG93bicgbWVudVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICAgICAqL1xuICAgICAgICBleHBvcnRUb0Ryb3Bkb3duTWVudTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgdmFyIG5ld0l0ZW0gPSB7fTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChpdGVtcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBfLmZvckluKHZhbHVlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09ICd0aXRsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0udGV4dCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gobmV3SXRlbSk7XG4gICAgICAgICAgICAgICAgbmV3SXRlbSA9IHt9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgfVxuICAgIH07XG59XG5tb2R1bGUuZXhwb3J0cyA9IE5hdmlnYXRpb247XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyTGlzdEN0cmwoJHNjb3BlLCBVdGlscywgVXNlclJlcG9zaXRvcnksICRtb2RhbCkge1xuICAgIHZhciB2bSA9IHRoaXM7XG4gICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL3VzZXIvZGlyZWN0aXZlcy8nO1xuICAgIC8vIERlbGV0ZSBtb2RhbFxuICAgIHZtLmRlbGV0ZU1vZGFsID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gaW5pdGlhdGVzIHRoZSBBbmd1bGFyU3RyYXAgbW9kYWxcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRpdGxlIHRyYW5zbGF0YWJsZSB0aXRsZSBvZiBtb2RhbFxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSB0cmFuc2xhdGFibGUgbWVzc2FnZXMgb2YgbW9kYWxcbiAgICAgICAgICovXG4gICAgICAgIGluaXRNb2RhbDogZnVuY3Rpb24odGl0bGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYubW9kYWwgPSAkbW9kYWwoe1xuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ3VzZXJEZWxldGVNb2RhbC50cGwuaHRtbCcsXG4gICAgICAgICAgICAgICAgc2hvdzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6ICdjZW50ZXInXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gc2hvd3MgdGhlIEFuZ3VsYXJTdHJhcCBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdXNlcklkIHVzZXIgaWQgdG8gYmUgcmVtb3ZlZCwgaXQgaXMgc2F2ZWQgaW4gdGhlIHNjb3BlXG4gICAgICAgICAqL1xuICAgICAgICBzaG93TW9kYWw6IGZ1bmN0aW9uKHVzZXJJZCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdm0udXNlcklkID0gdXNlcklkO1xuICAgICAgICAgICAgc2VsZi5pbml0TW9kYWwoJ1BMRUFTRV9DT05GSVJNJywgJ0RFTEVURV9VU0VSX1FVRVNUSU9OJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgKlxuICAgICAgICAgKi9cbiAgICAgICAgY2xvc2VNb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gcGVyZm9ybXMgdGhlIFJlc3RBbmd1bGFyIERFTEVURSBhY3Rpb24gZm9yIHVzZXIgaWQgaW4gc2NvcGVcbiAgICAgICAgICpcbiAgICAgICAgICovXG4gICAgICAgIGRlbGV0ZVVzZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgVXNlclJlcG9zaXRvcnkuZGVsZXRlKHZtLnVzZXJJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuY2xvc2VNb2RhbCgpO1xuICAgICAgICAgICAgICAgIFV0aWxzLiRzdGF0ZS5nbyhVdGlscy4kc3RhdGUuY3VycmVudCwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9O1xufVxuXG5Vc2VyTGlzdEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ1V0aWxzJywgJ1VzZXJSZXBvc2l0b3J5JywgJyRtb2RhbCddO1xubW9kdWxlLmV4cG9ydHMgPSBVc2VyTGlzdEN0cmw7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyRGV0YWlsc0N0cmwoJHNjb3BlLCBVdGlscywgVXNlclJlcG9zaXRvcnkpIHtcbiAgICAvLyBnZXQgc2luZ2xlIHVzZXJcbiAgICBVc2VyUmVwb3NpdG9yeS5vbmUoVXRpbHMuJHN0YXRlUGFyYW1zLnVzZXJJZCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAkc2NvcGUudXNlciA9IFVzZXJSZXBvc2l0b3J5LmNsZWFuKHJlc3BvbnNlKTtcbiAgICB9KTtcbn1cblVzZXJEZXRhaWxzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnVXNlclJlcG9zaXRvcnknXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlckRldGFpbHNDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlckRldGFpbHNDdHJsKCRzY29wZSwgVXNlclJlcG9zaXRvcnksIFV0aWxzKSB7XG4gICAgLy8gZ2V0IHNpbmdsZSB1c2VyXG4gICAgVXNlclJlcG9zaXRvcnkub25lKFV0aWxzLiRzdGF0ZVBhcmFtcy51c2VySWQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBVc2VyUmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2F2ZVVzZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgVXNlclJlcG9zaXRvcnkudXBkYXRlKCRzY29wZS51c2VyLmlkLCAkc2NvcGUudXNlcikudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgVXRpbHMuJHN0YXRlLmdvKCd1c2VyLmxpc3QnKTtcbiAgICAgICAgICAgIFV0aWxzLk5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcygnVEhFX0NIQU5HRVNfSEFWRV9CRUVOX1NBVkVEJyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbn1cblVzZXJEZXRhaWxzQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXNlclJlcG9zaXRvcnknLCAnVXRpbHMnXTtcbm1vZHVsZS5leHBvcnRzID0gVXNlckRldGFpbHNDdHJsO1xuIiwiLyoqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgR1pFUk8gQ01TIHBhY2thZ2UuXG4gKlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXcgdGhlIExJQ0VOU0VcbiAqIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICpcbiAqIENsYXNzIFVzZXJDb250cm9sbGVyXG4gKlxuICogQHBhY2thZ2UgICAgQWRtaW5cbiAqIEBhdXRob3IgICAgIE1hdGV1c3ogVXJiYW5vd2ljeiA8dXJiYW5vd2ljem1hdGV1c3o4OUBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICBDb3B5cmlnaHQgKGMpIDIwMTUsIE1hdGV1c3ogVXJiYW5vd2ljelxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVXNlckxpc3RDdHJsKCRzY29wZSwgVXRpbHMsICRyb290U2NvcGUsIFVzZXJSZXBvc2l0b3J5LCBOZ1RhYmxlUGFyYW1zKSB7XG4gICAgJHNjb3BlLnRhYmxlUGFyYW1zID0gbmV3IE5nVGFibGVQYXJhbXMoe1xuICAgICAgICBjb3VudDogMjUsIC8vIGNvdW50IHBlciBwYWdlXG4gICAgICAgIHNvcnRpbmc6IHtcbiAgICAgICAgICAgICdpZCc6ICdkZXNjJyAvLyBpbml0aWFsIHNvcnRpbmdcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAgdG90YWw6IDAsIC8vIGxlbmd0aCBvZiBkYXRhXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCRkZWZlciwgcGFyYW1zKSB7XG4gICAgICAgICAgICAvLyBwcmVwYXJlIG9wdGlvbnMgdG8gYmUgc2VudCB0byBhcGlcbiAgICAgICAgICAgIHZhciBxdWVyeU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbGFuZzogJHNjb3BlLmxpc3RMYW5nLmNvZGUsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3VzZXInXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBwYXJhbXMuY291bnQoKSAtIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSBkZWNsYXJlZCBpbiB2aWV3XG4gICAgICAgICAgICBpZiAodHlwZW9mIFV0aWxzLiRzdGF0ZVBhcmFtcy5wZXJQYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5jb3VudChVdGlscy4kc3RhdGVQYXJhbXMucGVyUGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBlclBhZ2UgPSBwYXJhbXMuY291bnQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyYW1zLnBhZ2UoKSAtIGN1cnJlbnQgcGFnZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBVdGlscy4kc3RhdGVQYXJhbXMucGFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMucGFnZShVdGlscy4kc3RhdGVQYXJhbXMucGFnZSk7XG4gICAgICAgICAgICAgICAgcXVlcnlPcHRpb25zLnBhZ2UgPSBwYXJhbXMucGFnZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0YWJsZVBhcmFtcy5vcmRlckJ5KCkgLSBhbiBhcnJheSBvZiBzdHJpbmcgaW5kaWNhdGluZyBib3RoIHRoZSBzb3J0aW5nIGNvbHVtbiBhbmQgZGlyZWN0aW9uIChlLmcuIFtcIituYW1lXCIsIFwiLWVtYWlsXCJdKVxuICAgICAgICAgICAgaWYgKHBhcmFtcy5zb3J0aW5nKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IGludGVyZXN0ZWQgaW4gZmlyc3Qgc29ydCBjb2x1bW4gZm9yIG5vd1xuICAgICAgICAgICAgICAgIHZhciBvcmRlckJ5ID0gcGFyYW1zLm9yZGVyQnkoKVswXTtcbiAgICAgICAgICAgICAgICBxdWVyeU9wdGlvbnMuc29ydCA9IG9yZGVyQnlbMF0gPT09ICcrJyA/IG9yZGVyQnkuc3Vic3RyaW5nKDEpIDogb3JkZXJCeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZ2V0IGxpc3QgYnkgZGVmYXVsdFxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBVc2VyUmVwb3NpdG9yeS5saXN0KHF1ZXJ5T3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIENvbnRlbnRzIGlzIGEgUkVTVCBBbmd1bGFySlMgc2VydmljZSB0aGF0IHRhbGtzIHRvIGFwaSBhbmQgcmV0dXJuIHByb21pc2VcbiAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHBhcmFtcy50b3RhbChyZXNwb25zZS5tZXRhLnRvdGFsKTtcbiAgICAgICAgICAgICAgICAkZGVmZXIucmVzb2x2ZShVc2VyUmVwb3NpdG9yeS5jbGVhbihyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5tZXRhID0gcmVzcG9uc2UubWV0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblVzZXJMaXN0Q3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnVXRpbHMnLCAnJHJvb3RTY29wZScsICdVc2VyUmVwb3NpdG9yeScsICduZ1RhYmxlUGFyYW1zJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJMaXN0Q3RybDtcbiIsIi8qKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIEdaRVJPIENNUyBwYWNrYWdlLlxuICpcbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3IHRoZSBMSUNFTlNFXG4gKiBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqXG4gKiBDbGFzcyBVc2VyQ29udHJvbGxlclxuICpcbiAqIEBwYWNrYWdlICAgIEFkbWluXG4gKiBAYXV0aG9yICAgICBNYXRldXN6IFVyYmFub3dpY3ogPHVyYmFub3dpY3ptYXRldXN6ODlAZ21haWwuY29tPlxuICogQGNvcHlyaWdodCAgQ29weXJpZ2h0IChjKSAyMDE1LCBNYXRldXN6IFVyYmFub3dpY3pcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFVzZXJEZWxldGVCdXR0b24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHRydWUsXG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdVc2VyRGVsZXRlQ3RybCcsXG4gICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSwvLyBiZWNhdXNlIHRoZSBzY29wZSBpcyBpc29sYXRlZFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIFVzZXJEZWxldGVDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgYSBkZWxldGUgbW9kYWwgZnJvbSBhIGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICBVc2VyRGVsZXRlQ29udHJvbGxlci5kZWxldGVNb2RhbC5zaG93TW9kYWwoYXR0cnMudXNlcklkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuVXNlckRlbGV0ZUJ1dHRvbi4kaW5qZWN0ID0gW107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJEZWxldGVCdXR0b247XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhZG1pbi51c2VyJywgWyduZ1RhYmxlJ10pXG4gICAgLmNvbmZpZyhbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgICckdXJsUm91dGVyUHJvdmlkZXInLFxuICAgICAgICAnUmVzdGFuZ3VsYXJQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsIFJlc3Rhbmd1bGFyUHJvdmlkZXIpIHtcblxuICAgICAgICAgICAgdmFyIHZpZXdQYXRoID0gJ2d6ZXJvL2FkbWluL3ZpZXdzL3VzZXIvJztcblxuICAgICAgICAgICAgLy8gTm93IHNldCB1cCB0aGUgc3RhdGVzXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgIC5zdGF0ZSgndXNlcicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3VzZXInLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnaW5kZXguaHRtbCdcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdGF0ZSgndXNlci5zaG93Jywge1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcve3VzZXJJZH0vc2hvdycsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnc2hvdy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVXNlckRldGFpbHNDdHJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuc3RhdGUoJ3VzZXIuZWRpdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3t1c2VySWR9L2VkaXQnLFxuICAgICAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdQYXRoICsgJ2VkaXQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1VzZXJFZGl0Q3RybCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0YXRlKCd1c2VyLmxpc3QnLCB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJy9saXN0L3t1c2VySWR9P3BhZ2UmcGVyUGFnZScsXG4gICAgICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY29udGVudCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdmlld1BhdGggKyAnbGlzdC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmNvbnRyb2xsZXIoJ1VzZXJMaXN0Q3RybCcsIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvVXNlckxpc3RDdHJsJykpXG4gICAgLmNvbnRyb2xsZXIoJ1VzZXJEZWxldGVDdHJsJywgcmVxdWlyZSgnLi9jb250cm9sbGVycy9Vc2VyRGVsZXRlQ3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdVc2VyRWRpdEN0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL1VzZXJFZGl0Q3RybCcpKVxuICAgIC5jb250cm9sbGVyKCdVc2VyRGV0YWlsc0N0cmwnLCByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL1VzZXJEZXRhaWxzQ3RybCcpKVxuICAgIC5mYWN0b3J5KCdVc2VyUmVwb3NpdG9yeScsIHJlcXVpcmUoJy4vc2VydmljZXMvVXNlclJlcG9zaXRvcnkuanMnKSlcbiAgICAuZGlyZWN0aXZlKCd1c2VyRGVsZXRlQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL1VzZXJEZWxldGVCdXR0b24uanMnKSlcbiAgICAucnVuKFtcbiAgICAgICAgJ05hdkJhcicsXG4gICAgICAgIGZ1bmN0aW9uKE5hdkJhcikge1xuICAgICAgICAgICAgTmF2QmFyLmFkZCh7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICdVU0VSUycsIGFjdGlvbjogJ3VzZXIubGlzdCcsIGljb246ICdmYSBmYS11c2VyJ1xuICAgICAgICAgICAgICAgIC8vY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAgICAvLyAgICB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgIHRpdGxlOiAnVVNFUl9MSVNUJyxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgYWN0aW9uOiAndXNlci5saXN0JyxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgaWNvbjogJ2ZhIGZhLXRoJ1xuICAgICAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgICAgICAvL11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4iLCIvKipcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBHWkVSTyBDTVMgcGFja2FnZS5cbiAqXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2UgdmlldyB0aGUgTElDRU5TRVxuICogZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKlxuICogQ2xhc3MgVXNlckNvbnRyb2xsZXJcbiAqXG4gKiBAcGFja2FnZSAgICBBZG1pblxuICogQGF1dGhvciAgICAgTWF0ZXVzeiBVcmJhbm93aWN6IDx1cmJhbm93aWN6bWF0ZXVzejg5QGdtYWlsLmNvbT5cbiAqIEBjb3B5cmlnaHQgIENvcHlyaWdodCAoYykgMjAxNSwgTWF0ZXVzeiBVcmJhbm93aWN6XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBVc2VyUmVwb3NpdG9yeShSZXN0YW5ndWxhcikge1xuICAgIHZhciBhcGkgPSAnYWRtaW4vdXNlcnMnO1xuICAgIHZhciB1c2VycyA9IFJlc3Rhbmd1bGFyLmFsbChhcGkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG9uZTogZnVuY3Rpb24oaWQsIHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZShhcGksIGlkKS5nZXQocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgdHJlZTogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSkuZ2V0TGlzdCgndHJlZScsIHBhcmFtcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGxpc3Q6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIHVzZXJzLmdldExpc3QocGFyYW1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYW46IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5zdHJpcFJlc3Rhbmd1bGFyKGVsZW0pO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGU6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLnJlbW92ZSgpO1xuICAgICAgICB9LFxuICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uKGlkLCB1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIub25lKGFwaSwgaWQpLmN1c3RvbVBVVCh1c2VyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cblVzZXJSZXBvc2l0b3J5LiRpbmplY3QgPSBbJ1Jlc3Rhbmd1bGFyJ107XG5tb2R1bGUuZXhwb3J0cyA9IFVzZXJSZXBvc2l0b3J5O1xuIl19
