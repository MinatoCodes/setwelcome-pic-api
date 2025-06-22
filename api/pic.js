import express from "express";
import { createCanvas, loadImage, registerFont } from "canvas";
import axios from "axios";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

dotenv.config();  // load .env variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

registerFont(path.join(__dirname, "..", "Poppins-Bold.ttf"), { family: "Poppins" });

const app = express();
const PORT = process.env.PORT || 3000;

const BG_IMAGE_URL = process.env.BG_IMAGE_URL;

let cachedBg = null;

async function preloadBackground() {
  try {
    if (!BG_IMAGE_URL) throw new Error("BG_IMAGE_URL is not set");
    const resp = await axios.get(BG_IMAGE_URL, { responseType: "arraybuffer" });
    cachedBg = await loadImage(Buffer.from(resp.data));
    console.log("Background image cached");
  } catch (e) {
    console.error("Failed to preload background:", e.message);
  }
}

await preloadBackground();

app.get("/api/pic", async (req, res) => {
  const { url, num, name, gcname } = req.query;
  if (!url || !num || !name || !gcname) {
    return res
      .status(400)
      .json({ success: false, error: "Missing url, num, name, or gcname" });
  }

  try {
    const avatarResp = await axios.get(url, { responseType: "arraybuffer" });
    const avatar = await loadImage(Buffer.from(avatarResp.data));

    const canvas = createCanvas(cachedBg.width, cachedBg.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(cachedBg, 0, 0);

    const avatarSize = 180;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;

    ctx.font = "bold 52px Poppins";
    let text = name;
    let textWidth = ctx.measureText(text).width;
    const usernameY = avatarY + avatarSize + 50;
    ctx.strokeText(text, (canvas.width - textWidth) / 2, usernameY);
    ctx.fillText(text, (canvas.width - textWidth) / 2, usernameY);

    ctx.font = "bold 40px Poppins";
    text = gcname;
    textWidth = ctx.measureText(text).width;
    const gcY = usernameY + 55;
    ctx.strokeText(text, (canvas.width - textWidth) / 2, gcY);
    ctx.fillText(text, (canvas.width - textWidth) / 2, gcY);

    ctx.font = "bold 44px Poppins";
    text = `You are ${num} member of this group`;
    textWidth = ctx.measureText(text).width;
    const finalY = gcY + 50;
    ctx.strokeText(text, (canvas.width - textWidth) / 2, finalY);
    ctx.fillText(text, (canvas.width - textWidth) / 2, finalY);

    res.setHeader("Content-Type", "image/png");
    canvas.createPNGStream().pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
                                       
