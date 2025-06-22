import express from "express";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register font
GlobalFonts.registerFromPath(path.join(__dirname, "..", "Poppins-Bold.ttf"), "Poppins");

const app = express();
const PORT = process.env.PORT || 3000;
const BG_IMAGE_URL = process.env.BG_IMAGE_URL;

let cachedBg = null;

// Cache background on startup
async function preloadBackground() {
  try {
    if (!BG_IMAGE_URL) throw new Error("Missing BG_IMAGE_URL in .env");
    const resp = await axios.get(BG_IMAGE_URL, { responseType: "arraybuffer" });
    cachedBg = await loadImage(Buffer.from(resp.data));
    console.log("✅ Cached background image");
  } catch (err) {
    console.error("❌ Failed to preload background:", err.message);
  }
}

await preloadBackground();

app.get("/api/pic", async (req, res) => {
  const { url, num, name, gcname } = req.query;
  if (!url || !num || !name || !gcname) {
    return res.status(400).json({ success: false, error: "Missing one of: url, num, name, gcname" });
  }

  try {
    const avatarResp = await axios.get(url, { responseType: "arraybuffer" });
    const avatar = await loadImage(Buffer.from(avatarResp.data));

    const canvas = createCanvas(cachedBg.width, cachedBg.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(cachedBg, 0, 0);

    // Avatar circle
    const avatarSize = 180;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Text config
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;

    // Username (bold 52px)
    ctx.font = "bold 52px Poppins";
    let textWidth = ctx.measureText(name).width;
    const usernameY = avatarY + avatarSize + 50;
    ctx.strokeText(name, (canvas.width - textWidth) / 2, usernameY);
    ctx.fillText(name, (canvas.width - textWidth) / 2, usernameY);

    // Group name (bold 40px)
    ctx.font = "bold 40px Poppins";
    textWidth = ctx.measureText(gcname).width;
    const gcY = usernameY + 55;
    ctx.strokeText(gcname, (canvas.width - textWidth) / 2, gcY);
    ctx.fillText(gcname, (canvas.width - textWidth) / 2, gcY);

    // Final line (bold 44px)
    const finalText = `You are ${num} member of this group`;
    ctx.font = "bold 44px Poppins";
    textWidth = ctx.measureText(finalText).width;
    const finalY = gcY + 50;
    ctx.strokeText(finalText, (canvas.width - textWidth) / 2, finalY);
    ctx.fillText(finalText, (canvas.width - textWidth) / 2, finalY);

    res.setHeader("Content-Type", "image/png");
    res.send(canvas.toBuffer("image/png"));
  } catch (err) {
    console.error("❌ Error generating image:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
  
