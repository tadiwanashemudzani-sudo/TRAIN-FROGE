const panels = ["dashboard","trends","script","storyboard","export"];
let pollTimer = null;

function show(id) {
  panels.forEach(panel => {
    const el = document.getElementById(panel);
    if (el) el.classList.toggle("active", panel === id);
  });
  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.panel === id);
  });
}

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => show(button.dataset.panel));
});

document.querySelectorAll(".idea").forEach(button => {
  button.addEventListener("click", () => {
    document.getElementById("prompt").value = button.dataset.idea;
    show("dashboard");
  });
});

async function checkHealth() {
  const status = document.getElementById("systemStatus");
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    status.textContent = data.configured ? "● Backend online" : "● Backend online — API key missing";
    document.getElementById("backendMetric").textContent = data.configured ? "Ready" : "Needs key";
    document.getElementById("modelMetric").textContent = data.model || "—";
  } catch {
    status.textContent = "● Backend unavailable";
    document.getElementById("backendMetric").textContent = "Offline";
  }
}

function setJob(job) {
  const card = document.getElementById("jobCard");
  card.classList.remove("hidden");
  document.getElementById("jobTitle").textContent =
    job.status === "completed" ? "Video generated" :
    job.status === "failed" ? "Generation failed" : "Rendering video…";
  document.getElementById("jobBadge").textContent = String(job.status).toUpperCase();
  document.getElementById("progressBar").style.width = `${job.progress || 0}%`;
  document.getElementById("jobMessage").textContent =
    job.error || (job.status === "completed" ? "Your render is ready." : "The video model is processing your scene.");

  if (job.videoUrl) {
    const video = document.getElementById("resultVideo");
    video.src = job.videoUrl;
    video.classList.remove("hidden");

    const exportVideo = document.getElementById("exportVideo");
    exportVideo.src = job.videoUrl;
    exportVideo.classList.remove("hidden");

    const download = document.getElementById("downloadBtn");
    download.href = job.videoUrl;
    download.classList.remove("hidden");
  }
}

async function pollJob(id) {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
      const job = await res.json();
      setJob(job);
      if (["completed","failed"].includes(job.status)) {
        clearInterval(pollTimer);
        document.getElementById("generateBtn").disabled = false;
      }
    } catch (err) {
      console.error(err);
    }
  }, 2500);
}

document.getElementById("generateBtn").addEventListener("click", async () => {
  const button = document.getElementById("generateBtn");
  const prompt = document.getElementById("prompt").value.trim();
  const aspectRatio = document.getElementById("aspectRatio").value;
  const duration = Number(document.getElementById("duration").value);

  if (!prompt) {
    alert("Write a video prompt first.");
    return;
  }

  button.disabled = true;
  document.getElementById("resultVideo").classList.add("hidden");
  document.getElementById("downloadBtn").classList.add("hidden");
  setJob({ status:"queued", progress:0 });

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ prompt, aspectRatio, duration })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not start generation.");
    document.getElementById("jobMetric").textContent = data.id;
    await pollJob(data.id);
  } catch (error) {
    setJob({ status:"failed", progress:100, error:error.message });
    button.disabled = false;
  }
});

checkHealth();
