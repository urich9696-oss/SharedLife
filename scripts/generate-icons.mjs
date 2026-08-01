/**
 * Renders SharedLife PWA icons from the heart SVG mark.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'icons')

const TARGETS = [
  { name: 'icon-192.png', size: 192, source: 'icon.svg' },
  { name: 'icon-512.png', size: 512, source: 'icon.svg' },
  { name: 'icon-512-maskable.png', size: 512, source: 'icon-maskable.svg' },
  { name: 'apple-touch-icon.png', size: 180, source: 'icon.svg' },
]

mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

try {
  for (const target of TARGETS) {
    const svg = readFileSync(join(OUT_DIR, target.source), 'utf8')
    const page = await browser.newPage({
      viewport: { width: target.size, height: target.size },
      deviceScaleFactor: 1,
    })
    await page.setContent(
      `<!doctype html><html><head><style>
        html,body{margin:0;padding:0;width:${target.size}px;height:${target.size}px;background:#FAF8F5;overflow:hidden}
        svg{display:block;width:${target.size}px;height:${target.size}px}
      </style></head><body>${svg}</body></html>`,
      { waitUntil: 'load' },
    )
    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: false,
      clip: { x: 0, y: 0, width: target.size, height: target.size },
    })
    writeFileSync(join(OUT_DIR, target.name), buffer)
    console.log(`✓ ${target.name} (${target.size}×${target.size}, ${buffer.length} bytes)`)
    await page.close()
  }
} finally {
  await browser.close()
}

writeFileSync(
  join(OUT_DIR, 'README.md'),
  `# SharedLife Icons

Herz-Mark (schwarzer Outline auf Off-White), generiert mit \`npm run prepare:icons\`.

| Datei | Verwendung |
|-------|------------|
| \`icon.svg\` | Quelle App-Icon |
| \`icon-maskable.svg\` | Maskable mit Safe-Zone |
| \`icon-192.png\` / \`icon-512.png\` | PWA Manifest |
| \`icon-512-maskable.png\` | Adaptive Icons |
| \`apple-touch-icon.png\` | iOS Homescreen |
`,
)

console.log('✓ Icons geschrieben nach public/icons/')
