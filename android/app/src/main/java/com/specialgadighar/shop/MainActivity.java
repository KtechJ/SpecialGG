package com.specialgadighar.shop;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Opens the Special Gadi Ghar web app (GitHub Pages) full screen, and adds what a plain WebView lacks:
 * Android share sheet for pictures / PDF / Excel, saving to Downloads, WhatsApp / phone / Drive links,
 * confirm() dialogs and the back button.
 */
public class MainActivity extends Activity {

    private WebView web;
    private String appUrl;
    private Uri appUri;
    private String bridgeJs = "";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        appUrl = getString(R.string.app_url);
        appUri = Uri.parse(appUrl);
        bridgeJs = readAsset("bridge.js");

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#1f4e79"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#f4f1ea"));
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Android 15+ draws behind the status/navigation bars and the keyboard: keep the page clear of them.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets b = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(b.left, b.top, b.right, b.bottom);
                return WindowInsets.CONSUMED;
            });
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // login token and settings are kept in localStorage
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);    // target="_blank" links come to shouldOverrideUrlLoading
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " SpecialGadiGharApp/1.0");

        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        web.setWebChromeClient(new WebChromeClient());   // shows confirm() / alert() dialogs
        web.setWebViewClient(new Client());
        web.setDownloadListener((url, ua, cd, mime, len) -> openExternal(Uri.parse(url)));

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(appUrl);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

    @Override
    protected void onPause() { web.onPause(); super.onPause(); }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /** Back: close an open window in the app, else go to Home, else leave the app. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        String js = "(function(){try{var m=document.getElementById('modal');"
                + "if(m&&!m.classList.contains('hidden')){closeModal();return 'm';}"
                + "if(typeof screen==='string'&&screen!=='home'&&localStorage.getItem('sgg_token')){go('home');return 'h';}"
                + "}catch(e){}return 'x';})()";
        web.evaluateJavascript(js, r -> {
            if (r == null || r.contains("x")) moveTaskToBack(true);
        });
    }

    private boolean isAppPage(Uri u) {
        return "https".equals(u.getScheme()) && appUri.getHost().equalsIgnoreCase(u.getHost())
                && u.getPath() != null && u.getPath().startsWith(appUri.getPath());
    }

    private void openExternal(Uri u) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, u);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            toast("No app found to open this / खोलने के लिए ऐप नहीं मिला");
        }
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            String scheme = u.getScheme() == null ? "" : u.getScheme();
            if (isAppPage(u)) return false;                 // stay inside the app
            if (scheme.equals("blob") || scheme.equals("data") || scheme.equals("javascript")) return true; // bridge.js handles these
            openExternal(u);                                // WhatsApp (wa.me), phone (tel:), Google Drive, etc.
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            view.evaluateJavascript(bridgeJs, null);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
            if (!req.isForMainFrame()) return;
            String html = "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
                    + "<body style='font-family:sans-serif;background:#f4f1ea;padding:24px;color:#222'>"
                    + "<h2 style='color:#1f4e79'>No internet · इंटरनेट नहीं है</h2>"
                    + "<p>Special Gadi Ghar needs internet (mobile data is fine). Check the connection and try again.</p>"
                    + "<button onclick='AndroidApp.reload()' style='font-size:18px;padding:12px 20px;background:#1f4e79;color:#fff;border:0;border-radius:10px'>"
                    + "Try again · फिर से</button></body></html>";
            view.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
        }
    }

    /** Called from bridge.js (runs on a background thread). */
    private class Bridge {
        @JavascriptInterface
        public void share(String name, String mime, String b64, String text) {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    if (b64 != null && !b64.isEmpty()) {
                        Uri uri = cacheFile(name, b64);
                        i.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                        i.putExtra(Intent.EXTRA_STREAM, uri);
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    } else {
                        i.setType("text/plain");
                    }
                    if (text != null && !text.isEmpty()) i.putExtra(Intent.EXTRA_TEXT, text);
                    startActivity(Intent.createChooser(i, "Share · शेयर"));
                } catch (Exception e) {
                    toast("Could not share / शेयर नहीं हुआ");
                }
            });
        }

        @JavascriptInterface
        public void save(String name, String mime, String b64) {
            try {
                byte[] data = Base64.decode(b64, Base64.DEFAULT);
                String file = safeName(name);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, file);
                    v.put(MediaStore.Downloads.MIME_TYPE, mime);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) throw new IllegalStateException("no uri");
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) { os.write(data); }
                    toast("Saved in Downloads: " + file + " · डाउनलोड में सेव");
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if (dir != null && !dir.exists()) dir.mkdirs();
                    File f = new File(dir, file);
                    try (FileOutputStream os = new FileOutputStream(f)) { os.write(data); }
                    Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", f);
                    toast("Saved: " + file);
                    viewFile(uri, mime);
                }
            } catch (Exception e) {
                toast("Could not save / सेव नहीं हुआ");
            }
        }

        @JavascriptInterface
        public void open(String name, String mime, String b64) {
            try {
                viewFile(cacheFile(name, b64), mime);
            } catch (Exception e) {
                toast("Could not open / नहीं खुला");
            }
        }

        @JavascriptInterface
        public void toast(String msg) { MainActivity.this.toast(msg); }

        @JavascriptInterface
        public void reload() { runOnUiThread(() -> web.loadUrl(appUrl)); }
    }

    private Uri cacheFile(String name, String b64) throws Exception {
        File dir = new File(getCacheDir(), "shared");
        if (!dir.exists()) dir.mkdirs();
        File f = new File(dir, safeName(name));
        try (FileOutputStream os = new FileOutputStream(f)) { os.write(Base64.decode(b64, Base64.DEFAULT)); }
        return FileProvider.getUriForFile(this, getPackageName() + ".files", f);
    }

    private void viewFile(Uri uri, String mime) {
        runOnUiThread(() -> {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(uri, mime);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (ActivityNotFoundException e) {
                toast("No app found to open this file. Use Share instead.");
            }
        });
    }

    private static String safeName(String n) {
        String s = (n == null || n.trim().isEmpty()) ? "file" : n.trim();
        s = s.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        return s.length() > 120 ? s.substring(s.length() - 120) : s;
    }

    private void toast(String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_LONG).show());
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }
}
