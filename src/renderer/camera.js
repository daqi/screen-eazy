const preview = document.getElementById('preview');
const cameraShell = document.getElementById('cameraShell');
const fallback = document.getElementById('fallback');

let cameraStream = null;

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

async function startCameraPreview() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    });

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
  cameraShell.style.border = `${borderWidth}px solid ${borderColor}`;
  cameraShell.style.boxShadow = `0 ${shadowOffsetY}px ${shadowBlur}px ${rgba('#000000', shadowOpacity)}`;
}

window.camshadow.onOverlayStyle((style) => {
  applyStyle(style);
});

startCameraPreview();
