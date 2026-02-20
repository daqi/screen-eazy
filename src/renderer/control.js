const statusEl = document.getElementById('status');
const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
const SETTINGS_STORAGE_KEY = 'camshadow.overlay.settings.v1';

const tauriInvoke = window.__TAURI__?.core?.invoke;

const api = {
  getOverlayDefaults: () => {
    if (typeof tauriInvoke === 'function') {
      return tauriInvoke('get_overlay_defaults');
    }
    return window.camshadow.getOverlayDefaults();
  },
  updateOverlayStyle: (style) => {
    if (typeof tauriInvoke === 'function') {
      return tauriInvoke('update_overlay_style', { style });
    }
    return window.camshadow.updateOverlayStyle(style);
  },
  toggleOverlayVisible: (visible) => {
    if (typeof tauriInvoke === 'function') {
      return tauriInvoke('toggle_overlay_visible', { visible });
    }
    return window.camshadow.toggleOverlayVisible(visible);
  },
  getOverlayPosition: () => {
    if (typeof tauriInvoke === 'function') {
      return tauriInvoke('get_overlay_position');
    }
    return null;
  },
  setOverlayPosition: (position) => {
    if (typeof tauriInvoke === 'function') {
      return tauriInvoke('set_overlay_position', { position });
    }
    return null;
  }
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
let lastOverlayPosition = null;

function saveSettings() {
  try {
    const payload = {
      style: currentStylePayload(),
      overlayVisible,
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

  setInterval(() => {
    snapshotOverlayPosition();
  }, 1200);
})();
