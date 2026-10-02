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
const downloadBtn = document.getElementById("downloadBtn");

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

//function downloadJSON() {
//  const state = getState();
//  const data = {
//    version: 1,
//    parameters: {
//      reference_rmsd_angstrom: state.referenceRmsd,
//      milestones: state.milestones,
//      curvature: state.curvature
//    },
//    milestones: generateMilestones(state).map(p => ({ index: p.index, t: p.t, x: p.x, y: p.y }))
//  };
//  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
//  const url = URL.createObjectURL(blob);
//  const a = document.createElement("a");
//  a.href = url; a.download = "epath-milestones.json"; document.body.appendChild(a); a.click(); a.remove();
//  URL.revokeObjectURL(url);
//}

function downloadEPATH() {
  const state = getState();
  const points = generateMilestones(state);

  function formatCoordinate(value) {
    return String(Number(value.toFixed(6)));
  }

  const lines = [];

  points.forEach((point) => {
    lines.push(
      `REMARK ARG=r4,r3 r4=${formatCoordinate(point.x)}  r3=${formatCoordinate(point.y)}`
    );
    lines.push("END");
  });

  const content = lines.join("\n") + "\n";

  const blob = new Blob(
    [content],
    { type: "text/plain" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "EPATH.pdb";

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function reset() {
  referenceRmsdInput.value = defaults.referenceRmsd;
  milestonesInput.value = defaults.milestones;
  curvatureInput.value = defaults.curvature;
  draw();
}

[referenceRmsdInput, milestonesInput, curvatureInput].forEach(el => el.addEventListener("input", draw));
resetBtn.addEventListener("click", reset);
//downloadBtn.addEventListener("click", downloadJSON);
downloadBtn.addEventListener("click", downloadEPATH);
window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(resizeCanvas);

// --- Milestone coordinates list ---

const milestoneList = document.getElementById("milestoneList");

function updateMilestoneList() {
  if (!milestoneList) return;

  const state = getState();
  const points = generateMilestones(state);

  milestoneList.innerHTML = points.map((point) => `
    <div class="info-row">
      <span>M<sub>${point.index}</sub></span>
      <code>(${point.x.toFixed(2)}, ${point.y.toFixed(2)})</code>
    </div>
  `).join("");
}

updateMilestoneList();

milestonesInput.addEventListener("input", updateMilestoneList);
curvatureInput.addEventListener("input", updateMilestoneList);

// =====================================================
// Z(M) CONTOUR
// =====================================================

const zLambdaInput = document.getElementById("lambda");
const zContourInput = document.getElementById("zContour");

const zLambdaValue = document.getElementById("lambdaValue");
const zContourValue = document.getElementById("zContourValue");

// Creiamo un secondo canvas trasparente sopra il canvas principale.
// Servirà esclusivamente per disegnare l'isolinea.
const zCanvas = document.createElement("canvas");

zCanvas.id = "zContourCanvas";

zCanvas.style.position = "absolute";
zCanvas.style.left = "0";
zCanvas.style.top = "0";
zCanvas.style.width = "100%";
zCanvas.style.height = "100%";
zCanvas.style.pointerEvents = "none";
zCanvas.style.zIndex = "2";

// Il canvas principale rimane sotto l'isolinea ma sopra lo sfondo.
canvas.style.position = "relative";
canvas.style.zIndex = "1";

canvas.parentElement.appendChild(zCanvas);

const zCtx = zCanvas.getContext("2d");


// -----------------------------------------------------
// Calcolo numericamente stabile di z(M)
// -----------------------------------------------------

function calculateZ(x, y, points, lambda) {

  if (lambda <= 0) {
    return 0;
  }

  const logarithms = points.map((point) => {

    const dx = x - point.x;
    const dy = y - point.y;

    const distanceSquared =
      dx * dx +
      dy * dy;

    return -lambda * distanceSquared;
  });

  // Log-sum-exp per evitare problemi numerici
  // quando lambda * d^2 diventa molto grande.
  const maximum = Math.max(...logarithms);

  const sum = logarithms.reduce(
    (accumulator, value) =>
      accumulator +
      Math.exp(value - maximum),
    0
  );

  const logSum =
    maximum +
    Math.log(sum);

  return -logSum / lambda;
}


// -----------------------------------------------------
// Ridimensionamento del canvas dell'isolinea
// -----------------------------------------------------

function resizeZCanvas() {

  const rect =
    canvas.getBoundingClientRect();

  const dpr =
    window.devicePixelRatio || 1;

  zCanvas.width =
    Math.max(
      1,
      Math.round(rect.width * dpr)
    );

  zCanvas.height =
    Math.max(
      1,
      Math.round(rect.height * dpr)
    );

  zCtx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );
}


// -----------------------------------------------------
// Interpolazione tra due punti per trovare
// dove la funzione attraversa il valore Z scelto.
// -----------------------------------------------------

function interpolateContourPoint(
  p1,
  z1,
  p2,
  z2,
  target
) {

  if (z1 === z2) {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
  }

  const fraction =
    (target - z1) /
    (z2 - z1);

  return {
    x:
      p1.x +
      fraction * (p2.x - p1.x),

    y:
      p1.y +
      fraction * (p2.y - p1.y)
  };
}


// -----------------------------------------------------
// Disegna l'isolinea z(M) = valore scelto
// -----------------------------------------------------

function drawZContour() {

  if (
    !zLambdaInput ||
    !zContourInput
  ) {
    return;
  }

  resizeZCanvas();

  const state =
    getState();

  const points =
    generateMilestones(state);

  const lambda =
    Number(zLambdaInput.value);

  const targetZ =
    Number(zContourInput.value);

  zLambdaValue.textContent =
    lambda.toFixed(2);

  zContourValue.textContent =
    targetZ.toFixed(2);

  const {
    width,
    height
  } = getCanvasSize();

  if (
    !width ||
    !height ||
    !Number.isFinite(lambda) ||
    lambda <= 0 ||
    !Number.isFinite(targetZ)
  ) {
    zCtx.clearRect(
      0,
      0,
      width,
      height
    );

    return;
  }

  zCtx.clearRect(
    0,
    0,
    width,
    height
  );

  const g =
    geometry(state);

  // Numero di celle della griglia.
  // 70x70 è già abbastanza fluido
  // per una prima versione.
  const nx = 70;
  const ny = 70;

  const plotWidth =
    g.width -
    g.margin.left -
    g.margin.right;

  const plotHeight =
    g.height -
    g.margin.top -
    g.margin.bottom;

  const cellWidth =
    plotWidth / nx;

  const cellHeight =
    plotHeight / ny;

  // Trasforma un pixel del canvas
  // nelle coordinate RMSD.
  function canvasToRmsd(px, py) {

    const x =
      (px - g.margin.left) /
      plotWidth *
      g.maxAxis;

    const y =
      (g.height - g.margin.bottom - py) /
      plotHeight *
      g.maxAxis;

    return { x, y };
  }

  // Calcoliamo z su tutti i vertici della griglia.
  const values = [];

  for (let j = 0; j <= ny; j += 1) {

    values[j] = [];

    for (let i = 0; i <= nx; i += 1) {

      const px =
        g.margin.left +
        i * cellWidth;

      const py =
        g.margin.top +
        j * cellHeight;

      const rmsd =
        canvasToRmsd(
          px,
          py
        );

      values[j][i] =
        calculateZ(
          rmsd.x,
          rmsd.y,
          points,
          lambda
        );
    }
  }

  // Disegniamo tutti i piccoli segmenti
  // in cui z attraversa targetZ.
  zCtx.save();

  zCtx.beginPath();

  for (let j = 0; j < ny; j += 1) {

    for (let i = 0; i < nx; i += 1) {

      const px =
        g.margin.left +
        i * cellWidth;

      const py =
        g.margin.top +
        j * cellHeight;

      const p00 =
        canvasToRmsd(
          px,
          py + cellHeight
        );

      const p10 =
        canvasToRmsd(
          px + cellWidth,
          py + cellHeight
        );

      const p11 =
        canvasToRmsd(
          px + cellWidth,
          py
        );

      const p01 =
        canvasToRmsd(
          px,
          py
        );

      const z00 =
        values[j + 1][i];

      const z10 =
        values[j + 1][i + 1];

      const z11 =
        values[j][i + 1];

      const z01 =
        values[j][i];

      const intersections = [];

      // Bottom
      if (
        (z00 < targetZ && z10 >= targetZ) ||
        (z00 >= targetZ && z10 < targetZ)
      ) {
        intersections.push(
          interpolateContourPoint(
            p00,
            z00,
            p10,
            z10,
            targetZ
          )
        );
      }

      // Right
      if (
        (z10 < targetZ && z11 >= targetZ) ||
        (z10 >= targetZ && z11 < targetZ)
      ) {
        intersections.push(
          interpolateContourPoint(
            p10,
            z10,
            p11,
            z11,
            targetZ
          )
        );
      }

      // Top
      if (
        (z11 < targetZ && z01 >= targetZ) ||
        (z11 >= targetZ && z01 < targetZ)
      ) {
        intersections.push(
          interpolateContourPoint(
            p11,
            z11,
            p01,
            z01,
            targetZ
          )
        );
      }

      // Left
      if (
        (z01 < targetZ && z00 >= targetZ) ||
        (z01 >= targetZ && z00 < targetZ)
      ) {
        intersections.push(
          interpolateContourPoint(
            p01,
            z01,
            p00,
            z00,
            targetZ
          )
        );
      }

      // Normalmente abbiamo due intersezioni.
      // Nel caso ambiguo di quattro intersezioni,
      // colleghiamo le due coppie.
      if (intersections.length === 2) {

        zCtx.moveTo(
          g.sx(intersections[0].x),
          g.sy(intersections[0].y)
        );

        zCtx.lineTo(
          g.sx(intersections[1].x),
          g.sy(intersections[1].y)
        );

      } else if (
        intersections.length === 4
      ) {

        zCtx.moveTo(
          g.sx(intersections[0].x),
          g.sy(intersections[0].y)
        );

        zCtx.lineTo(
          g.sx(intersections[1].x),
          g.sy(intersections[1].y)
        );

        zCtx.moveTo(
          g.sx(intersections[2].x),
          g.sy(intersections[2].y)
        );

        zCtx.lineTo(
          g.sx(intersections[3].x),
          g.sy(intersections[3].y)
        );
      }
    }
  }

  // Stile dell'isolinea
  zCtx.strokeStyle =
    "#c44a4a";

  zCtx.lineWidth = 2;

  zCtx.stroke();

  zCtx.restore();
}


// -----------------------------------------------------
// Aggiornamento automatico
// -----------------------------------------------------

zLambdaInput.addEventListener(
  "input",
  drawZContour
);

zContourInput.addEventListener(
  "input",
  drawZContour
);

milestonesInput.addEventListener(
  "input",
  drawZContour
);

curvatureInput.addEventListener(
  "input",
  drawZContour
);

window.addEventListener(
  "resize",
  drawZContour
);


// Prima visualizzazione
requestAnimationFrame(
  drawZContour
);
