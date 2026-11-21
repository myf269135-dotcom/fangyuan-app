package com.xiaozhangben.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * 主 Activity：启动时注册付款通知自动捕账插件。
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PayCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
