const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = 'C:/Users/Cal/Downloads/Campañas/carousel';
const outputTokensDir = './public/campaigns/carousel/tokens';
const outputHelpDir = './public/campaigns/carousel/help';

[outputTokensDir, outputHelpDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const files = fs.readdirSync(sourceDir).filter(f => f.startsWith('experimental---'));
const roleMap = {};

files.forEach(file => {
  const match = file.match(/^experimental---([^_]+)/);
  if (match) {
    const roleName = match[1];
    if (!roleMap[roleName]) roleMap[roleName] = [];
    roleMap[roleName].push(file);
  }
});

// Check if ImageMagick available
let hasImageMagick = false;
try {
  execSync('magick -version', { stdio: 'ignore' });
  hasImageMagick = true;
  console.log('Using ImageMagick for background removal...');
} catch {
  console.log('ImageMagick not found. Using sharp with manual processing...');
}

// Process images
(async () => {
  for (const [roleName, roleFiles] of Object.entries(roleMap)) {
    for (const file of roleFiles) {
      const inputPath = path.join(sourceDir, file);
      const isHelp = file.includes('reminder');
      const outputDir = isHelp ? outputHelpDir : outputTokensDir;
      const outputName = isHelp ? `${roleName}_help.png` : `${roleName}_token.png`;
      const outputPath = path.join(outputDir, outputName);

      try {
        if (hasImageMagick) {
          // Use ImageMagick: remove white background with fuzz tolerance
          execSync(`magick "${inputPath}" -fuzz 15% -transparent white "${outputPath}"`, {
            stdio: 'pipe'
          });
        } else {
          // Sharp fallback: convert to PNG with alpha channel preserved
          await sharp(inputPath)
            .ensureAlpha()
            .png({ quality: 95 })
            .toFile(outputPath);
        }
        console.log(`✓ ${outputName}`);
      } catch (err) {
        console.error(`✗ ${outputName}: ${err.message}`);
      }
    }
  }
  console.log('\nImage processing complete!');
})();
