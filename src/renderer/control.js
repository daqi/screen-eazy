const statusEl = document.getElementById('status');
const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');

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
  await window.camshadow.updateOverlayStyle(currentStylePayload());
}

toggleOverlayBtn.addEventListener('click', async () => {
  overlayVisible = !overlayVisible;
  await window.camshadow.toggleOverlayVisible(overlayVisible);
  toggleOverlayBtn.textContent = overlayVisible ? '隐藏摄像头浮层' : '显示摄像头浮层';
  statusEl.textContent = overlayVisible ? '摄像头悬浮窗已显示' : '摄像头悬浮窗已隐藏';
});

(async function bootstrap() {
  const defaults = await window.camshadow.getOverlayDefaults();
  styleControls.cameraSize.value = String(defaults.cameraSize);
  styleControls.borderRadius.max = String(defaults.cameraSize / 2);
  styleControls.borderRadius.value = String(defaults.borderRadius);
  styleControls.borderWidth.value = String(defaults.borderWidth);
  styleControls.shadowBlur.value = String(defaults.shadowBlur);
  styleControls.borderColor.value = defaults.borderColor;
  styleControls.shadowOpacity.value = String(defaults.shadowOpacity);
  styleControls.clickThrough.checked = defaults.clickThrough;

  attachStyleEvents();
  syncRadiusByCameraSize();
  refreshStyleInputHoverValues();

  await pushOverlayStyle();
})();
