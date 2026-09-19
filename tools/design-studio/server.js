#!/usr/bin/env node
/*
 * design-studio / server.js
 * ---------------------------------------------------------------------------
 * A dependency-free static server for the design studio plus two tiny API
 * endpoints so a design survives a cleared browser profile:
 *
 *   GET  /api/health           → { ok, version }
 *   GET  /api/documents        → saved documents under tools/design-studio/documents
 *   POST /api/documents        → { name, document } → writes <slug>.design.json
 *   GET  /api/document?name=   → read one back
 *
 * Everything is local-only: the server binds to 127.0.0.1.
 */

'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

const WEB_ROOT = path.join(__dirname, 'web')
const DOC_ROOT = path.join(__dirname, 'documents')
const PORT = Number(process.env.DESIGN_STUDIO_PORT) || 4174
const HOST = process.env.DESIGN_STUDIO_HOST || '127.0.0.1'
const VERSION = '1.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store'
  })
  res.end(data)
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > (limit || 8 * 1024 * 1024)) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(new Error('JSON 解析失败'))
      }
    })
    req.on('error', reject)
  })
}

function slug(text) {
  return (
    String(text || 'design')
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'design'
  )
}

function staticFile(res, pathname) {
  const relative = pathname === '/' || pathname === '' ? 'index.html' : pathname.replace(/^\/+/, '')
  const resolved = path.resolve(WEB_ROOT, relative)
  if (!resolved.startsWith(WEB_ROOT + path.sep) && resolved !== path.join(WEB_ROOT, 'index.html')) return false
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return false
  const data = fs.readFileSync(resolved)
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream',
    'Content-Length': data.length,
    'Cache-Control': 'no-store'
  })
  res.end(data)
  return true
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`)
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, version: VERSION, webRoot: WEB_ROOT })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/documents') {
      if (!fs.existsSync(DOC_ROOT)) {
        sendJson(res, 200, { documents: [] })
        return
      }
      const documents = fs
        .readdirSync(DOC_ROOT)
        .filter((name) => name.endsWith('.design.json'))
        .map((name) => {
          const stat = fs.statSync(path.join(DOC_ROOT, name))
          return { file: name, name: name.replace(/\.design\.json$/, ''), bytes: stat.size, modifiedAt: stat.mtimeMs }
        })
      sendJson(res, 200, { documents })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/document') {
      const name = slug(url.searchParams.get('name'))
      const file = path.join(DOC_ROOT, `${name}.design.json`)
      if (!file.startsWith(DOC_ROOT + path.sep) || !fs.existsSync(file)) {
        sendJson(res, 404, { error: '未找到该设计' })
        return
      }
      sendJson(res, 200, JSON.parse(fs.readFileSync(file, 'utf8')))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/documents') {
      const body = await readBody(req)
      if (!body || !body.document || !Array.isArray(body.document.pages)) {
        sendJson(res, 400, { error: 'document.pages 缺失' })
        return
      }
      fs.mkdirSync(DOC_ROOT, { recursive: true })
      const name = slug(body.name || (body.document && body.document.name))
      const file = path.join(DOC_ROOT, `${name}.design.json`)
      fs.writeFileSync(
        file,
        JSON.stringify({ schema: 'designstudio/document/v1', savedAt: new Date().toISOString(), document: body.document }, null, 2),
        'utf8'
      )
      sendJson(res, 200, { saved: true, file: path.relative(path.join(__dirname, '..', '..'), file).replace(/\\/g, '/') })
      return
    }

    if (req.method === 'GET' && staticFile(res, url.pathname)) return
    if (req.method === 'GET') {
      // Unknown extension-less paths fall back to the app shell so deep links
      // like /?page=abc keep working.
      if (!path.extname(url.pathname) && staticFile(res, '/index.html')) return
    }
    sendJson(res, 404, { error: 'Not found', path: url.pathname })
  } catch (error) {
    sendJson(res, 500, { error: String((error && error.message) || error) })
  }
}

function start() {
  const server = http.createServer(handler)
  server.listen(PORT, HOST, () => {
    const url = `http://${HOST}:${PORT}`
    process.stdout.write(`\n  Design Studio · JSON 型提示词生成器\n`)
    process.stdout.write(`  ${url}\n`)
    process.stdout.write(`  文档目录 ${DOC_ROOT}\n`)
    process.stdout.write(`  按 Ctrl+C 停止\n\n`)
    if (process.argv.includes('--no-open')) return
    const command =
      process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`
    const { spawn } = require('child_process')
    try {
      spawn(command, { shell: true, stdio: 'ignore', detached: true }).unref()
    } catch (error) {
      void error
    }
  })
  server.on('error', (error) => {
    process.stderr.write(`启动失败：${error.message}\n`)
    process.exitCode = 1
  })
}

if (require.main === module) start()

module.exports = { handler, slug }
