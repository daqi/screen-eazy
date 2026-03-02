function getCurrentTauriWindow() {
  return (
    window.__TAURI__?.webviewWindow?.getCurrentWebviewWindow?.() ||
    window.__TAURI__?.window?.getCurrentWindow?.() ||
    null
  );
}

function bindDragging() {
  const currentWindow = getCurrentTauriWindow();
  if (!currentWindow?.startDragging) return;

  document.querySelector('.drag-root')?.addEventListener('mousedown', async (event) => {
    if (event.button !== 0) return;
    try {
      await currentWindow.startDragging();
    } catch (_) {}
  });
}

bindDragging();
