const canvas = document.getElementById('tokenCanvas');
const ctx = canvas.getContext('2d');
const colorButtons = document.querySelectorAll('.swatch');
const toolButtons = document.querySelectorAll('.tool-btn');
const lineWidthInput = document.getElementById('lineWidth');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');

const state = {
  tool: 'pen',
  color: '#111827',
  lineWidth: Number(lineWidthInput.value),
  drawing: false,
  startX: 0,
  startY: 0,
  history: [],
};

const WHITE = '#ffffff';

function fillCanvasWhite() {
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function pushHistory() {
  state.history.push(canvas.toDataURL());
  if (state.history.length > 30) {
    state.history.shift();
  }
}

function restoreFromHistory() {
  if (state.history.length === 0) return;
  const previous = new Image();
  const snapshot = state.history[state.history.length - 1];
  previous.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(previous, 0, 0, canvas.width, canvas.height);
  };
  previous.src = snapshot;
}

function setTool(tool) {
  state.tool = tool;
  toolButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === tool);
  });
}

function setColor(color) {
  state.color = color;
  colorButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.color === color);
  });
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function beginDraw(event) {
  const { x, y } = getPointerPosition(event);
  state.drawing = true;
  state.startX = x;
  state.startY = y;

  if (state.tool === 'pen' || state.tool === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = state.lineWidth;
    ctx.strokeStyle = state.tool === 'eraser' ? WHITE : state.color;
  }

  if (state.tool === 'text') {
    const value = window.prompt('Digite o texto do token', '');
    if (!value) {
      state.drawing = false;
      return;
    }
    pushHistory();
    ctx.fillStyle = state.color;
    ctx.font = `${Math.max(18, state.lineWidth * 5)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
    state.drawing = false;
    return;
  }

  pushHistory();
}

function draw(event) {
  if (!state.drawing) return;

  const { x, y } = getPointerPosition(event);

  if (state.tool === 'pen' || state.tool === 'eraser') {
    ctx.strokeStyle = state.tool === 'eraser' ? WHITE : state.color;
    ctx.lineWidth = state.lineWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    return;
  }

  if (state.tool === 'line') {
    redrawCanvas();
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.lineWidth;
    ctx.beginPath();
    ctx.moveTo(state.startX, state.startY);
    ctx.lineTo(x, y);
    ctx.stroke();
    return;
  }

  if (state.tool === 'rect') {
    redrawCanvas();
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.lineWidth;
    const width = x - state.startX;
    const height = y - state.startY;
    ctx.strokeRect(state.startX, state.startY, width, height);
    return;
  }

  if (state.tool === 'circle') {
    redrawCanvas();
    const radius = Math.hypot(x - state.startX, y - state.startY);
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.lineWidth;
    ctx.beginPath();
    ctx.arc(state.startX, state.startY, radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (state.tool === 'triangle') {
    redrawCanvas();
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.lineWidth;
    ctx.beginPath();
    ctx.moveTo(state.startX, state.startY);
    ctx.lineTo(x, state.startY + (y - state.startY));
    ctx.lineTo((state.startX + x) / 2, state.startY - Math.abs(y - state.startY));
    ctx.closePath();
    ctx.stroke();
  }
}

function redrawCanvas() {
  const snapshot = state.history[state.history.length - 1];
  if (!snapshot) return;

  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = snapshot;
}

function endDraw() {
  if (!state.drawing) return;
  state.drawing = false;

  if (state.tool === 'pen' || state.tool === 'eraser') {
    ctx.beginPath();
  }
}

function undo() {
  if (state.history.length <= 1) {
    fillCanvasWhite();
    state.history = [];
    return;
  }

  state.history.pop();
  const snapshot = state.history[state.history.length - 1];
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = snapshot;
}

function clearCanvas() {
  pushHistory();
  fillCanvasWhite();
}

function downloadCanvas() {
  const link = document.createElement('a');
  link.download = 'token-design.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

canvas.addEventListener('pointerdown', beginDraw);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointerleave', endDraw);

lineWidthInput.addEventListener('input', (event) => {
  state.lineWidth = Number(event.target.value);
});

toolButtons.forEach((button) => {
  button.addEventListener('click', () => setTool(button.dataset.tool));
});

colorButtons.forEach((button) => {
  button.addEventListener('click', () => setColor(button.dataset.color));
});

undoBtn.addEventListener('click', undo);
clearBtn.addEventListener('click', clearCanvas);
downloadBtn.addEventListener('click', downloadCanvas);

fillCanvasWhite();
pushHistory();
setTool('pen');
setColor('#111827');
