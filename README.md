<div align="center">

# TalkType

**TalkType · AI 语音转录助手**
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
[中文](README.md) | [English](README_EN.md)
</div>

<br/>

> TalkType 是一款基于 Electron 开发的跨平台应用，支持 Windows、macOS 和 Linux 系统。将ASR与LLM结合，不仅能“听写”，更能“理解”、“润色”、“提问”，从而高效产出高质量文本。

---

## ✨ 核心特性

- **跨平台支持**: 基于 Electron 框架构建，适配 Windows、macOS 和 Linux 系统。
- **配置简单**: **只需填入 ASR API 和 AI API 即可使用**。支持兼容 OpenAI 接口的服务商（默认阿里云 DashScope）。
- **开发者友好**: 提供完整的开发者模式，易于扩展和二次开发。
- **隐私安全**: 配置以及历史记录数据存储在本地，API 直接与服务商通信。

## 🎬 功能演示

### ✨ 润色模式
**开启 AI 润色**，**长按 Right Alt** 说话，松开即可优化表达，让文字更流畅。

<div align="center">
    <img src="figures/zhuanlu.gif" alt="润色模式" width="400" />
</div>

### ⌨️ 指令模式
**选中文字**，**长按 Right Alt** 说出指令，松开即可精准调整文本内容，满足个性化需求。

<div align="center">
    <img src="figures/zhiling.gif" alt="指令模式" width="400" />
</div>

### 💡 提问模式
**长按 Right Ctrl** 说出问题，松开即可得到 AI 回答。

<div align="center">
    <img src="figures/tiwen.gif" alt="提问模式" width="400" />
</div>

### 📸 界面展示

<div align="center">
    <table>
        <tr>
            <td align="center" colspan="2">
                <p><b>主界面</b></p>
                <img src="figures/shouye.png" width="100%" />
            </td>
        </tr>
        <tr>
            <td align="center" width="50%">
                <p><b>数据统计</b></p>
                <img src="figures/tongji.png" width="100%" />
            </td>
            <td align="center" width="50%">
                <p><b>历史记录</b></p>
                <img src="figures/lishi.png" width="100%" />
            </td>
        </tr>
        <tr>
            <td align="center" width="50%">
                <p><b>设置页面 - 模型配置</b></p>
                <img src="figures/shezhi1.png" width="100%" />
            </td>
            <td align="center" width="50%">
                <p><b>设置页面 - 自定义prompt</b></p>
                <img src="figures/shezhi2.png" width="100%" />
            </td>
        </tr>
    </table>
</div>

## 📥 下载安装

TalkType 提供 Windows、macOS 和 Linux 三大平台的安装包。

- **Windows**: [点击下载 TalkType v1.0.0](https://github.com/zyk42/TalkType/releases/download/v1.0.0/TalkType.Setup.1.0.1.exe)
- **macOS**: *(待发布)*
- **Linux**: *(待发布)*

## 🛠️ 开发者模式

如果您是开发者，或者希望体验最新功能，可以通过源码运行：

### 1. 环境准备
- Node.js 18+
- pnpm (推荐) 或 npm

### 2. 获取源码
```bash
git clone https://github.com/zyk/TalkType.git
cd TalkType
```

### 3. 安装依赖
```bash
pnpm install
```

### 4. 启动开发模式
```bash
pnpm run dev
```
此命令将同时启动 Electron 主进程和 Vite 渲染进程，支持热重载。

### 5. 构建打包
```bash

# 构建特定平台应用

#如果遇到app-builder不走代理问题
#windows先运行以下命令（7890为你的vpn端口）
#$env:HTTP_PROXY="http://127.0.0.1:7890"
#$env:HTTPS_PROXY="http://127.0.0.1:7890"

#mac/linux先运行以下命令
#export HTTP_PROXY="http://127.0.0.1:7890"
#export HTTPS_PROXY="http://127.0.0.1:7890"

pnpm run build:win   # Windows  
pnpm run build:mac   # macOS
pnpm run build:linux # Linux
```

## ⚙️ 快速配置

启动应用后，进入 **设置页面** 即可快速配置：

1.  **ASR 配置 (语音识别)**:
    -   填入您的 ASR API Key。
    -   默认支持阿里云 DashScope (Qwen-ASR)，也可配置其他兼容 OpenAI 格式的 ASR 服务。
2.  **AI 配置 (大模型)**:
    -   填入您的 AI API Key。
    -   配置 Base URL 和 模型名称 (如 `qwen-flash`)。

> **提示**: 配置信息将加密存储在您的本地设备中，不会上传至任何第三方服务器。
