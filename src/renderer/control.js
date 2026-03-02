const statusEl = document.getElementById('status');
const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
const toggleFrameBtn = document.getElementById('toggleFrameBtn');
const applyFrameSizeBtn = document.getElementById('applyFrameSizeBtn');
const toggleFrameClickThroughBtn = document.getElementById('toggleFrameClickThroughBtn');
const cameraSelectEl = document.getElementById('cameraSelect');
const frameWidthEl = document.getElementById('frameWidth');
const frameHeightEl = document.getElementById('frameHeight');
const SETTINGS_STORAGE_KEY = 'camshadow.overlay.settings.v2';

const tauriInvoke = window.__TAURI__?.core?.invoke;

const api = {
  getOverlayDefaults: () => {
    return tauriInvoke('get_overlay_defaults');
  },
  updateOverlayStyle: (style) => {
    return tauriInvoke('update_overlay_style', { style });
  },
  toggleOverlayVisible: (visible) => {
    return tauriInvoke('toggle_overlay_visible', { visible });
  },
  getOverlayPosition: () => {
    return tauriInvoke('get_overlay_position');
  },
  setOverlayPosition: (position) => {
    return tauriInvoke('set_overlay_position', { position });
  },
  toggleFrameVisible: (visible) => tauriInvoke('toggle_frame_visible', { visible }),
  setFrameSize: (width, height) => tauriInvoke('set_frame_size', { width, height }),
  setFrameClickThrough: (enable) => tauriInvoke('set_frame_click_through', { enable }),
  setCameraDevice: (deviceId) => tauriInvoke('set_camera_device', { deviceId }),
};

const styleControls = {
  cameraSize: document.getElementById('cameraSize'),
  borderRadius: document.getElementById('radius'),
  borderWidth: document.getElementById('borderWidth'),
  shadowBlur: document.getElementById('shadowBlur'),
  borderColor: document.getElementById('borderColor'),
  shadowOpacity: document.getElementById('shadowOpacity'),
  clickThrough: document.getElementById('clickThrough')
};

let overlayVisible = true;
let frameVisible = false;
let frameClickThrough = false;
let lastOverlayPosition = null;

function saveSettings() {
  try {
    const payload = {
      style: currentStylePayload(),
      overlayVisible,
      frameVisible,
      overlayPosition: lastOverlayPosition
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
  }
}

async function snapshotOverlayPosition() {
  try {
    const position = await api.getOverlayPosition();
    if (position && Number.isInteger(position.x) && Number.isInteger(position.y)) {
      lastOverlayPosition = position;
      saveSettings();
    }
  } catch (_error) {
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch (_error) {
    return null;
  }
}

function applySavedStyle(style) {
  if (!style || typeof style !== 'object') {
    return;
  }

  if (typeof style.cameraSize === 'number') {
    styleControls.cameraSize.value = String(style.cameraSize);
  }

  syncRadiusByCameraSize();

  if (typeof style.borderRadius === 'number') {
    styleControls.borderRadius.value = String(style.borderRadius);
  }
  if (typeof style.borderWidth === 'number') {
    styleControls.borderWidth.value = String(style.borderWidth);
  }
  if (typeof style.shadowBlur === 'number') {
    styleControls.shadowBlur.value = String(style.shadowBlur);
  }
  if (typeof style.borderColor === 'string') {
    styleControls.borderColor.value = style.borderColor;
  }
  if (typeof style.shadowOpacity === 'number') {
    styleControls.shadowOpacity.value = String(style.shadowOpacity);
  }
  if (typeof style.clickThrough === 'boolean') {
    styleControls.clickThrough.checked = style.clickThrough;
  }

  syncRadiusByCameraSize();
}

function updateOverlayVisibilityUI() {
  toggleOverlayBtn.textContent = overlayVisible ? '隐藏摄像头浮层' : '显示摄像头浮层';
  statusEl.textContent = overlayVisible ? '摄像头悬浮窗已显示' : '摄像头悬浮窗已隐藏';
}

function attachStyleEvents() {
  Object.values(styleControls).forEach((control) => {
    control.addEventListener('input', pushOverlayStyle);
    control.addEventListener('input', refreshStyleInputHoverValues);
  });

  styleControls.cameraSize.addEventListener('input', syncRadiusByCameraSize);
}

function syncRadiusByCameraSize() {
  const cameraSize = Number(styleControls.cameraSize.value);
  const maxRadius = Math.floor(cameraSize / 2);
  styleControls.borderRadius.max = String(maxRadius);

  if (Number(styleControls.borderRadius.value) > maxRadius) {
    styleControls.borderRadius.value = String(maxRadius);
  }
}

function refreshStyleInputHoverValues() {
  const cameraSize = Number(styleControls.cameraSize.value);
  const radius = Number(styleControls.borderRadius.value);
  const borderWidth = Number(styleControls.borderWidth.value);
  const shadowBlur = Number(styleControls.shadowBlur.value);
  const shadowOpacity = Number(styleControls.shadowOpacity.value);
  const borderColor = styleControls.borderColor.value;
  const clickThrough = styleControls.clickThrough.checked;

  styleControls.cameraSize.title = `${cameraSize}px`;
  styleControls.borderRadius.title = `${radius}px`;
  styleControls.borderWidth.title = `${borderWidth}px`;
  styleControls.shadowBlur.title = `${shadowBlur}px`;
  styleControls.shadowOpacity.title = String(shadowOpacity);
  styleControls.borderColor.title = borderColor;
  styleControls.clickThrough.title = clickThrough ? '开启' : '关闭';
}

function currentStylePayload() {
  return {
    cameraSize: Number(styleControls.cameraSize.value),
    borderRadius: Number(styleControls.borderRadius.value),
    borderWidth: Number(styleControls.borderWidth.value),
    shadowBlur: Number(styleControls.shadowBlur.value),
    borderColor: styleControls.borderColor.value,
    shadowOpacity: Number(styleControls.shadowOpacity.value),
    clickThrough: Boolean(styleControls.clickThrough.checked)
  };
}

async function pushOverlayStyle() {
  await api.updateOverlayStyle(currentStylePayload());
  saveSettings();
}

toggleOverlayBtn.addEventListener('click', async () => {
  overlayVisible = !overlayVisible;
  await api.toggleOverlayVisible(overlayVisible);
  updateOverlayVisibilityUI();
  saveSettings();
});

function updateFrameUI() {
  if (toggleFrameBtn) {
    toggleFrameBtn.textContent = frameVisible ? '隐藏录制框' : '显示录制框';
  }
}

function updateFrameClickThroughUI() {
  if (toggleFrameClickThroughBtn) {
    toggleFrameClickThroughBtn.textContent = frameClickThrough ? '关闭穿透' : '开启穿透';
  }
}

if (toggleFrameBtn) {
  toggleFrameBtn.addEventListener('click', async () => {
    frameVisible = !frameVisible;
    await api.toggleFrameVisible(frameVisible);
    updateFrameUI();
    saveSettings();
  });
}

if (applyFrameSizeBtn) {
  applyFrameSizeBtn.addEventListener('click', async () => {
    const w = parseInt(frameWidthEl?.value || '540', 10);
    const h = parseInt(frameHeightEl?.value || '960', 10);
    if (w > 0 && h > 0) {
      await api.setFrameSize(w, h);
    }
  });
}

if (toggleFrameClickThroughBtn) {
  toggleFrameClickThroughBtn.addEventListener('click', async () => {
    frameClickThrough = !frameClickThrough;
    await api.setFrameClickThrough(frameClickThrough);
    updateFrameClickThroughUI();
  });
}

async function enumerateCameras() {
  if (!cameraSelectEl) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(t => t.stop());
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    cameraSelectEl.innerHTML = '';
    cameras.forEach((cam, i) => {
      const opt = document.createElement('option');
      const label = cam.label || `摄像头 ${i + 1}`;
      opt.value = label;
      opt.textContent = label;
      cameraSelectEl.appendChild(opt);
    });
    if (cameras.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '无可用摄像头';
      cameraSelectEl.appendChild(opt);
    }
  } catch (e) {
    console.warn('枚举摄像头失败:', e);
  }
}

if (cameraSelectEl) {
  cameraSelectEl.addEventListener('change', async () => {
    const label = cameraSelectEl.value;
    if (label) {
      await api.setCameraDevice(label);
    }
  });
}

(async function bootstrap() {
  const defaults = await api.getOverlayDefaults();
  styleControls.cameraSize.value = String(defaults.cameraSize);
  styleControls.borderRadius.max = String(defaults.cameraSize / 2);
  styleControls.borderRadius.value = String(defaults.borderRadius);
  styleControls.borderWidth.value = String(defaults.borderWidth);
  styleControls.shadowBlur.value = String(defaults.shadowBlur);
  styleControls.borderColor.value = defaults.borderColor;
  styleControls.shadowOpacity.value = String(defaults.shadowOpacity);
  styleControls.clickThrough.checked = defaults.clickThrough;

  const saved = loadSettings();
  applySavedStyle(saved?.style);
  if (typeof saved?.overlayVisible === 'boolean') {
    overlayVisible = saved.overlayVisible;
  }
  if (typeof saved?.frameVisible === 'boolean') {
    frameVisible = saved.frameVisible;
  }
  if (saved?.overlayPosition && Number.isInteger(saved.overlayPosition.x) && Number.isInteger(saved.overlayPosition.y)) {
    lastOverlayPosition = saved.overlayPosition;
  }

  attachStyleEvents();
  syncRadiusByCameraSize();
  refreshStyleInputHoverValues();

  await pushOverlayStyle();
  if (lastOverlayPosition) {
    await api.setOverlayPosition(lastOverlayPosition);
  }
  await api.toggleOverlayVisible(overlayVisible);
  updateOverlayVisibilityUI();

  await api.toggleFrameVisible(frameVisible);
  updateFrameUI();
  updateFrameClickThroughUI();

  await enumerateCameras();

  setInterval(() => {
    snapshotOverlayPosition();
  }, 1200);
})();
