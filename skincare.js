(() => {
  const flow = document.querySelector('[data-skin-flow]');
  if (!flow) return;
  const productPackshots = { 'ext-simple-refreshing-facial-wash-150ml':'simple-refreshing-face-wash-150ml.webp', 'ext-dot-key-barrier-repair-face-wash-175ml':'dot-key-barrier-face-wash-175ml.webp', 'ext-ordinary-hyaluronic-acid-2-b5':'the-ordinary-hyaluronic-acid-2-b5-30ml.webp', 'ext-minimalist-hyaluronic-pga-2':'minimalist-hyaluronic-pga-2-30ml.webp', 'ext-minimalist-niacinamide-10-matmarine':'minimalist-niacinamide-10-30ml.webp', 'ext-plum-niacinamide-rice-water-50ml':'plum-niacinamide-rice-water-serum-50ml.webp', 'ext-ordinary-niacinamide-zinc':'the-ordinary-niacinamide-10-zinc-1-30ml.webp', 'ext-minimalist-vitamin-c-10':'minimalist-vitamin-c-10-30ml.webp', 'ext-cetaphil-moisturising-cream':'cetaphil-moisturising-cream-250g.webp', 'ext-minimalist-vitamin-b5-10-moisturizer-50g':'minimalist-vitamin-b5-10-moisturizer-50g.webp', 'ext-cetaphil-spf-50-sunscreen':'cetaphil-sun-spf50-light-gel-50ml.webp', 'ext-la-shield-fisico-spf-50-50g':'la-shield-fisico-spf50-50g.webp', 'ext-neutrogena-ultra-sheer-spf-50':'neutrogena-ultra-sheer-spf50-80g.webp', 'ext-ordinary-glycolic-acid-7':'the-ordinary-glycolic-acid-7-toner-100ml.webp' };
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
  const selections = new Set();
  let manualSkinType = '';
  let stream; let capturedFrame = ''; let analysisTimer; let manualRecommendation; let manualProfile;
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
    const longestSide = 640; const scale = Math.min(1, longestSide / Math.max(streamVideo.videoWidth, streamVideo.videoHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(streamVideo.videoWidth * scale); canvas.height = Math.round(streamVideo.videoHeight * scale);
    const context = canvas.getContext('2d'); context.translate(canvas.width, 0); context.scale(-1, 1); context.drawImage(streamVideo, 0, 0, canvas.width, canvas.height);
    capturedFrame = canvas.toDataURL('image/jpeg', 0.78); capturedPhoto.src = capturedFrame; capturedPhoto.hidden = false; stopCamera();
    cameraHeading.textContent = 'Looking good.'; cameraInstructions.textContent = 'Review your snapshot before continuing.';
    cameraStatus.textContent = 'Preview paused. This temporary image has not been uploaded.'; setActions('review');
  }
  function setAnalysisError(code) {
    const heading = document.querySelector('[data-analysis-error-heading]'); const copy = document.querySelector('[data-analysis-error-copy]');
    if (code === 'QUALITY_REJECTED') { heading.textContent = 'We need a clearer photo.'; copy.textContent = 'Use even lighting, keep your face centred, and try again for a useful preview.'; }
    else if (code === 'RATE_LIMITED') { heading.textContent = 'Please try again shortly.'; copy.textContent = 'To protect this preview, we limit how often it can be run. You can still build your routine manually.'; }
    else { heading.textContent = "We couldn't complete your skin preview."; copy.textContent = 'Your photo has been discarded. You can try again or build your routine manually.'; }
    showScreen('analysis-unavailable');
  }
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
  function recommendationCard(slot) { const match = slot.recommended; const product = match.product; const url = /^https:\/\//.test(product.officialProductUrl || '') ? product.officialProductUrl : '#'; const benefits = (product.skincare?.benefits || []).slice(0, 3); const badge = match.matchStrength === 'fallback' ? 'Closest Match' : 'Best Match'; const reason = match.matchStrength === 'fallback' ? 'A considered option from our current verified selection.' : `Chosen to support ${benefits.slice(0, 2).map((benefit) => benefit.replace(/_/g, ' ')).join(' and ')}.`; const packshot = productPackshots[product.id]; const visual = packshot ? `<img class="skin-product-packshot" src="assets/skincare/products/${packshot}" alt="">` : '<span class="skin-product-silhouette"></span>'; return `<article class="skin-recommendation-card skin-recommendation-card--${escapeHtml(slot.category)}"><div class="skin-product-placeholder" aria-hidden="true">${visual}<small>${escapeHtml(product.brand || 'Verified')}</small></div><div class="skin-recommendation-copy"><div class="skin-recommendation-meta"><span>${escapeHtml(slot.category)}</span><b class="skin-match-badge ${match.matchStrength === 'fallback' ? 'is-closest' : ''}">${badge}</b></div><p class="skin-product-brand">${escapeHtml(product.brand || '')}</p><h2>${escapeHtml(product.name)}</h2>${product.size ? `<p class="skin-product-size">${escapeHtml(product.size)}</p>` : ''}<p class="skin-recommendation-reason">${escapeHtml(reason)}</p><div class="skin-benefit-chips">${benefits.map((benefit) => `<span>${escapeHtml(benefit.replace(/_/g, ' '))}</span>`).join('')}</div><a class="skin-product-cta" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">View Product ↗<span class="sr-only"> (opens official site in a new tab)</span></a></div></article>`; }
  function renderReport(report) {
    document.querySelector('[data-report-summary]').textContent = report.summary;
    const labels = { hydrationAppearance: 'Hydration appearance', oilBalanceAppearance: 'Oil balance appearance', sensitivityAppearance: 'Sensitivity appearance', textureAppearance: 'Texture appearance', glowAppearance: 'Glow appearance', poreAppearance: 'Pore appearance' };
    const metrics = document.querySelector('[data-report-metrics]');
    metrics.innerHTML = Object.entries(report.metrics).map(([key, metric]) => `<article><span>${escapeHtml(labels[key])}</span><b>${escapeHtml(metric.label)}</b><p>${escapeHtml(metric.explanation)}</p></article>`).join('');
    const needs = document.querySelector('[data-report-needs]');
    needs.innerHTML = report.needs.map((need) => `<span>${escapeHtml(need.replace(/_/g, ' '))}</span>`).join('') || '<span>Gentle everyday care</span>';
    const recommendationSection = document.querySelector('[data-skin-recommendations]');
    const recommendationList = document.querySelector('[data-skin-recommendation-list]');
    const slots = report.recommendation?.routine?.filter((slot) => slot.recommended?.product?.commerceMode === 'external') || [];
    if (slots.length) {
      recommendationList.innerHTML = slots.map(recommendationCard).join('');
      recommendationSection.hidden = false;
    } else { recommendationSection.hidden = true; recommendationList.innerHTML = ''; }
  }
  function renderManualRecommendations(recommendation) {
    const needs = document.querySelector('[data-manual-recommendation-needs]'); const list = document.querySelector('[data-manual-recommendation-list]');
    needs.innerHTML = recommendation.needs.map((need) => `<span>${escapeHtml(need.replace(/_/g, ' '))}</span>`).join('') || '<span>Gentle everyday care</span>';
    list.innerHTML = recommendation.routine.filter((slot) => slot.recommended?.product?.commerceMode === 'external').map(recommendationCard).join('') || '<p class="skin-lede">We’re still looking for the right match for this step.</p>';
  }
  async function usePhoto() {
    if (!capturedFrame) return;
    const imageForRequest = capturedFrame; const button = document.querySelector('[data-use-photo]'); button.disabled = true;
    analysisPhoto.src = imageForRequest; analysisPhoto.hidden = false; showScreen('analyzing');
    const progress = document.querySelector('[data-analysis-progress]'); progress.style.width = '5%'; requestAnimationFrame(() => { progress.style.width = '82%'; });
    try {
      const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 22000);
      const response = await fetch('/api/skin-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: imageForRequest }), signal: controller.signal });
      window.clearTimeout(timeout); const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'ANALYSIS_FAILED');
      progress.style.width = '100%'; await new Promise((resolve) => window.setTimeout(resolve, 280));
      if (!payload.imageQuality?.usable) setAnalysisError('QUALITY_REJECTED'); else { renderReport(payload); showScreen('report'); }
    } catch (error) { setAnalysisError(error.name === 'AbortError' ? 'TIMEOUT' : error.message); }
    finally { clearSnapshot(); button.disabled = false; }
  }
  function renderSelections() { document.querySelectorAll('[data-focus]').forEach((choice) => { const active = selections.has(choice.dataset.focus); choice.classList.toggle('is-selected', active); choice.setAttribute('aria-pressed', String(active)); }); document.querySelectorAll('[data-skin-type]').forEach((choice) => { const active = choice.dataset.skinType === manualSkinType; choice.classList.toggle('is-selected', active); choice.setAttribute('aria-pressed', String(active)); }); const count = document.querySelector('[data-selection-count]'); if (count) count.textContent = `${selections.size} of 3 selected`; const next = document.querySelector('[data-continue-focus]'); if (next) next.disabled = !manualSkinType; }
  async function showRoutine() {
    const values = [...selections];
    const needMap = { Hydration: 'light_hydration', Texture: 'texture_support', Comfort: 'soothing', Glow: 'brightening_support', 'Oil Balance': 'oil_balance', 'Visible Pores': 'oil_balance', 'Uneven-looking Tone': 'brightening_support', 'Barrier Support': 'barrier_support' };
    const profile = { skinType: manualSkinType === 'not-sure' ? undefined : manualSkinType || undefined, needs: values.map((value) => needMap[value]).filter(Boolean), primaryNeeds: values.map((value) => needMap[value]).filter(Boolean), source: 'manual' }; manualProfile = profile;
    document.querySelector('[data-focus-summary]').textContent = values.length ? values.join(' · ') : 'A simple everyday ritual';
    document.querySelector('[data-routine-copy]').textContent = 'Preparing your gentle routine…'; showScreen('result');
    try {
      const response = await fetch('/api/skincare-recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile }) });
      const recommendation = await response.json();
      if (!response.ok) throw new Error('RECOMMENDATION_FAILED');
      manualRecommendation = recommendation; renderManualRecommendations(recommendation); document.querySelector('[data-routine-copy]').textContent = recommendation.productsAvailable ? 'Based on what you told us and verified skincare products currently available in India.' : 'Your routine focus is ready.';
    } catch { document.querySelector('[data-routine-copy]').textContent = 'A thoughtful, everyday place to begin.'; }
  }
  document.querySelector('[data-start-camera]').addEventListener('click', startCamera);
  document.querySelector('[data-manual-start]').addEventListener('click', () => showScreen('manual-type'));
  document.querySelector('[data-capture-snapshot]').addEventListener('click', captureSnapshot);
  document.querySelector('[data-use-photo]').addEventListener('click', usePhoto);
  document.querySelector('[data-retry-analysis]').addEventListener('click', startCamera);
  document.querySelector('[data-retake]').addEventListener('click', startCamera);
  document.querySelector('[data-retry-camera]').addEventListener('click', startCamera);
  document.querySelectorAll('[data-continue-manual]').forEach((button) => button.addEventListener('click', () => { stopCamera(); clearSnapshot(); showScreen('manual-type'); }));
  document.querySelector('[data-continue-focus]').addEventListener('click', () => showScreen('manual-focus'));
  document.querySelector('[data-back-type]').addEventListener('click', () => showScreen('manual-type'));
  document.querySelector('[data-open-recommendations]').addEventListener('click', () => { if (manualRecommendation) showScreen('recommendations'); });
  document.querySelector('[data-back-result]').addEventListener('click', () => showScreen('result'));
  document.querySelectorAll('[data-adjust-answers]').forEach((button) => button.addEventListener('click', () => showScreen('manual-focus')));
  document.querySelectorAll('[data-back-intro]').forEach((button) => button.addEventListener('click', returnToIntro));
  document.querySelector('[data-show-routine]').addEventListener('click', showRoutine);
  document.querySelectorAll('[data-restart-flow]').forEach((button) => button.addEventListener('click', () => { selections.clear(); manualSkinType = ''; manualProfile = undefined; manualRecommendation = undefined; renderSelections(); returnToIntro(); }));
  document.querySelectorAll('[data-focus]').forEach((choice) => choice.addEventListener('click', () => { const focus = choice.dataset.focus; if (selections.has(focus)) selections.delete(focus); else if (selections.size < 3) selections.add(focus); renderSelections(); navigator.vibrate?.(10); }));
  document.querySelectorAll('[data-skin-type]').forEach((choice) => choice.addEventListener('click', () => { manualSkinType = manualSkinType === choice.dataset.skinType ? '' : choice.dataset.skinType; renderSelections(); }));
  window.addEventListener('pagehide', () => { window.clearTimeout(analysisTimer); stopCamera(); clearSnapshot(); });
  renderSelections();
})();
