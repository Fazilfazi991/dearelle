(() => {
  const flow = document.querySelector('[data-skin-flow]');
  if (!flow) return;
  const screens = [...document.querySelectorAll('[data-skin-screen]')];
  const streamVideo = document.querySelector('[data-camera-stream]');
  const capturedPhoto = document.querySelector('[data-captured-photo]');
  const analysisPhoto = document.querySelector('[data-analysis-photo]');
  const captureButton = document.querySelector('[data-capture-snapshot]');
  const cameraHeading = document.querySelector('[data-camera-heading]');
  const cameraInstructions = document.querySelector('[data-camera-instructions]');
  const cameraStatus = document.querySelector('[data-camera-status]');
  const liveActions = document.querySelector('[data-camera-live-actions]');
  const reviewActions = document.querySelector('[data-camera-review-actions]');
  const errorActions = document.querySelector('[data-camera-error-actions]');
  const selections = new Set(['Hydration', 'Comfort']);
  let stream; let capturedFrame = ''; let analysisTimer;
  const showScreen = (name) => { screens.forEach((screen) => { screen.hidden = screen.dataset.skinScreen !== name; }); flow.dataset.activeScreen = name; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const setActions = (state) => { liveActions.hidden = state !== 'live'; reviewActions.hidden = state !== 'review'; errorActions.hidden = state !== 'error'; };
  const clearSnapshot = () => { capturedFrame = ''; [capturedPhoto, analysisPhoto].forEach((image) => { image.src = ''; image.hidden = true; }); };
  const stopCamera = () => { if (stream) stream.getTracks().forEach((track) => track.stop()); stream = null; streamVideo.srcObject = null; };
  function returnToIntro() { window.clearTimeout(analysisTimer); stopCamera(); clearSnapshot(); showScreen('intro'); }
  function showCameraError(kind) {
    stopCamera(); captureButton.disabled = true; captureButton.setAttribute('aria-disabled', 'true');
    cameraHeading.textContent = kind === 'unsupported' ? "Camera isn't available." : "We couldn't access your camera.";
    cameraInstructions.textContent = kind === 'unsupported' ? 'This device or browser does not provide a camera preview. You can still build your ritual manually.' : 'Check your browser permission, then try again. You can always continue without a scan.';
    cameraStatus.textContent = kind === 'unsupported' ? 'No supported camera was found.' : 'Camera permission was not granted.';
    setActions('error'); showScreen('camera');
  }
  async function startCamera() {
    clearSnapshot(); stopCamera(); cameraHeading.textContent = 'Find your light.';
    cameraInstructions.textContent = 'Remove glasses if you can, use even lighting, and keep a relaxed expression.';
    cameraStatus.textContent = 'Starting camera…'; captureButton.disabled = true; captureButton.setAttribute('aria-disabled', 'true'); setActions('live'); showScreen('camera');
    if (!navigator.mediaDevices?.getUserMedia) return showCameraError('unsupported');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamVideo.srcObject = stream; await streamVideo.play(); captureButton.disabled = false; captureButton.setAttribute('aria-disabled', 'false');
      cameraStatus.textContent = 'Camera ready — centre your face in the oval.';
    } catch (error) { showCameraError(error?.name === 'NotFoundError' ? 'unsupported' : 'denied'); }
  }
  function captureSnapshot() {
    if (!stream || !streamVideo.videoWidth || !streamVideo.videoHeight) return;
    const canvas = document.createElement('canvas'); canvas.width = streamVideo.videoWidth; canvas.height = streamVideo.videoHeight;
    const context = canvas.getContext('2d'); context.translate(canvas.width, 0); context.scale(-1, 1); context.drawImage(streamVideo, 0, 0, canvas.width, canvas.height);
    capturedFrame = canvas.toDataURL('image/jpeg', 0.9); capturedPhoto.src = capturedFrame; capturedPhoto.hidden = false; stopCamera();
    cameraHeading.textContent = 'Looking good.'; cameraInstructions.textContent = 'Review your snapshot before continuing.';
    cameraStatus.textContent = 'Preview paused. This temporary image has not been uploaded.'; setActions('review');
  }
  function usePhoto() {
    if (!capturedFrame) return; analysisPhoto.src = capturedFrame; analysisPhoto.hidden = false; showScreen('analyzing');
    const progress = document.querySelector('[data-analysis-progress]'); progress.style.width = '0%'; requestAnimationFrame(() => { progress.style.width = '100%'; });
    analysisTimer = window.setTimeout(() => { clearSnapshot(); showScreen('analysis-unavailable'); }, 1800);
  }
  function renderSelections() { document.querySelectorAll('[data-focus]').forEach((choice) => { const active = selections.has(choice.dataset.focus); choice.classList.toggle('is-selected', active); choice.setAttribute('aria-pressed', String(active)); }); }
  function showRoutine() { const values = [...selections]; document.querySelector('[data-focus-summary]').textContent = values.length ? values.join(' · ') : 'A simple everyday ritual'; document.querySelector('[data-routine-copy]').textContent = values.length ? `A thoughtful place to begin around ${values.map((value) => value.toLowerCase()).join(', ')}.` : 'A thoughtful, everyday place to begin.'; showScreen('result'); }
  document.querySelector('[data-start-camera]').addEventListener('click', startCamera);
  document.querySelector('[data-manual-start]').addEventListener('click', () => showScreen('manual'));
  document.querySelector('[data-capture-snapshot]').addEventListener('click', captureSnapshot);
  document.querySelector('[data-use-photo]').addEventListener('click', usePhoto);
  document.querySelector('[data-retake]').addEventListener('click', startCamera);
  document.querySelector('[data-retry-camera]').addEventListener('click', startCamera);
  document.querySelectorAll('[data-continue-manual]').forEach((button) => button.addEventListener('click', () => { stopCamera(); clearSnapshot(); showScreen('manual'); }));
  document.querySelectorAll('[data-back-intro]').forEach((button) => button.addEventListener('click', returnToIntro));
  document.querySelector('[data-show-routine]').addEventListener('click', showRoutine);
  document.querySelectorAll('[data-restart-flow]').forEach((button) => button.addEventListener('click', returnToIntro));
  document.querySelectorAll('[data-focus]').forEach((choice) => choice.addEventListener('click', () => { const focus = choice.dataset.focus; selections.has(focus) ? selections.delete(focus) : selections.add(focus); renderSelections(); navigator.vibrate?.(10); }));
  window.addEventListener('pagehide', () => { window.clearTimeout(analysisTimer); stopCamera(); clearSnapshot(); });
  renderSelections();
})();
