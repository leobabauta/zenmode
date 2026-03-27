(async function() {
  try {
    const { check } = window.__TAURI__.updater;
    const { relaunch } = window.__TAURI__.process;

    const update = await check();
    if (!update) return; // No update available

    // Create the update banner
    var banner = document.createElement('div');
    banner.id = 'zenmode-update-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 16px;background:#1c1917;color:#fff;font-family:Inter,-apple-system,sans-serif;font-size:13px;font-weight:500;transition:transform 0.3s ease;transform:translateY(-100%);';

    var msg = document.createElement('span');
    msg.textContent = 'A new version of zenmode is available (' + update.version + ')';

    var btn = document.createElement('button');
    btn.textContent = 'Update & Restart';
    btn.style.cssText = 'background:#fff;color:#1c1917;border:none;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;';

    var dismiss = document.createElement('button');
    dismiss.textContent = '\u00d7';
    dismiss.style.cssText = 'background:none;border:none;color:#a8a29e;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;';

    var progress = document.createElement('span');
    progress.style.cssText = 'font-size:12px;color:#a8a29e;display:none;';

    btn.onclick = async function() {
      btn.disabled = true;
      btn.textContent = 'Downloading...';
      btn.style.opacity = '0.6';
      progress.style.display = 'inline';

      try {
        var downloaded = 0;
        var total = 0;
        await update.downloadAndInstall(function(event) {
          if (event.event === 'Started' && event.data && event.data.contentLength) {
            total = event.data.contentLength;
          } else if (event.event === 'Progress' && event.data) {
            downloaded += event.data.chunkLength || 0;
            if (total > 0) {
              var pct = Math.round((downloaded / total) * 100);
              progress.textContent = pct + '%';
            }
          } else if (event.event === 'Finished') {
            progress.textContent = 'Restarting...';
          }
        });
        await relaunch();
      } catch (err) {
        btn.textContent = 'Update failed';
        btn.style.opacity = '1';
        progress.textContent = err.message || 'Error';
        console.error('Update error:', err);
      }
    };

    dismiss.onclick = function() {
      banner.style.transform = 'translateY(-100%)';
      setTimeout(function() { banner.remove(); }, 300);
    };

    banner.appendChild(msg);
    banner.appendChild(progress);
    banner.appendChild(btn);
    banner.appendChild(dismiss);
    document.body.appendChild(banner);

    // Slide in
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        banner.style.transform = 'translateY(0)';
      });
    });
  } catch (e) {
    // Silently fail — updater may not be available in dev
    console.log('Update check skipped:', e.message);
  }
})();
