package com.turfmatch.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Native APK over-the-air updater plugin.
 *
 * Flow:
 *   1. JS calls {@code download({url, sha256, sizeBytes, version})}
 *      - APK is written to {cacheDir}/updates/update.apk
 *      - Supports HTTP Range resume across app restarts
 *      - Emits "progress" events with loaded/total/percent
 *      - Verifies SHA-256 before reporting success
 *   2. JS calls {@code install({path})}
 *      - Launches Android system installer via FileProvider URI
 *      - Requires REQUEST_INSTALL_PACKAGES + per-app "install unknown apps" toggle
 *
 * Safety:
 *   - The on-disk file is the only state. We re-hash on resume to keep integrity.
 *   - cancel() aborts the running download cleanly.
 *   - getCurrentVersion() returns VERSION_NAME + VERSION_CODE for client semver compare.
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {
    private static final String TAG = "ApkUpdater";
    private static final String UPDATES_DIR = "updates";
    private static final String APK_NAME = "update.apk";

    private final AtomicBoolean cancelFlag = new AtomicBoolean(false);
    private final AtomicReference<Thread> downloadThread = new AtomicReference<>(null);

    @PluginMethod
    public void getCurrentVersion(PluginCall call) {
        Context ctx = getContext();
        JSObject result = new JSObject();
        try {
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            result.put("versionName", pi.versionName != null ? pi.versionName : "");
            long code;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                code = pi.getLongVersionCode();
            } else {
                //noinspection deprecation
                code = pi.versionCode;
            }
            result.put("versionCode", code);
            result.put("packageName", ctx.getPackageName());
            result.put("sdk", Build.VERSION.SDK_INT);
            result.put("signingSha256", getSigningSha256(ctx));
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Failed to read package info: " + e.getMessage());
            return;
        }
        call.resolve(result);
    }

    @PluginMethod
    public void canRequestInstallPackages(PluginCall call) {
        Context ctx = getContext();
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            result.put("allowed", ctx.getPackageManager().canRequestPackageInstalls());
        } else {
            // Below Android 8, system relied on the global "Unknown sources" toggle.
            result.put("allowed", true);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + ctx.getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Exception e) {
                call.reject("Cannot open install-sources settings: " + e.getMessage());
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void getFreeSpace(PluginCall call) {
        try {
            File cache = getContext().getCacheDir();
            StatFs stat = new StatFs(cache.getAbsolutePath());
            long bytes = stat.getAvailableBytes();
            JSObject r = new JSObject();
            r.put("bytesAvailable", bytes);
            r.put("cachePath", cache.getAbsolutePath());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Failed: " + e.getMessage());
        }
    }

    /** Inspect on-disk APK state without downloading. Useful after app restarts. */
    @PluginMethod
    public void getCachedApkInfo(PluginCall call) {
        File apk = getApkFile();
        JSObject r = new JSObject();
        r.put("exists", apk.exists());
        r.put("path", apk.getAbsolutePath());
        r.put("size", apk.exists() ? apk.length() : 0);
        call.resolve(r);
    }

    @PluginMethod
    public void deleteCachedApk(PluginCall call) {
        File apk = getApkFile();
        boolean ok = !apk.exists() || apk.delete();
        JSObject r = new JSObject();
        r.put("deleted", ok);
        call.resolve(r);
    }

    /**
     * Download the APK with Range-based resume + SHA-256 verification.
     * Required: {@code url}, {@code sha256} (lowercase hex), {@code sizeBytes}.
     * Optional: {@code version} (string, for logging).
     */
    @PluginMethod
    public void download(PluginCall call) {
        final String url = call.getString("url");
        final String expectedSha = call.getString("sha256");
        
        Long tempSize = call.getLong("sizeBytes");
        if (tempSize == null) {
            Integer intSize = call.getInt("sizeBytes");
            if (intSize != null) {
                tempSize = intSize.longValue();
            }
        }
        final Long expectedSize = tempSize;
        
        final String version = call.getString("version", "");

        if (url == null || url.isEmpty()) { call.reject("Missing url"); return; }
        if (expectedSha == null || expectedSha.length() != 64) { call.reject("Missing/invalid sha256"); return; }
        if (expectedSize == null || expectedSize <= 0) { call.reject("Missing/invalid sizeBytes"); return; }

        cancelFlag.set(false);

        // Save the call so we can resolve asynchronously
        call.setKeepAlive(true);
        bridge.saveCall(call);
        final String callId = call.getCallbackId();

        Thread t = new Thread(() -> {
            try {
                File apk = getApkFile();
                ensureDir(apk.getParentFile());

                // If a partial or complete file is already there, resume from its length.
                long startByte = apk.exists() ? apk.length() : 0L;

                // If on-disk is already the full size, verify hash and short-circuit.
                if (startByte >= expectedSize) {
                    String onDiskSha = sha256OfFile(apk);
                    if (expectedSha.equalsIgnoreCase(onDiskSha)) {
                        emitProgress(expectedSize, expectedSize, 100.0, 0);
                        resolveCall(callId, successJson(apk, expectedSize));
                        return;
                    } else {
                        // Stale file; reset.
                        //noinspection ResultOfMethodCallIgnored
                        apk.delete();
                        startByte = 0L;
                    }
                }

                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(20_000);
                conn.setReadTimeout(30_000);
                conn.setRequestProperty("Accept-Encoding", "identity");
                conn.setRequestProperty("User-Agent", "TurfMatch-OTA/1");
                if (startByte > 0) {
                    conn.setRequestProperty("Range", "bytes=" + startByte + "-");
                }

                int code = conn.getResponseCode();
                if (code != HttpURLConnection.HTTP_OK && code != HttpURLConnection.HTTP_PARTIAL) {
                    rejectCall(callId, "HTTP " + code + " from CDN");
                    return;
                }
                // If server ignored Range and returned full, restart from zero.
                if (startByte > 0 && code == HttpURLConnection.HTTP_OK) {
                    startByte = 0L;
                    //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                }

                long totalBytes = expectedSize;
                long contentLen = conn.getContentLengthLong();
                if (contentLen > 0) {
                    totalBytes = startByte + contentLen;
                }

                long startMs = System.currentTimeMillis();
                long lastEmit = 0L;

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apk, startByte > 0)) {
                    byte[] buf = new byte[64 * 1024];
                    long downloaded = startByte;
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        if (cancelFlag.get()) {
                            rejectCall(callId, "Cancelled");
                            return;
                        }
                        out.write(buf, 0, n);
                        downloaded += n;

                        long now = System.currentTimeMillis();
                        if (now - lastEmit > 250 || downloaded == totalBytes) {
                            lastEmit = now;
                            double pct = totalBytes > 0 ? (downloaded * 100.0 / totalBytes) : 0.0;
                            long elapsedMs = Math.max(1, now - startMs);
                            double bps = (downloaded - startByte) / (elapsedMs / 1000.0);
                            emitProgress(downloaded, totalBytes, pct, bps);
                        }
                    }
                    out.flush();
                }

                // Verify SHA-256
                String got = sha256OfFile(apk);
                if (!expectedSha.equalsIgnoreCase(got)) {
                    //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                    rejectCall(callId, "Checksum mismatch (downloaded=" + got + " expected=" + expectedSha + ")");
                    return;
                }

                emitProgress(totalBytes, totalBytes, 100.0, 0);
                resolveCall(callId, successJson(apk, totalBytes));
            } catch (Exception e) {
                Log.e(TAG, "Download error", e);
                rejectCall(callId, e.getMessage() != null ? e.getMessage() : e.toString());
            } finally {
                downloadThread.set(null);
            }
        }, "ApkUpdater-Download");

        downloadThread.set(t);
        t.start();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        cancelFlag.set(true);
        Thread t = downloadThread.get();
        if (t != null) t.interrupt();
        call.resolve();
    }

    /**
     * Trigger the system installer. The user still has to tap Install.
     * Requires {@code REQUEST_INSTALL_PACKAGES} permission + the per-app
     * "install unknown apps" toggle on Android 8+.
     */
    @PluginMethod
    public void install(PluginCall call) {
        Context ctx = getContext();
        String pathArg = call.getString("path");
        File apk = pathArg != null ? new File(pathArg) : getApkFile();

        if (!apk.exists()) { call.reject("APK file not found: " + apk.getAbsolutePath()); return; }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !ctx.getPackageManager().canRequestPackageInstalls()) {
            call.reject("INSTALL_PACKAGES_NOT_ALLOWED");
            return;
        }

        try {
            Uri uri = FileProvider.getUriForFile(ctx,
                    ctx.getPackageName() + ".fileprovider", apk);

            Intent intent = new Intent(Intent.ACTION_INSTALL_PACKAGE);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
            intent.putExtra(Intent.EXTRA_RETURN_RESULT, false);
            intent.putExtra(Intent.EXTRA_INSTALLER_PACKAGE_NAME, ctx.getPackageName());
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "install failed", e);
            call.reject("Install intent failed: " + e.getMessage());
        }
    }

    /** Verify network is up (used by JS layer before download to avoid noisy errors). */
    @PluginMethod
    public void getNetworkState(PluginCall call) {
        Context ctx = getContext();
        ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
        JSObject r = new JSObject();
        if (cm == null) {
            r.put("connected", false);
            r.put("type", "unknown");
            call.resolve(r);
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
            boolean connected = nc != null && nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
            String type = "unknown";
            if (nc != null) {
                if (nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) type = "wifi";
                else if (nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) type = "cellular";
                else if (nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) type = "ethernet";
            }
            r.put("connected", connected);
            r.put("type", type);
        } else {
            //noinspection deprecation
            android.net.NetworkInfo info = cm.getActiveNetworkInfo();
            r.put("connected", info != null && info.isConnected());
            r.put("type", info != null ? info.getTypeName() : "unknown");
        }
        call.resolve(r);
    }

    // ---------------- Helpers ----------------

    private File getApkFile() {
        File dir = new File(getContext().getCacheDir(), UPDATES_DIR);
        return new File(dir, APK_NAME);
    }

    private void ensureDir(File dir) throws IOException {
        if (dir == null) return;
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("Cannot create dir: " + dir.getAbsolutePath());
        }
    }

    private void emitProgress(long downloaded, long total, double percent, double bytesPerSecond) {
        JSObject d = new JSObject();
        d.put("downloaded", downloaded);
        d.put("total", total);
        d.put("percent", percent);
        d.put("bytesPerSecond", bytesPerSecond);
        notifyListeners("progress", d);
    }

    private JSObject successJson(File apk, long size) {
        JSObject r = new JSObject();
        r.put("path", apk.getAbsolutePath());
        r.put("sizeBytes", size);
        return r;
    }

    private void resolveCall(String id, JSObject data) {
        PluginCall c = bridge.getSavedCall(id);
        if (c == null) return;
        c.resolve(data);
        bridge.releaseCall(c);
    }

    private void rejectCall(String id, String msg) {
        PluginCall c = bridge.getSavedCall(id);
        if (c == null) return;
        c.reject(msg);
        bridge.releaseCall(c);
    }

    private static String sha256OfFile(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (FileInputStream in = new FileInputStream(f)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) md.update(buf, 0, n);
        }
        byte[] digest = md.digest();
        StringBuilder sb = new StringBuilder(64);
        for (byte b : digest) sb.append(String.format(Locale.US, "%02x", b));
        return sb.toString();
    }

    private static String getSigningSha256(Context ctx) {
        try {
            PackageInfo info;
            Signature[] sigs;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
                sigs = info.signingInfo != null ? info.signingInfo.getApkContentsSigners() : null;
            } else {
                //noinspection deprecation
                info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), PackageManager.GET_SIGNATURES);
                //noinspection deprecation
                sigs = info.signatures;
            }
            if (sigs == null || sigs.length == 0) return "";
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(sigs[0].toByteArray());
            StringBuilder sb = new StringBuilder(64);
            for (byte b : digest) sb.append(String.format(Locale.US, "%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
