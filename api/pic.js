import express from 'express';
import { createCanvas, loadImage, registerFont } from 'canvas';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load font (must be in root)
registerFont(path.join(__dirname, '..', 'Poppins-Bold.ttf'), {
  family: 'Poppins'
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/images', express.static(path.join(__dirname, '..', 'images')));

app.get('/api/pic', async (req, res) => {
  const { url, num, name, gcname } = req.query;
  if (!url || !num || !name || !gcname) {
    return res.status(400).json({ success: false, error: 'Missing query params' });
  }

  try {
    const bgUrl = 'https://i.ibb.co/sdLf3wZF/image.jpg';

    const [bgImgData, avatarData] = await Promise.all([
      axios.get(bgUrl, { responseType: 'arraybuffer' }),
      axios.get(url, { responseType: 'arraybuffer' })
    ]);

    const bg = await loadImage(Buffer.from(bgImgData.data));
    const avatar = await loadImage(Buffer.from(avatarData.data));

    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(bg, 0, 0);

    // ==== Avatar Top-Center ====
    const avatarSize = 130;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // === Common Text Style ===
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 6;

    // === Username ===
    ctx.font = 'bold 52px Poppins';
    let text = name;
    let width = ctx.measureText(text).width;
    ctx.strokeText(text, (canvas.width - width) / 2, avatarY + avatarSize + 60);
    ctx.fillText(text, (canvas.width - width) / 2, avatarY + avatarSize + 60);

    // === Group Chat Name ===
    ctx.font = 'bold 40px Poppins';
    text = `Group Chat: ${gcname}`;
    width = ctx.measureText(text).width;
    ctx.strokeText(text, (canvas.width - width) / 2, avatarY + avatarSize + 120);
    ctx.fillText(text, (canvas.width - width) / 2, avatarY + avatarSize + 120);

    // === Final Sentence ===
    ctx.font = 'bold 36px Poppins';
    text = `You are ${num} member of this group`;
    width = ctx.measureText(text).width;
    ctx.strokeText(text, (canvas.width - width) / 2, canvas.height - 60);
    ctx.fillText(text, (canvas.width - width) / 2, canvas.height - 60);

    // Save image
    const dir = path.join(__dirname, '..', 'images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filename = crypto.randomBytes(8).toString('hex') + '.png';
    const filePath = path.join(dir, filename);

    const out = fs.createWriteStream(filePath);
    canvas.createPNGStream().pipe(out);
    out.on('finish', () => {
      res.json({
        success: true,
        url: `${req.protocol}://${req.get('host')}/images/${filename}`
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Running on http://localhost:${PORT}`);
});
                                 
