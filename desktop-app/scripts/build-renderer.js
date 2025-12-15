const fs = require('fs-extra');
const path = require('path');

async function buildRenderer() {
  console.log('📦 Building renderer (frontend)...');
  
  const webAppPath = path.join(__dirname, '../../apps/web');
  const rendererPath = path.join(__dirname, '../renderer');
  
  // Create renderer directory
  await fs.ensureDir(rendererPath);
  
  // Copy necessary files from web app
  const filesToCopy = [
    'app',
    'components',
    'lib',
    'public',
    'next.config.js',
    'package.json',
    'tsconfig.json',
    'tailwind.config.js',
    'postcss.config.js'
  ];
  
  for (const file of filesToCopy) {
    const src = path.join(webAppPath, file);
    const dest = path.join(rendererPath, file);
    
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      console.log(`✅ Copied ${file}`);
    }
  }
  
  console.log('✅ Renderer build complete!');
}

buildRenderer().catch(console.error);
