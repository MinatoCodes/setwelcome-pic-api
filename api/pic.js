import express from 'express';
import { createCanvas, loadImage, registerFont } from 'canvas';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register the exact font
registerFont(path.join(__dirname, '..', 'Poppins-Bold.ttf'), { family: 'Poppins' });

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
    const backgroundURL = 'https://i.ibb.co/sdLf3wZF/image.jpg'; // your bg

    const [bgRes, avatarRes] = await Promise.all([
      axios.get(backgroundURL, { responseType: 'arraybuffer' }),
      axios.get(url, { responseType: 'arraybuffer' })
    ]);

    const bg = await loadImage(Buffer.from(bgRes.data));
    const avatar = await loadImage(Buffer.from(avatarRes.data));

    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(bg, 0, 0);

    // === Avatar Circle ===
    const avatarSize = 130;
    const avatarX = canvas.width - avatarSize - 35;
    const avatarY = 45;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // === Styling ===
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 8;

    // === Number ===
    ctx.font = 'bold 148px Poppins';
    const numberX = 60;
    const numberY = 640;
    ctx.strokeText(num, numberX, numberY);
    ctx.fillText(num, numberX, numberY);

    // === Username ===
    ctx.font = 'bold 52px Poppins';
    const nameX = 60;
    const nameY = numberY + 80;
    ctx.strokeText(name, nameX, nameY);
    ctx.fillText(name, nameX, nameY);

    // === Group Chat Name ===
    ctx.font = 'bold 38px Poppins';
    const gcY = nameY + 65;
    ctx.strokeText(`Group Chat: ${gcname}`, nameX, gcY);
    ctx.fillText(`Group Chat: ${gcname}`, nameX, gcY);

    // === Save File ===
    const imagesDir = path.join(__dirname, '..', 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

    const filename = crypto.randomBytes(16).toString('hex') + '.png';
    const filePath = path.join(imagesDir, filename);

    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    out.on('finish', () => {
      res.json({
        success: true,
        url: `${req.protocol}://${req.get('host')}/images/${filename}`
      });
    });

    out.on('error', () => {
      res.status(500).json({ success: false, error: 'Failed to save image' });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
             
