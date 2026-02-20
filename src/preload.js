const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('camshadow', {
  getOverlayDefaults: () => ipcRenderer.invoke('overlay:get-defaults'),
  updateOverlayStyle: (style) => ipcRenderer.invoke('overlay:update-style', style),
  toggleOverlayVisible: (visible) => ipcRenderer.invoke('overlay:toggle-visible', visible),
  hideControlWindow: () => ipcRenderer.invoke('control:hide'),
  showControlWindow: () => ipcRenderer.invoke('control:show'),
  onOverlayStyle: (handler) => {
    const wrapped = (_event, data) => handler(data);
    ipcRenderer.on('overlay:apply-style', wrapped);
    return () => ipcRenderer.off('overlay:apply-style', wrapped);
  }
});
