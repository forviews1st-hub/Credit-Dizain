const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIR = 'avatars';
const MAX_SIZE = 400;
const JPEG_QUALITY = 80;

async function compressImages() {
  if (!fs.existsSync(DIR)) {
    console.log('No avatars folder found. Skipping.');
    return;
  }

  const files = fs.readdirSync(DIR).filter(f =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );

  if (files.length === 0) {
    console.log('No images to compress.');
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;
  let compressedCount = 0;

  for (const file of files) {
    const inputPath = path.join(DIR, file);
    const ext = path.extname(file).toLowerCase();
    const tempPath = path.join(DIR, `tmp_${file}`);

    try {
      const beforeSize = fs.statSync(inputPath).size;
      const metadata = await sharp(inputPath).metadata();

      let pipeline = sharp(inputPath);
      if (metadata.width > MAX_SIZE || metadata.height > MAX_SIZE) {
        pipeline = pipeline.resize(MAX_SIZE, MAX_SIZE, {
          fit: 'cover',
          position: 'center'
        });
      }

      if (ext === '.png') {
        pipeline = pipeline.png({ quality: 80, compressionLevel: 9, palette: true });
      } else if (ext === '.webp') {
        pipeline = pipeline.webp({ quality: 80 });
      } else {
        pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true });
      }

      await pipeline.toFile(tempPath);

      const afterSize = fs.statSync(tempPath).size;

      if (afterSize < beforeSize) {
        fs.unlinkSync(inputPath);
        fs.renameSync(tempPath, inputPath);
        console.log('✓ ' + file + ': ' + (beforeSize/1024).toFixed(1) + 'KB → ' + (afterSize/1024).toFixed(1) + 'KB');
        totalBefore += beforeSize;
        totalAfter += afterSize;
        compressedCount++;
      } else {
        fs.unlinkSync(tempPath);
        console.log('○ ' + file + ': already optimized (' + (beforeSize/1024).toFixed(1) + 'KB)');
      }
    } catch (err) {
      console.error('✗ ' + file + ':', err.message);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }

  console.log('');
  console.log('--- Summary ---');
  console.log('Compressed: ' + compressedCount + '/' + files.length + ' files');
  if (compressedCount > 0) {
    console.log('Total: ' + (totalBefore/1024).toFixed(1) + 'KB → ' + (totalAfter/1024).toFixed(1) + 'KB');
    console.log('Saved: ' + (((totalBefore - totalAfter)/totalBefore)*100).toFixed(1) + '%');
  }
}

compressImages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
