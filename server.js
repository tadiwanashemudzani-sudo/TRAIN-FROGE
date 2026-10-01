import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fal } from "@fal-ai/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.FAL_VIDEO_MODEL || "fal-ai/wan/v2.7/text-to-video";

if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const jobs = new Map();

function makeId() {
  return "job_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function validatePrompt(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) return "A video prompt is required.";
  if (prompt.length > 5000) return "Prompt is too long (maximum 5000 characters).";
  return null;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.FAL_KEY),
    model: MODEL
  });
});

app.post("/api/generate", async (req, res) => {
  if (!process.env.FAL_KEY) {
    return res.status(500).json({
      error: "FAL_KEY is not configured. Add it to the server environment."
    });
  }

  const { prompt, aspectRatio = "16:9", duration = 5 } = req.body || {};
  const promptError = validatePrompt(prompt);
  if (promptError) return res.status(400).json({ error: promptError });

  const allowedRatios = new Set(["16:9", "9:16", "1:1", "4:3", "3:4"]);
  if (!allowedRatios.has(aspectRatio)) {
    return res.status(400).json({ error: "Unsupported aspect ratio." });
  }

  const seconds = Number(duration);
  if (!Number.isFinite(seconds) || seconds < 2 || seconds > 15) {
    return res.status(400).json({ error: "Duration must be between 2 and 15 seconds." });
  }

  const id = makeId();
  jobs.set(id, { id, status: "queued", progress: 0, createdAt: Date.now() });

  res.status(202).json({ id, status: "queued" });

  // Run asynchronously so the HTTP request returns immediately.
  (async () => {
    try {
      jobs.set(id, { ...jobs.get(id), status: "processing", progress: 10 });

      const result = await fal.subscribe(MODEL, {
        input: {
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio,
          duration: seconds
        },
        logs: true,
        onQueueUpdate: (update) => {
          const current = jobs.get(id);
          if (!current) return;
          if (update.status === "IN_QUEUE") {
            jobs.set(id, { ...current, status: "queued", progress: 15 });
          } else if (update.status === "IN_PROGRESS") {
            jobs.set(id, { ...current, status: "processing", progress: 50 });
          }
        }
      });

      const data = result?.data || {};
      const videoUrl =
        data?.video?.url ||
        data?.video_url ||
        data?.output?.url ||
        (typeof data?.url === "string" ? data.url : null);

      if (!videoUrl) {
        throw new Error("The video provider returned no video URL.");
      }

      jobs.set(id, {
        ...jobs.get(id),
        status: "completed",
        progress: 100,
        videoUrl,
        completedAt: Date.now()
      });
    } catch (error) {
      console.error("Generation error:", error);
      jobs.set(id, {
        ...jobs.get(id),
        status: "failed",
        progress: 100,
        error: error?.message || "Video generation failed."
      });
    }
  })();
});

app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  res.json(job);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`TrainForge running on http://localhost:${PORT}`);
});
