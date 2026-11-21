package com.xiaozhangben.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

/**
 * Capacitor 插件：供前端安全控制付款通知捕账开关、跳转系统通知权限页及读取捕获队列。
 */
@CapacitorPlugin(name = "PayCapture")
public class PayCapturePlugin extends Plugin {
    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PayNotificationService.PREF_NAME, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        SharedPreferences p = prefs();
        boolean enabled = p.getBoolean(PayNotificationService.KEY_ENABLED, false);
        String flat = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        boolean hasPerm = flat != null && flat.contains(getContext().getPackageName());
        int count = 0;
        try {
            count = new JSONArray(p.getString(PayNotificationService.KEY_QUEUE, "[]")).length();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        ret.put("hasPermission", hasPerm);
        ret.put("queueCount", count);
        call.resolve(ret);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        prefs().edit().putBoolean(PayNotificationService.KEY_ENABLED, on).apply();
        JSObject ret = new JSObject();
        ret.put("enabled", on);
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("无法打开通知权限设置页：" + e.getMessage());
        }
    }

    @PluginMethod
    public void drainQueue(PluginCall call) {
        JSArray out = new JSArray();
        synchronized (PayNotificationService.class) {
            SharedPreferences p = prefs();
            String raw = p.getString(PayNotificationService.KEY_QUEUE, "[]");
            p.edit().putString(PayNotificationService.KEY_QUEUE, "[]").apply();
            try {
                JSONArray arr = new JSONArray(raw);
                for (int i = 0; i < arr.length(); i++) {
                    out.put(arr.get(i));
                }
            } catch (Exception ignored) {}
        }
        JSObject ret = new JSObject();
        ret.put("items", out);
        call.resolve(ret);
    }
}
