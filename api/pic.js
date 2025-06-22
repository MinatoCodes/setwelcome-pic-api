const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Register the Poppins font locally from project folder (for Vercel)
registerFont(path.resolve(__dirname, 'Poppins-Bold.ttf'), { family: 'Poppins' });

export default async function handler(req, res) {
  const { url, num, name, gcname } = req.query;

  if (!url || !num || !name || !gcname) {
    return res.status(400).json({ error: "Missing 'url', 'num', 'name', or 'gcname'." });
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

    res.setHeader('Content-Type', 'image/png');
    canvas.createPNGStream().pipe(res);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Image generation failed', details: error.message });
  }
      }
      
