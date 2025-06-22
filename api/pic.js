import express from 'express';
import { createCanvas, loadImage, registerFont } from 'canvas';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register font (Poppins Bold)
registerFont(path.join(__dirname, '..', 'api/Poppins-Bold.ttf'), { family: 'Poppins' });

const app = express();
const PORT = process.env.PORT || 3000;

// Serve images statically
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

app.get('/api/pic', async (req, res) => {
  const { url, num, name, gcname } = req.query;

  if (!url || !num || !name || !gcname) {
    return res.status(400).json({ success: false, error: "Missing 'url', 'num', 'name', or 'gcname'." });
  }

  try {
    // Use your background image URL (different bg)
    const baseImageUrl = 'https://i.ibb.co/sdLf3wZF/image.jpg';

    const [bgRes, overlayRes] = await Promise.all([
      axios.get(baseImageUrl, { responseType: 'arraybuffer' }),
      axios.get(url, { responseType: 'arraybuffer' }),
    ]);

    const bgImage = await loadImage(Buffer.from(bgRes.data));
    const avatarImage = await loadImage(Buffer.from(overlayRes.data));

    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(bgImage, 0, 0);

    // === Avatar circle and placement ===
    // EXACT same position & size as example image:
    // Example avatar position approx top right corner, margin ~38px from right, ~40px from top, size 130x130px
    const avatarSize = 130;
    const avatarX = canvas.width - avatarSize - 38; // right margin
    const avatarY = 40; // top margin

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // === Text placement exactly like example ===

    // Number: font size ~150px bold Poppins, white fill with black stroke thickness 8
    const numberX = 60;
    const numberY = 650;

    ctx.font = 'bold 150px Poppins';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 8;
    ctx.strokeText(num, numberX, numberY);
    ctx.fillText(num, numberX, numberY);

    // Username: font size 52px bold Poppins, white fill with black stroke, positioned below number with spacing 80px
    const nameX = 60;
    const nameY = numberY + 80;

    ctx.font = 'bold 52px Poppins';
    ctx.strokeText(name, nameX, nameY);
    ctx.fillText(name, nameX, nameY);

    // Group Chat Name: font size 38px bold Poppins, white fill with black stroke, positioned below username with spacing 65px
    const gcX = 60;
    const gcY = nameY + 65;

    ctx.font = 'bold 38px Poppins';
    const gcText = `Group Chat: ${gcname}`;
    ctx.strokeText(gcText, gcX, gcY);
    ctx.fillText(gcText, gcX, gcY);

    // === Save image and respond ===
    const imagesDir = path.join(__dirname, '..', 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

    const fileName = crypto.randomBytes(16).toString('hex') + '.png';
    const filePath = path.join(imagesDir, fileName);

    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    out.on('finish', () => {
      res.json({
        success: true,
        url: `${req.protocol}://${req.get('host')}/images/${fileName}`
      });
    });

    out.on('error', (err) => {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to save image' });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
  
