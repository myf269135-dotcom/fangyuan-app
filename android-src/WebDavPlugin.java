package com.xiaozhangben.app;

import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * 安卓原生 WebDAV 插件（基于 OkHttp3）：
 * 解决安卓系统自带 HttpURLConnection 不支持 PROPFIND / MKCOL 等 WebDAV 扩展方法的问题，
 * 让坚果云自动同步与按月原图上传/恢复稳定直连。
 */
@CapacitorPlugin(name = "WebDav")
public class WebDavPlugin extends Plugin {
    private static final OkHttpClient CLIENT = new OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .writeTimeout(45, TimeUnit.SECONDS)
            .followRedirects(true)
            .build();

    @PluginMethod
    public void request(PluginCall call) {
        final String method = (call.getString("method", "GET")).toUpperCase();
        final String url = call.getString("url", "");
        final JSObject headersObj = call.getObject("headers", new JSObject());
        final String bodyStr = call.getString("body", null);
        final String bodyBase64 = call.getString("bodyBase64", null);
        final boolean expectBin = Boolean.TRUE.equals(call.getBoolean("expectBin", false));

        if (url == null || url.isEmpty()) {
            call.reject("缺少请求地址");
            return;
        }

        new Thread(() -> {
            try {
                Request.Builder rb = new Request.Builder().url(url);
                String contentType = null;
                if (headersObj != null) {
                    Iterator<String> keys = headersObj.keys();
                    while (keys.hasNext()) {
                        String k = keys.next();
                        String v = headersObj.getString(k);
                        if (v != null) {
                            rb.header(k, v);
                            if ("content-type".equalsIgnoreCase(k)) contentType = v;
                        }
                    }
                }

                RequestBody reqBody = null;
                if (bodyBase64 != null && !bodyBase64.isEmpty()) {
                    byte[] raw = Base64.decode(bodyBase64, Base64.DEFAULT);
                    MediaType mt = MediaType.parse(contentType != null ? contentType : "application/octet-stream");
                    reqBody = RequestBody.create(raw, mt);
                } else if (bodyStr != null) {
                    MediaType mt = MediaType.parse(contentType != null ? contentType : "text/plain; charset=utf-8");
                    reqBody = RequestBody.create(bodyStr.getBytes(StandardCharsets.UTF_8), mt);
                } else if ("PUT".equals(method) || "POST".equals(method) || "PATCH".equals(method)) {
                    MediaType mt = contentType != null ? MediaType.parse(contentType) : null;
                    reqBody = RequestBody.create(new byte[0], mt);
                }

                rb.method(method, reqBody);

                try (Response resp = CLIENT.newCall(rb.build()).execute()) {
                    int code = resp.code();
                    ResponseBody rBody = resp.body();
                    JSObject out = new JSObject();
                    out.put("status", code);
                    out.put("ok", resp.isSuccessful());
                    if (expectBin) {
                        byte[] bytes = rBody != null ? rBody.bytes() : new byte[0];
                        out.put("bodyBase64", Base64.encodeToString(bytes, Base64.NO_WRAP));
                    } else {
                        out.put("text", rBody != null ? rBody.string() : "");
                    }
                    call.resolve(out);
                }
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : e.toString());
            }
        }).start();
    }
}
