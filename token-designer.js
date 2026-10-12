const canvas = document.getElementById('tokenCanvas');
const ctx = canvas.getContext('2d');
const colorButtons = document.querySelectorAll('.swatch');
const toolButtons = document.querySelectorAll('.tool-btn');
const lineWidthInput = document.getElementById('lineWidth');
const printQuantityInput = document.getElementById('printQuantity');
const printThermerBtn = document.getElementById('printThermerBtn');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');

const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8787'
    : 'https://mtg-token-printer-worker.luciano-wxc.workers.dev';

const state = {
  tool: 'pen',
  color: '#111827',
  lineWidth: Number(lineWidthInput.value),
  drawing: false,
  startX: 0,
  startY: 0,
  history: [],
  previewBaseImageData: null,
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

function drawShapePreview(tool, x, y) {
  ctx.strokeStyle = state.color;
  ctx.lineWidth = state.lineWidth;

  if (tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(state.startX, state.startY);
    ctx.lineTo(x, y);
    ctx.stroke();
    return;
  }

  if (tool === 'rect') {
    const width = x - state.startX;
    const height = y - state.startY;
    ctx.strokeRect(state.startX, state.startY, width, height);
    return;
  }

  if (tool === 'circle') {
    const radius = Math.hypot(x - state.startX, y - state.startY);
    ctx.beginPath();
    ctx.arc(state.startX, state.startY, radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (tool === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(state.startX, state.startY);
    ctx.lineTo(x, y);
    ctx.lineTo(state.startX - (x - state.startX), y);
    ctx.closePath();
    ctx.stroke();
  }
}

function beginDraw(event) {
  event.preventDefault();
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

  if (state.tool === 'line' || state.tool === 'rect' || state.tool === 'circle' || state.tool === 'triangle') {
    state.previewBaseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  pushHistory();
}

function draw(event) {
  if (!state.drawing) return;
  event.preventDefault();

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

  if (state.previewBaseImageData) {
    ctx.putImageData(state.previewBaseImageData, 0, 0);
    drawShapePreview(state.tool, x, y);
  }
}

function endDraw() {
  if (!state.drawing) return;
  state.drawing = false;
  state.previewBaseImageData = null;

  if (state.tool === 'pen' || state.tool === 'eraser') {
    ctx.beginPath();
  }
}

function undo() {
  if (state.history.length <= 1) {
    fillCanvasWhite();
    state.history = [];
    pushHistory();
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

function getPrintQuantity() {
  const raw = Number(printQuantityInput?.value || 1);
  return Math.min(Math.max(Number.isFinite(raw) ? raw : 1, 1), 10);
}

function buildThermerImagePayload() {
  const attempts = [
    { size: 480, quality: 0.78 },
    { size: 384, quality: 0.65 },
    { size: 320, quality: 0.55 },
    { size: 256, quality: 0.45 },
  ];

  for (const attempt of attempts) {
    const temp = document.createElement('canvas');
    temp.width = attempt.size;
    temp.height = attempt.size;
    const tctx = temp.getContext('2d');

    tctx.fillStyle = WHITE;
    tctx.fillRect(0, 0, temp.width, temp.height);
    tctx.drawImage(canvas, 0, 0, temp.width, temp.height);

    const dataUrl = temp.toDataURL('image/jpeg', attempt.quality);
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const estimatedLength = encodeURIComponent(base64Data).length;

    if (estimatedLength <= 7000) {
      return {
        mime: 'image/jpeg',
        base64Data,
      };
    }
  }

  throw new Error('A imagem ficou grande demais para envio direto à Thermer. Reduza os detalhes e tente novamente.');
}

function printCanvasWithThermer() {
  if (!window.MTGPrint?.launchThermerPrint) {
    window.alert('Integração com Thermer não disponível nesta página.');
    return;
  }

  try {
    const quantity = getPrintQuantity();
    const payload = buildThermerImagePayload();
    const endpoint = `${API_BASE}/api/custom/print-image?mime=${encodeURIComponent(payload.mime)}&quantity=${quantity}&img=${encodeURIComponent(payload.base64Data)}`;

    window.MTGPrint.clearAndroidHint?.('androidThermerHint');
    window.MTGPrint.launchThermerPrint({
      endpoint,
      androidHintElementId: 'androidThermerHint',
    });
  } catch (error) {
    window.alert(error.message || 'Falha ao preparar impressão para a Thermer.');
  }
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
canvas.addEventListener('pointercancel', endDraw);
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
printThermerBtn?.addEventListener('click', printCanvasWithThermer);

fillCanvasWhite();
pushHistory();
setTool('pen');
setColor('#111827');
