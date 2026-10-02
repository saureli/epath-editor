const canvas = document.getElementById("pathCanvas");
const ctx = canvas.getContext("2d");

const referenceRmsdInput = document.getElementById("referenceRmsd");
const milestonesInput = document.getElementById("milestones");
const curvatureInput = document.getElementById("curvature");

const milestonesValue = document.getElementById("milestonesValue");
const curvatureValue = document.getElementById("curvatureValue");
const startPoint = document.getElementById("startPoint");
const endPoint = document.getElementById("endPoint");
const milestoneCount = document.getElementById("milestoneCount");

const resetBtn = document.getElementById("resetBtn");
const showCoordinatesBtn = document.getElementById("showCoordinatesBtn");
const coordinatesModal = document.getElementById("coordinatesModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const coordinatesTableBody = document.getElementById("coordinatesTableBody");

const defaults = { referenceRmsd: 8.0, milestones: 8, curvature: 0.0 };

function getState() {
  const referenceRmsd = Math.max(0.1, Number(referenceRmsdInput.value) || defaults.referenceRmsd);
  const milestones = Math.max(2, Math.round(Number(milestonesInput.value) || defaults.milestones));
  const curvature = Math.min(1, Math.max(-1, Number(curvatureInput.value) || 0));
  return { referenceRmsd, milestones, curvature };
}

// R = RMSD tra stato inattivo e stato attivo.
// t=0 -> M1=(0,R); t=1 -> MN=(R,0).
// c=0 -> diagonale y=R-x.
// c>0 -> arco sopra la diagonale; c<0 -> arco sotto la diagonale.
function pointAt(t, state) {
  const R = state.referenceRmsd;
  const x = R * t;
  const bump = 4 * t * (1 - t);
  const y = R * (1 - t) + state.curvature * R * bump;
  return { x, y };
}

function generateMilestones(state) {
  return Array.from({ length: state.milestones }, (_, i) => {
    const t = i / (state.milestones - 1);
    return { index: i + 1, t, ...pointAt(t, state) };
  });
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function getCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function geometry(state) {
  const { width, height } = getCanvasSize();
  const margin = { left: 58, right: 22, top: 22, bottom: 52 };
  const maxY = Math.max(state.referenceRmsd * (1 + Math.abs(state.curvature)), state.referenceRmsd, 1);
  const maxAxis = Math.max(state.referenceRmsd, maxY) * 1.12;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const unit = Math.min(plotW, plotH) / maxAxis;
  const plotWidth = maxAxis * unit;
  const plotHeight = maxAxis * unit;
  const left = margin.left;
  const bottom = height - margin.bottom;

  const sx = x => left + x * unit;
  const sy = y => bottom - y * unit;
  return { width, height, margin, maxAxis, unit, plotWidth, plotHeight, sx, sy };
}

function niceStep(maxAxis) {
  const rough = maxAxis / 6;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / power;
  if (normalized < 1.5) return 1 * power;
  if (normalized < 3.5) return 2 * power;
  if (normalized < 7.5) return 5 * power;
  return 10 * power;
}

function formatTick(value) {
  return value < 10 ? value.toFixed(1).replace(/\.0$/, "") : value.toFixed(0);
}

function drawAxes(g) {
  ctx.save();
  ctx.lineWidth = 1;
  const step = niceStep(g.maxAxis);
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let v = 0; v <= g.maxAxis + step * 0.2; v += step) {
    const x = g.sx(v), y = g.sy(v);
    if (x <= g.width - g.margin.right + 1) {
      ctx.beginPath(); ctx.moveTo(x, g.margin.top); ctx.lineTo(x, g.height - g.margin.bottom);
      ctx.strokeStyle = "#e7ebf0"; ctx.stroke();
    }
    if (y >= g.margin.top - 1) {
      ctx.beginPath(); ctx.moveTo(g.margin.left, y); ctx.lineTo(g.sx(g.maxAxis), y);
      ctx.strokeStyle = "#e7ebf0"; ctx.stroke();
    }
    if (v > 0 && x <= g.sx(g.maxAxis)) {
      ctx.fillStyle = "#7b8490"; ctx.fillText(formatTick(v), x, g.height - g.margin.bottom + 8);
      ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(formatTick(v), g.margin.left - 9, y);
      ctx.textAlign = "center"; ctx.textBaseline = "top";
    }
  }

  ctx.strokeStyle = "#202833"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(g.margin.left, g.height - g.margin.bottom); ctx.lineTo(g.sx(g.maxAxis), g.height - g.margin.bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(g.margin.left, g.height - g.margin.bottom); ctx.lineTo(g.margin.left, g.margin.top); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(g.sx(g.maxAxis), g.height - g.margin.bottom);
  ctx.lineTo(g.sx(g.maxAxis) - 8, g.height - g.margin.bottom - 4);
  ctx.moveTo(g.sx(g.maxAxis), g.height - g.margin.bottom);
  ctx.lineTo(g.sx(g.maxAxis) - 8, g.height - g.margin.bottom + 4);
  ctx.moveTo(g.margin.left, g.margin.top);
  ctx.lineTo(g.margin.left - 4, g.margin.top + 8);
  ctx.moveTo(g.margin.left, g.margin.top);
  ctx.lineTo(g.margin.left + 4, g.margin.top + 8);
  ctx.stroke();

  ctx.fillStyle = "#202833"; ctx.font = "600 12px system-ui, sans-serif";
  ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
  ctx.fillText("RMSD inattivo (Å)", g.sx(g.maxAxis), g.height - 14);
  ctx.save(); ctx.translate(17, g.margin.top); ctx.rotate(-Math.PI / 2); ctx.textAlign = "left"; ctx.fillText("RMSD attivo (Å)", 0, 0); ctx.restore();
  ctx.restore();
}

function drawPath(points, g, state) {
  ctx.save();
  const start = points[0], end = points[points.length - 1];

  if (Math.abs(state.curvature) > 0.001) {
    ctx.beginPath(); ctx.moveTo(g.sx(start.x), g.sy(start.y)); ctx.lineTo(g.sx(end.x), g.sy(end.y));
    ctx.setLineDash([5, 5]); ctx.strokeStyle = "#aeb7c2"; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
  }

  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const p = pointAt(t, state);
    const x = g.sx(p.x), y = g.sy(p.y);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#202833"; ctx.lineWidth = 2.5; ctx.stroke();

  points.forEach((p, idx) => {
    const x = g.sx(p.x), y = g.sy(p.y);
    ctx.beginPath(); ctx.arc(x, y, idx === 0 || idx === points.length - 1 ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#202833"; ctx.stroke();

    ctx.font = "600 10px system-ui, sans-serif"; ctx.fillStyle = "#4e5965"; ctx.textBaseline = "bottom";
    if (idx === 0) { ctx.textAlign = "left"; ctx.fillText(`M${p.index}`, x + 8, y - 8); }
    else if (idx === points.length - 1) { ctx.textAlign = "right"; ctx.fillText(`M${p.index}`, x - 8, y - 8); }
    else { ctx.textAlign = "center"; ctx.fillText(`M${p.index}`, x, y - 8); }
  });
  ctx.restore();
}

function draw() {
  const state = getState();
  const { width, height } = getCanvasSize();
  if (!width || !height) return;
  ctx.clearRect(0, 0, width, height);
  const g = geometry(state);
  const points = generateMilestones(state);
  drawAxes(g);
  drawPath(points, g, state);

  milestonesValue.textContent = String(state.milestones);
  curvatureValue.textContent = state.curvature.toFixed(2);
  milestoneCount.textContent = String(state.milestones);
  startPoint.textContent = `(${points[0].x.toFixed(2)}, ${points[0].y.toFixed(2)})`;
  const last = points[points.length - 1];
  endPoint.textContent = `(${last.x.toFixed(2)}, ${last.y.toFixed(2)})`;
}

function reset() {
  referenceRmsdInput.value = defaults.referenceRmsd;
  milestonesInput.value = defaults.milestones;
  curvatureInput.value = defaults.curvature;
  draw();
}

[referenceRmsdInput, milestonesInput, curvatureInput].forEach(el => el.addEventListener("input", draw));
resetBtn.addEventListener("click", reset);

function showCoordinates() {
  const state = getState();
  const points = generateMilestones(state);

  coordinatesTableBody.innerHTML = points.map((point) => `
    <tr>
      <td>M${point.index}</td>
      <td>${point.x.toFixed(4)}</td>
      <td>${point.y.toFixed(4)}</td>
    </tr>
  `).join("");

  coordinatesModal.classList.remove("hidden");
}

function closeCoordinates() {
  coordinatesModal.classList.add("hidden");
}

showCoordinatesBtn.addEventListener("click", showCoordinates);
closeModalBtn.addEventListener("click", closeCoordinates);

coordinatesModal.addEventListener("click", (event) => {
  if (event.target === coordinatesModal) {
    closeCoordinates();
  }
});

window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(resizeCanvas);
