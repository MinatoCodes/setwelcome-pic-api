import express from "express";
import { createCanvas, loadImage, registerFont } from "canvas";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register the font - place Poppins-Bold.ttf in your project root
registerFont(path.join(__dirname, "..", "Poppins-Bold.ttf"), { family: "Poppins" });

const app = express();
const PORT = process.env.PORT || 3000;

// Serve generated images statically
app.use("/images", express.static(path.join(__dirname, "..", "images")));

app.get("/api/pic", async (req, res) => {
  const { url, num, name, gcname } = req.query;
  if (!url || !num || !name || !gcname) {
    return res
      .status(400)
      .json({ success: false, error: "Missing url, num, name, or gcname" });
  }

  try {
    // Background image URL (your provided bg)
    const bgUrl = "https://i.ibb.co/sdLf3wZF/image.jpg";

    // Fetch images concurrently
    const [bgResp, avatarResp] = await Promise.all([
      axios.get(bgUrl, { responseType: "arraybuffer" }),
      axios.get(url, { responseType: "arraybuffer" }),
    ]);

    const bg = await loadImage(Buffer.from(bgResp.data));
    const avatar = await loadImage(Buffer.from(avatarResp.data));

    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");

    // Draw background
    ctx.drawImage(bg, 0, 0);

    // Draw circular avatar top center
    const avatarSize = 130;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Text styles
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;

    // Username - bold 52px, centered under avatar
    ctx.font = "bold 52px Poppins";
    let text = name;
    let textWidth = ctx.measureText(text).width;
    const usernameY = avatarY + avatarSize + 60;
    ctx.strokeText(text, (canvas.width - textWidth) / 2, usernameY);
    ctx.fillText(text, (canvas.width - textWidth) / 2, usernameY);

    // Group chat name - bold 40px, centered under username
    ctx.font = "bold 40px Poppins";
    text = gcname;
    textWidth = ctx.measureText(text).width;
    const gcY = usernameY + 60;
    ctx.strokeText(text, (canvas.width - textWidth) / 2, gcY);
    ctx.fillText(text, (canvas.width - textWidth) / 2, gcY);

    // Final line - bold 44px, centered at bottom
    ctx.font = "bold 44px Poppins";
    text = `You are ${num} member of this group`;
    textWidth = ctx.measureText(text).width;
    const finalY = canvas.height - 60;
    ctx.strokeText(text, (canvas.width - textWidth) / 2, finalY);
    ctx.fillText(text, (canvas.width - textWidth) / 2, finalY);

    // Save to file and return URL
    const outDir = path.join(__dirname, "..", "images");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    const filename = crypto.randomBytes(8).toString("hex") + ".png";
    const filePath = path.join(outDir, filename);

    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    out.on("finish", () => {
      res.json({
        success: true,
        url: `${req.protocol}://${req.get("host")}/images/${filename}`,
      });
    });

    out.on("error", (err) => {
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
    
