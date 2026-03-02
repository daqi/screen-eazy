const preview = document.getElementById('preview');
const cameraShell = document.getElementById('cameraShell');
const cameraClip = document.getElementById('cameraClip');
const fallback = document.getElementById('fallback');
const dragRoot = document.querySelector('.drag-root');

const tauriListen = window.__TAURI__?.event?.listen;

function getCurrentTauriWindow() {
  const webviewWindow = window.__TAURI__?.webviewWindow?.getCurrentWebviewWindow?.();
  if (webviewWindow) {
    return webviewWindow;
  }

  const legacyWindow = window.__TAURI__?.window?.getCurrentWindow?.();
  if (legacyWindow) {
    return legacyWindow;
  }

  return null;
}

let cameraStream = null;
let lastRenderKey = '';

function rgba(hex, alpha) {
  const raw = hex.replace('#', '');
  const parsed = raw.length === 3
    ? raw.split('').map((ch) => ch + ch).join('')
    : raw;
  const int = Number.parseInt(parsed, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function startCameraPreview(deviceLabel) {
  try {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }

    // Always enumerate to get a concrete deviceId
    let resolvedDeviceId = null;
    try {
      // Request permission first so labels are populated
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      tmp.getTracks().forEach(t => t.stop());
    } catch (_) {}
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    if (deviceLabel) {
      const match = cameras.find(d => d.label === deviceLabel);
      resolvedDeviceId = match?.deviceId || cameras[0]?.deviceId || null;
    } else {
      resolvedDeviceId = cameras[0]?.deviceId || null;
    }

    const constraints = {
      video: resolvedDeviceId
        ? { deviceId: { exact: resolvedDeviceId } }
        : true,
      audio: false
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    preview.srcObject = cameraStream;
    fallback.classList.remove('show');
  } catch (error) {
    console.error('camera preview failed', error);
    fallback.classList.add('show');
  }
}

function applyStyle(style) {
  const radius = Number(style.borderRadius ?? 12);
  const borderWidth = Number(style.borderWidth ?? 2);
  const borderColor = style.borderColor || '#ffffff';
  const shadowBlur = Number(style.shadowBlur ?? 20);
  const shadowOpacity = Number(style.shadowOpacity ?? 0.45);
  const shadowOffsetY = 12;
  const cameraWidth = Number(style.cameraWidth ?? 280);
  const cameraHeight = Number(style.cameraHeight ?? 280);

  cameraShell.style.width = `${cameraWidth}px`;
  cameraShell.style.height = `${cameraHeight}px`;
  cameraShell.style.borderRadius = `${radius}px`;
  cameraShell.style.boxShadow = `0 ${shadowOffsetY}px ${shadowBlur}px ${rgba('#000000', shadowOpacity)}`;

  cameraClip.style.borderRadius = `${radius}px`;
  cameraClip.style.overflow = 'hidden';
  cameraClip.style.webkitMaskImage = '-webkit-radial-gradient(white, black)';
  cameraClip.style.webkitMaskRepeat = 'no-repeat';
  cameraClip.style.webkitMaskSize = '100% 100%';
  cameraClip.style.border = `${borderWidth}px solid ${borderColor}`;

  const renderKey = `${radius}-${cameraWidth}-${cameraHeight}`;
  if (renderKey !== lastRenderKey) {
    preview.style.transform = 'scaleX(-1) translateZ(0)';
    preview.style.willChange = 'transform';
    void preview.offsetWidth;
    preview.style.transform = 'scaleX(-1)';
    lastRenderKey = renderKey;
  }
}

function bindDragging() {
  const currentWindow = getCurrentTauriWindow();
  if (!currentWindow?.startDragging) {
    return;
  }

  const startDrag = async (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    try {
      await currentWindow.startDragging();
    } catch (_error) {
    }
  };

  dragRoot?.addEventListener('mousedown', startDrag);
  cameraShell.addEventListener('mousedown', startDrag);
}

if (typeof tauriListen === 'function') {
  tauriListen('overlay:apply-style', (event) => {
    applyStyle(event.payload || {});
  });

  tauriListen('camera:select-device', (event) => {
    const label = event.payload;
    if (label) {
      startCameraPreview(label);
    }
  });
}

startCameraPreview();
bindDragging();
