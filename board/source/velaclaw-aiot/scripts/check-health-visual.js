const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const profiles = {
  xiaomi_band: { width: 192, height: 490 },
  xiaomi_band_10: { width: 212, height: 520 }
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

function decodePng(filePath) {
  const source = fs.readFileSync(filePath)
  const signature = '89504e470d0a1a0a'
  if (source.subarray(0, 8).toString('hex') !== signature) throw new Error('not a PNG file')

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat = []
  while (offset < source.length) {
    const length = source.readUInt32BE(offset)
    const type = source.subarray(offset + 4, offset + 8).toString('ascii')
    const data = source.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += length + 12
  }

  if (bitDepth !== 8 || colorType !== 6) throw new Error('expected an 8-bit RGBA emulator screenshot')
  const packed = zlib.inflateSync(Buffer.concat(idat))
  const bytesPerPixel = 4
  const stride = width * bytesPerPixel
  const pixels = Buffer.alloc(stride * height)
  let inputOffset = 0

  for (let y = 0; y < height; y++) {
    const filter = packed[inputOffset++]
    const rowOffset = y * stride
    for (let x = 0; x < stride; x++) {
      const raw = packed[inputOffset++]
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0
      const up = y > 0 ? pixels[rowOffset + x - stride] : 0
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[rowOffset + x - stride - bytesPerPixel] : 0
      let value = raw
      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += Math.floor((left + up) / 2)
      else if (filter === 4) value += paeth(left, up, upperLeft)
      else if (filter !== 0) throw new Error('unsupported PNG filter: ' + filter)
      pixels[rowOffset + x] = value & 255
    }
  }
  return { width: width, height: height, pixels: pixels }
}

function nearColor(pixels, offset, color, tolerance) {
  return Math.abs(pixels[offset] - color[0]) <= tolerance &&
    Math.abs(pixels[offset + 1] - color[1]) <= tolerance &&
    Math.abs(pixels[offset + 2] - color[2]) <= tolerance &&
    pixels[offset + 3] > 200
}

function inspect(device, filePath) {
  const expected = profiles[device]
  if (!expected) throw new Error('unknown device profile: ' + device)
  if (!fs.existsSync(filePath)) throw new Error('screenshot not found: ' + filePath)
  const image = decodePng(filePath)
  const errors = []

  if (image.width !== expected.width || image.height !== expected.height) {
    errors.push('expected ' + expected.width + 'x' + expected.height + ', got ' + image.width + 'x' + image.height)
  }

  const cardColor = [17, 19, 24]
  const accents = {
    heart: [255, 55, 95],
    spo2: [90, 200, 250],
    stress: [191, 90, 242]
  }
  let cardMinX = image.width
  let cardMaxX = -1
  let cardMinY = image.height
  let cardMaxY = -1
  const accentCounts = { heart: 0, spo2: 0, stress: 0 }

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4
      if (nearColor(image.pixels, offset, cardColor, 2)) {
        cardMinX = Math.min(cardMinX, x)
        cardMaxX = Math.max(cardMaxX, x)
        cardMinY = Math.min(cardMinY, y)
        cardMaxY = Math.max(cardMaxY, y)
      }
      Object.keys(accents).forEach(function (name) {
        if (nearColor(image.pixels, offset, accents[name], 5)) accentCounts[name]++
      })
    }
  }

  if (cardMaxX < 0) {
    errors.push('health card background was not detected')
  } else {
    const leftMargin = cardMinX
    const rightMargin = image.width - 1 - cardMaxX
    const centerError = Math.abs((cardMinX + cardMaxX) / 2 - (image.width - 1) / 2)
    if (Math.abs(leftMargin - rightMargin) > 3 || centerError > 1.5) {
      errors.push('cards are horizontally shifted: left=' + leftMargin + ', right=' + rightMargin)
    }
    if (cardMaxX - cardMinX < image.width * 0.72) errors.push('health cards are unexpectedly narrow or cropped')
    if (cardMinY > image.height * 0.25 || cardMaxY < image.height * 0.75) errors.push('three-card vertical composition is missing')
  }

  Object.keys(accentCounts).forEach(function (name) {
    if (accentCounts[name] < 8) errors.push(name + ' card accent was not detected')
  })

  if (errors.length) {
    errors.forEach(function (error) {
      console.error('health visual error [' + device + ']: ' + error)
    })
    return false
  }

  console.log('Health visual passed [' + device + ']: ' + image.width + 'x' + image.height +
    ', card x=' + cardMinX + '..' + cardMaxX + ', center error <= 1.5px')
  return true
}

const candidates = process.argv.slice(2)
if (!candidates.length) {
  console.error('Usage: node scripts/check-health-visual.js xiaomi_band=<png> [xiaomi_band_10=<png>]')
  process.exitCode = 1
} else {
  let passed = true
  candidates.forEach(function (candidate) {
    const separator = candidate.indexOf('=')
    if (separator < 1) {
      console.error('Invalid candidate: ' + candidate)
      passed = false
      return
    }
    const device = candidate.slice(0, separator)
    const filePath = path.resolve(candidate.slice(separator + 1))
    try {
      if (!inspect(device, filePath)) passed = false
    } catch (error) {
      console.error('health visual error [' + device + ']: ' + error.message)
      passed = false
    }
  })
  if (!passed) process.exitCode = 1
}
