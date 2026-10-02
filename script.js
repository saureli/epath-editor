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
const coordinatesBtn = document.getElementById("downloadBtn");

const defaults = {
  referenceRmsd: 8.0,
  milestones: 8,
  curvature: 0.0
};

function getState() {
  const referenceRmsd = Math.max(
    0.1,
    Number(referenceRmsdInput.value) || defaults.referenceRmsd
  );

  const milestones = Math.max(
    2,
    Math.round(Number(milestonesInput.value) || defaults.milestones)
  );

  const curvature = Math.min(
    1,
    Math.max(0, Number(curvatureInput.value) || 0)
  );

  return {
    referenceRmsd,
    milestones,
    curvature
  };
}

/*
  Geometria del path:

  x(t) = R * t
  y(t) = R * (1 - t) + c * R * 4t(1-t)

  R = RMSD tra le due strutture di riferimento
  c = 0 -> retta
  c > 0 -> curva convessa verso l'alto
*/

function pointAt(t, state) {
  const R = state.referenceRmsd;

  const x = R * t;

  const bump = 4 * t * (1 - t);

  const y =
    R * (1 - t) +
    state.curvature * R * bump;

  return { x, y };
}

function generateMilestones(state) {
  const points = [];

  for (let i = 0; i < state.milestones; i += 1) {
    const t = i / (state.milestones - 1);

    const p = pointAt(t, state);

    points.push({
      index: i + 1,
      t,
      x: p.x,
      y: p.y
    });
  }

  return points;
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

  return {
    width: rect.width,
    height: rect.height
  };
}

function geometry(state) {
  const { width, height } = getCanvasSize();

  const margin = {
    left: 58,
    right: 22,
    top: 22,
    bottom: 52
  };

  const maxY =
    state.referenceRmsd *
    (1 + state.curvature);

  const maxAxis =
    Math.max(
      state.referenceRmsd,
      maxY,
      1
    ) * 1.12;

  const plotW =
    width -
    margin.left -
    margin.right;

  const plotH =
    height -
    margin.top -
    margin.bottom;

  const unitX = plotW / maxAxis;
  const unitY = plotH / maxAxis;

  const sx = (x) =>
    margin.left + x * unitX;

  const sy = (y) =>
    height -
    margin.bottom -
    y * unitY;

  return {
    width,
    height,
    margin,
    maxAxis,
    sx,
    sy
  };
}

function niceStep(maxAxis) {
  const rough = maxAxis / 6;

  const power =
    Math.pow(
      10,
      Math.floor(Math.log10(rough))
    );

  const normalized =
    rough / power;

  if (normalized < 1.5) return 1 * power;
  if (normalized < 3.5) return 2 * power;
  if (normalized < 7.5) return 5 * power;

  return 10 * power;
}

function formatTick(value) {
  return value < 10
    ? value.toFixed(1).replace(/\.0$/, "")
    : value.toFixed(0);
}

function drawAxes(g) {
  ctx.save();

  ctx.lineWidth = 1;

  const step = niceStep(g.maxAxis);

  ctx.font =
    "11px Inter, system-ui, sans-serif";

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (
    let v = 0;
    v <= g.maxAxis + step * 0.001;
    v += step
  ) {
    const x = g.sx(v);
    const y = g.sy(v);

    // Vertical grid line
    ctx.beginPath();
    ctx.moveTo(x, g.margin.top);
    ctx.lineTo(
      x,
      g.height - g.margin.bottom
    );

    ctx.strokeStyle = "#e7ebf0";
    ctx.stroke();

    // Horizontal grid line
    ctx.beginPath();
    ctx.moveTo(
      g.margin.left,
      y
    );

    ctx.lineTo(
      g.width - g.margin.right,
      y
    );

    ctx.strokeStyle = "#e7ebf0";
    ctx.stroke();

    // Labels
    if (v > 0) {
      ctx.fillStyle = "#7b8490";

      ctx.fillText(
        formatTick(v),
        x,
        g.height - g.margin.bottom + 8
      );

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      ctx.fillText(
        formatTick(v),
        g.margin.left - 9,
        y
      );

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
    }
  }

  // X axis
  ctx.strokeStyle = "#202833";
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  ctx.moveTo(
    g.margin.left,
    g.height - g.margin.bottom
  );

  ctx.lineTo(
    g.width - g.margin.right,
    g.height - g.margin.bottom
  );

  ctx.stroke();

  // Y axis
  ctx.beginPath();

  ctx.moveTo(
    g.margin.left,
    g.height - g.margin.bottom
  );

  ctx.lineTo(
    g.margin.left,
    g.margin.top
  );

  ctx.stroke();

  // Arrow X
  ctx.beginPath();

  ctx.moveTo(
    g.width - g.margin.right,
    g.height - g.margin.bottom
  );

  ctx.lineTo(
    g.width - g.margin.right - 8,
    g.height - g.margin.bottom - 4
  );

  ctx.moveTo(
    g.width - g.margin.right,
    g.height - g.margin.bottom
  );

  ctx.lineTo(
    g.width - g.margin.right - 8,
    g.height - g.margin.bottom + 4
  );

  // Arrow Y
  ctx.moveTo(
    g.margin.left,
    g.margin.top
  );

  ctx.lineTo(
    g.margin.left - 4,
    g.margin.top + 8
  );

  ctx.moveTo(
    g.margin.left,
    g.margin.top
  );

  ctx.lineTo(
    g.margin.left + 4,
    g.margin.top + 8
  );

  ctx.stroke();

  ctx.fillStyle = "#202833";
  ctx.font =
    "600 12px Inter, system-ui, sans-serif";

  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";

  ctx.fillText(
    "RMSD inactive",
    g.width - g.margin.right,
    g.height - 14
  );

  ctx.save();

  ctx.translate(17, g.margin.top);
  ctx.rotate(-Math.PI / 2);

  ctx.textAlign = "left";

  ctx.fillText(
    "RMSD active",
    0,
    0
  );

  ctx.restore();
  ctx.restore();
}

function drawPath(points, g, state) {
  ctx.save();

  const R = state.referenceRmsd;

  // Diagonale di riferimento
  ctx.beginPath();

  ctx.moveTo(
    g.sx(0),
    g.sy(R)
  );

  ctx.lineTo(
    g.sx(R),
    g.sy(0)
  );

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#aeb7c2";
  ctx.lineWidth = 1;

  ctx.stroke();

  ctx.setLineDash([]);

  // Path
  ctx.beginPath();

  const samples = 160;

  for (
    let i = 0;
    i <= samples;
    i += 1
  ) {
    const t = i / samples;

    const p =
      pointAt(t, state);

    const x = g.sx(p.x);
    const y = g.sy(p.y);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.strokeStyle = "#202833";
  ctx.lineWidth = 2.5;

  ctx.stroke();

  // Milestones
  points.forEach(
    (p, index) => {
      const x = g.sx(p.x);
      const y = g.sy(p.y);

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        index === 0 ||
        index === points.length - 1
          ? 6
          : 4.5,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#202833";

      ctx.stroke();

      // Label
      ctx.font =
        "600 10px Inter, system-ui, sans-serif";

      ctx.fillStyle = "#4e5965";
      ctx.textBaseline = "bottom";

      if (index === 0) {
        ctx.textAlign = "left";

        ctx.fillText(
          `M${p.index}`,
          x + 8,
          y - 5
        );
      } else if (
        index === points.length - 1
      ) {
        ctx.textAlign = "right";

        ctx.fillText(
          `M${p.index}`,
          x - 8,
          y - 5
        );
      } else {
        ctx.textAlign = "center";

        ctx.fillText(
          `M${p.index}`,
          x,
          y - 9
        );
      }
    }
  );

  ctx.restore();
}

function draw() {
  const state = getState();

  const {
    width,
    height
  } = getCanvasSize();

  if (!width || !height) {
    return;
  }

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  const g =
    geometry(state);

  const points =
    generateMilestones(state);

  drawAxes(g);
  drawPath(
    points,
    g,
    state
  );

  milestonesValue.textContent =
    String(state.milestones);

  curvatureValue.textContent =
    state.curvature.toFixed(2);

  milestoneCount.textContent =
    String(state.milestones);

  const first = points[0];
  const last =
    points[points.length - 1];

  startPoint.textContent =
    `(${first.x.toFixed(2)}, ${first.y.toFixed(2)})`;

  endPoint.textContent =
    `(${last.x.toFixed(2)}, ${last.y.toFixed(2)})`;
}

/*
  Creiamo la finestra delle coordinate
  direttamente con JavaScript.

  Questo significa che NON dobbiamo modificare
  index.html.
*/

function buildCoordinatesModal() {
  if (
    document.getElementById(
      "coordinatesModal"
    )
  ) {
    return;
  }

  const modal =
    document.createElement("div");

  modal.id =
    "coordinatesModal";

  modal.className =
    "modal hidden";

  modal.innerHTML = `
    <div class="modal-content"
         role="dialog"
         aria-modal="true"
         aria-labelledby="coordinatesTitle">

      <div class="modal-header">
        <h2 id="coordinatesTitle">
          Milestone coordinates
        </h2>

        <button
          id="closeCoordinatesBtn"
          class="close-btn"
          type="button"
          aria-label="Close">
          &times;
        </button>
      </div>

      <div class="table-wrapper">

        <table class="coordinates-table">

          <thead>
            <tr>
              <th>Milestone</th>
              <th>RMSD inactive</th>
              <th>RMSD active</th>
            </tr>
          </thead>

          <tbody
            id="coordinatesTableBody">
          </tbody>

        </table>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn =
    modal.querySelector(
      "#closeCoordinatesBtn"
    );

  closeBtn.addEventListener(
    "click",
    () => {
      modal.classList.add(
        "hidden"
      );
    }
  );

  modal.addEventListener(
    "click",
    (event) => {
      if (
        event.target === modal
      ) {
        modal.classList.add(
          "hidden"
        );
      }
    }
  );
}

function showCoordinates() {
  buildCoordinatesModal();

  const modal =
    document.getElementById(
      "coordinatesModal"
    );

  const tbody =
    document.getElementById(
      "coordinatesTableBody"
    );

  const points =
    generateMilestones(
      getState()
    );

  tbody.innerHTML =
    points
      .map(
        (point) => `
          <tr>
            <td>M${point.index}</td>
            <td>${point.x.toFixed(4)}</td>
            <td>${point.y.toFixed(4)}</td>
          </tr>
        `
      )
      .join("");

  modal.classList.remove(
    "hidden"
  );
}

function reset() {
  referenceRmsdInput.value =
    defaults.referenceRmsd;

  milestonesInput.value =
    defaults.milestones;

  curvatureInput.value =
    defaults.curvature;

  draw();
}

/*
  Usiamo il vecchio pulsante
  "Esporta coordinate JSON"
  ma ora lo trasformiamo in
  "Mostra coordinate".
*/

coordinatesBtn.textContent =
  "Mostra coordinate";

coordinatesBtn.addEventListener(
  "click",
  showCoordinates
);

[
  referenceRmsdInput,
  milestonesInput,
  curvatureInput
].forEach(
  (element) => {
    element.addEventListener(
      "input",
      draw
    );
  }
);

resetBtn.addEventListener(
  "click",
  reset
);

window.addEventListener(
  "resize",
  resizeCanvas
);

requestAnimationFrame(
  resizeCanvas
);
