const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function finalizeWebBuild(output, template, apiOrigin) {
  const application = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const wrapper = fs.readFileSync(template, 'utf8');
  if (!application.includes('</head>') || !wrapper.includes('src="/app/"')) throw new Error('Unexpected web entry layout');
  if (apiOrigin) {
    const directory = path.join(output, '_expo/static/js/web');
    const bundles = fs.readdirSync(directory).filter(filename => filename.endsWith('.js'));
    if (!bundles.some(filename => fs.readFileSync(path.join(directory, filename), 'utf8').includes(apiOrigin))) throw new Error('Web bundle does not contain the configured API origin');
  }
  const version = createHash('sha256').update(application).digest('hex').slice(0, 16);
  const marker = `<meta name="destiny-web-build" content="${version}" />`;
  fs.mkdirSync(path.join(output, 'app'), { recursive: true });
  fs.writeFileSync(path.join(output, 'app/index.html'), application.replace('</head>', `${marker}</head>`));
  fs.writeFileSync(path.join(output, 'index.html'), wrapper.replace('src="/app/"', `src="/app/?v=${version}"`).replace('</head>', `${marker}</head>`));
  return version;
}

module.exports = { finalizeWebBuild };
