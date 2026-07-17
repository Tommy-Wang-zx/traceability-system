// ===================== 配置 =====================
const API_BASE = 'https://hajimio-d6g6tsg1e608005d5.service.tcloudbase.com';
const CORP_ID = 'wwde4aa70609aa1f0e';
const AGENT_ID = '1000002';
const REDIRECT_URI = encodeURIComponent('https://hajimio-d6g6tsg1e608005d5-1448886989.tcloudbaseapp.com/index.html');


// ========================================
// 工具函数（放在最前面）
// ========================================
function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) { alert(msg); return; }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== 缓存 =====
function saveCache(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { } }

function loadCache(key) { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch (e) { return null; } }

// =========== 二维码标签生成 ===========
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
if (isIOS() && !window.navigator.standalone) {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.style.display = 'inline-block';
        installBtn.textContent = '📲 添加到主屏幕';
        installBtn.onclick = () => {
            if (typeof showToast === 'function') {
                showToast('点击浏览器底部分享按钮 → 添加到主屏幕', 3000);
            } else {
                alert('点击浏览器底部分享按钮 → 添加到主屏幕');
            }
        };
    }
}