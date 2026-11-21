package com.xiaozhangben.app;

import android.app.Notification;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 安卓原生付款通知监听服务：
 * 仅在用户主动开启开关并授予通知读取权限后，捕获微信/支付宝/云闪付的收付款通知，写入本地待确认队列。
 */
public class PayNotificationService extends NotificationListenerService {
    public static final String PREF_NAME = "xzb_pay_capture";
    public static final String KEY_ENABLED = "enabled";
    public static final String KEY_QUEUE = "queue";

    private static final Pattern PAY_TRIGGER = Pattern.compile("支付|付款|消费|扣款|收款|到账|收钱|转出|支出");
    private static final Pattern INCOME_TRIGGER = Pattern.compile("收款|到账|收钱|转入");
    private static final Pattern AMOUNT_YUAN = Pattern.compile("(?:[¥￥]|RMB\\s*)?(\\d+(?:\\.\\d{1,2})?)\\s*元");
    private static final Pattern AMOUNT_SIGN = Pattern.compile("(?:[¥￥]|RMB\\s*)(\\d+(?:\\.\\d{1,2})?)");
    private static final Pattern MERCHANT_PAT = Pattern.compile("(?:向|在)([^付扣消\\s，,。：:]{1,20})(?:付款|支付|消费)");

    private String lastDedupKey = "";
    private long lastDedupTs = 0L;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_ENABLED, false)) return;

        String pkg = sbn.getPackageName();
        String source = null;
        if ("com.tencent.mm".equals(pkg)) source = "微信";
        else if ("com.eg.android.AlipayGphone".equals(pkg)) source = "支付宝";
        else if ("com.unionpay".equals(pkg)) source = "云闪付";
        if (source == null) return;

        Notification n = sbn.getNotification();
        if (n == null || n.extras == null) return;
        Bundle extras = n.extras;
        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        String title = titleCs == null ? "" : titleCs.toString().trim();
        String text = textCs == null ? "" : textCs.toString().trim();
        String full = (title + " " + text).trim();
        if (full.isEmpty() || !PAY_TRIGGER.matcher(full).find()) return;

        double yuan = extractAmount(full);
        if (yuan <= 0 || yuan > 9999999) return;
        long cents = Math.round(yuan * 100.0);
        String type = INCOME_TRIGGER.matcher(full).find() ? "income" : "expense";

        long now = System.currentTimeMillis();
        String dedupKey = source + "|" + type + "|" + cents;
        if (dedupKey.equals(lastDedupKey) && (now - lastDedupTs) < 10000L) return;
        lastDedupKey = dedupKey;
        lastDedupTs = now;

        String merchant = "";
        Matcher mm = MERCHANT_PAT.matcher(full);
        if (mm.find()) merchant = mm.group(1).trim();

        synchronized (PayNotificationService.class) {
            try {
                JSONArray arr = new JSONArray(prefs.getString(KEY_QUEUE, "[]"));
                JSONObject item = new JSONObject();
                item.put("source", source);
                item.put("type", type);
                item.put("amount", cents);
                item.put("merchant", merchant);
                item.put("rawText", full.length() > 120 ? full.substring(0, 120) : full);
                item.put("ts", now);
                arr.put(item);
                while (arr.length() > 50) arr.remove(0);
                prefs.edit().putString(KEY_QUEUE, arr.toString()).apply();
            } catch (Exception ignored) {
            }
        }
    }

    private double extractAmount(String s) {
        Matcher m1 = AMOUNT_YUAN.matcher(s);
        if (m1.find()) {
            try { return Double.parseDouble(m1.group(1)); } catch (Exception ignored) {}
        }
        Matcher m2 = AMOUNT_SIGN.matcher(s);
        if (m2.find()) {
            try { return Double.parseDouble(m2.group(1)); } catch (Exception ignored) {}
        }
        return -1;
    }
}
