const fs = require('fs')

const version = Date.now()
let sw = fs.readFileSync('public/sw.js', 'utf8')
sw = sw.replace(
  /const CACHE_NAME = 'playvia-(?:[^']*)'(?:\s*\+\s*'\{\{BUILD_TIME\}\}')?/,
  `const CACHE_NAME = 'playvia-${version}'`
)
fs.writeFileSync('public/sw.js', sw)
console.log(`SW cache version updated to playvia-${version}`)
