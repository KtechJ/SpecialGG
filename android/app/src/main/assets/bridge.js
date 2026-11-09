// Injected by the Android app after each page load. Gives the web app what a plain WebView lacks:
// sharing files (bill/receipt pictures, PDF/Excel) to WhatsApp, saving downloads, and opening files.
(function () {
  if (window.__sggBridge || !window.AndroidApp) return;
  window.__sggBridge = true;
  var A = window.AndroidApp;

  function toB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  // Web Share API -> Android share sheet
  navigator.canShare = function () { return true; };
  navigator.share = async function (d) {
    d = d || {};
    var f = (d.files || [])[0];
    var text = [d.text || '', d.url || ''].filter(Boolean).join('\n');
    if (f) A.share(f.name || 'file', f.type || 'application/octet-stream', await toB64(f), text);
    else A.share('', '', '', text || d.title || '');
  };

  // Copying an image to the clipboard does not work for WhatsApp on Android: share the picture instead.
  if (typeof window.sharePicture === 'function') window.copyPicture = function () { return window.sharePicture(); };

  // Links to in-page files (data: / blob:) -> save to Downloads, or open with another app
  document.addEventListener('click', async function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!/^(blob:|data:)/.test(href)) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      var blob = await (await fetch(href)).blob();
      var name = a.getAttribute('download');
      if (!name) {
        try { name = (typeof rpFile !== 'undefined' && rpFile && rpFile.name) || ''; } catch (x) { name = ''; }
      }
      if (!name) name = blob.type === 'application/pdf' ? 'file.pdf' : 'file';
      var b64 = await toB64(blob);
      var mime = blob.type || 'application/octet-stream';
      if (a.hasAttribute('download')) A.save(name, mime, b64);
      else A.open(name, mime, b64);
    } catch (err) {
      A.toast('Could not open the file / फ़ाइल नहीं खुली');
    }
  }, true);
})();
