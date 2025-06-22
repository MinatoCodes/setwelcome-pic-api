const express = require('express');
const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve generated images statically from /images
app.use('/images', express.static(path.join(__dirname, 'images')));

// Register font (make sure you have Poppins-Bold.ttf in project root)
registerFont(path.join(__dirname, 'Poppins-Bold.ttf'), { family: 'Poppins' });

app.get('/api/pic', async (req, res) => {
  const { url, num, name, gcname } = req.query;

  if (!url || !num || !name || !gcname) {
    return res.status(400).json({ success: false, error: "Missing 'url', 'num', 'name', or 'gcname'." });
  }

  try {
    const baseImageUrl = "https://i.ibb.co/sdLf3wZF/image.jpg";

    const [bgRes, overlayRes] = await Promise.all([
      axios.get(baseImageUrl, { responseType: 'arraybuffer' }),
      axios.get(url, { responseType: 'arraybuffer' }),
    ]);

    const bgImage = await loadImage(Buffer.from(bgRes.data));
    const overlayImage = await loadImage(Buffer.from(overlayRes.data));

    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(bgImage, 0, 0);

    // Draw circular avatar
    const avatarSize = 120;
    const avatarX = canvas.width - avatarSize - 30;
    const avatarY = 30;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(overlayImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    const baseX = 60;
    let currentY = canvas.height - 200;

    // Number
    ctx.font = 'bold 130px Poppins';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 6;
    ctx.strokeText(num, baseX, currentY);
    ctx.fillText(num, baseX, currentY);

    // Username
    ctx.font = 'bold 48px Poppins';
    currentY += 70;
    ctx.strokeText(name, baseX, currentY);
    ctx.fillText(name, baseX, currentY);

    // GC Name
    ctx.font = 'bold 36px Poppins';
    currentY += 50;
    ctx.strokeText(`Group Chat: ${gcname}`, baseX, currentY);
    ctx.fillText(`Group Chat: ${gcname}`, baseX, currentY);

    // Create images folder if not exists
    const imagesDir = path.join(__dirname, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }

    // Generate unique filename
    const fileName = crypto.randomBytes(16).toString('hex') + '.png';
    const filePath = path.join(imagesDir, fileName);

    // Save image to file
    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    out.on('finish', () => {
      // Respond with JSON including accessible URL
      res.json({
        success: true,
        url: `${req.protocol}://${req.get('host')}/images/${fileName}`
      });
    });

    out.on('error', (err) => {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to save image' });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
