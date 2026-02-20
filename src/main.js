const path = require('path');
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');

let controlWindow;
let cameraWindow;
let tray;

const OVERLAY_DEFAULTS = {
  cameraSize: 280,
  borderRadius: 68,
  borderWidth: 2,
  borderColor: '#ffffff',
  shadowBlur: 20,
  shadowOpacity: 0.45,
  clickThrough: false
};

function getOverlayWindowMetrics(style = {}) {
  const cameraSize = Number(style.cameraSize ?? OVERLAY_DEFAULTS.cameraSize);
  const borderWidth = Number(style.borderWidth ?? OVERLAY_DEFAULTS.borderWidth);
  const shadowBlur = Number(style.shadowBlur ?? OVERLAY_DEFAULTS.shadowBlur);
  const shadowOffsetY = 12;
  const padding = Math.max(10, Math.ceil(shadowBlur + borderWidth + Math.abs(shadowOffsetY) + 2));

  return {
    cameraSize,
    width: cameraSize + padding * 2,
    height: cameraSize + padding * 2
  };
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 860,
    height: 640,
    minWidth: 820,
    minHeight: 620,
    title: 'CamShadow Control Center',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  controlWindow.loadFile(path.join(__dirname, 'renderer/control.html'));
  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

function createCameraWindow() {
  const metrics = getOverlayWindowMetrics();

  cameraWindow = new BrowserWindow({
    width: metrics.width,
    height: metrics.height,
    x: 40,
    y: 40,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  cameraWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  cameraWindow.setAlwaysOnTop(true, 'screen-saver');
  cameraWindow.loadFile(path.join(__dirname, 'renderer/camera.html'));
  cameraWindow.on('closed', () => {
    cameraWindow = null;
  });
}

function ensureControlWindowVisible() {
  if (!controlWindow || controlWindow.isDestroyed()) {
    createControlWindow();
    return;
  }

  if (controlWindow.isMinimized()) {
    controlWindow.restore();
  }

  controlWindow.show();
  controlWindow.focus();
}

function ensureCameraWindowVisible() {
  if (!cameraWindow || cameraWindow.isDestroyed()) {
    createCameraWindow();
    return;
  }

  cameraWindow.showInactive();
}

function createTray() {
  if (tray) {
    return;
  }

  const trayIconPath = path.join(__dirname, '..', 'static', 'icon.png');
  let icon = nativeImage.createFromPath(trayIconPath);

  if (icon.isEmpty()) {
    const fallbackSvg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><rect x="3" y="6" width="14" height="12" rx="3" fill="#f5f7ff"/><circle cx="10" cy="12" r="3" fill="#1f1f2e"/><path d="M17 10l4-2v8l-4-2z" fill="#f5f7ff"/></svg>');
    icon = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${fallbackSvg}`);
  }

  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip('CamShadow');

  tray.on('click', () => {
    ensureControlWindowVisible();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示控制中心',
      click: () => ensureControlWindowVisible()
    },
    {
      label: '显示摄像头浮层',
      click: () => ensureCameraWindowVisible()
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createControlWindow();
  createCameraWindow();
  createTray();

  ipcMain.handle('overlay:update-style', (_event, stylePayload) => {
    if (!cameraWindow) {
      return;
    }

    const metrics = getOverlayWindowMetrics(stylePayload);
    const bounds = cameraWindow.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    cameraWindow.setBounds({
      x: Math.round(centerX - metrics.width / 2),
      y: Math.round(centerY - metrics.height / 2),
      width: metrics.width,
      height: metrics.height
    });

    cameraWindow.webContents.send('overlay:apply-style', {
      ...stylePayload,
      cameraWidth: metrics.cameraSize,
      cameraHeight: metrics.cameraSize
    });

    if (typeof stylePayload.clickThrough === 'boolean') {
      cameraWindow.setIgnoreMouseEvents(stylePayload.clickThrough, { forward: true });
    }
  });

  ipcMain.handle('overlay:toggle-visible', (_event, visible) => {
    if (!cameraWindow) {
      return;
    }

    if (visible) {
      cameraWindow.showInactive();
    } else {
      cameraWindow.hide();
    }
  });

  ipcMain.handle('overlay:get-defaults', () => OVERLAY_DEFAULTS);

  ipcMain.handle('control:hide', () => {
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.hide();
    }
  });

  ipcMain.handle('control:show', () => {
    ensureControlWindowVisible();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
      createCameraWindow();
    }
    createTray();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
