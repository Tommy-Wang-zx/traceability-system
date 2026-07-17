let deferredPrompt;

let adminList = [];  // 新增：管理员列表将从服务器获取

let currentUser = null;
let selectedProcesses = [];
let allProcesses = [];
let workerStatsData = [];
let productStatsData = [];
// ===== 批量扫码登记 =====
let batchModeActive = false;
let batchTarget = null; // { product_id, process_id, step_order, name, batch_id }
let batchCount = 0;
let batchTotal = 0;
// ===== 二维码数据缓存 =====
let qrCodeData = [];
// 图表实例
let chartInstances = {};

// 批量导入数据
let importPreviewData = [];

// ===== 扫码相关 =====
let html5QrCode = null;
let scanTarget = null;

// ===== 缓存 key =====
const CACHE_KEY_REGISTER = 'cache_register_result';
const CACHE_KEY_STATS = 'cache_stats_result';
const CACHE_KEY_REGISTER_INPUT = 'cache_register_input';
const CACHE_KEY_STATS_INPUT = 'cache_stats_input';
const CACHE_KEY_USER = 'cache_last_user';


// ===== PWA 新增：安装提示 =====

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.style.display = 'inline-block';
        installBtn.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const result = await deferredPrompt.userChoice;
                console.log('用户选择:', result.outcome);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        };
    }
});

window.addEventListener('appinstalled', () => {
    document.getElementById('install-btn').style.display = 'none';
    // 注意：这里的 showToast 会在后面定义，所以不会报错
    setTimeout(() => {
        if (typeof showToast === 'function') {
            showToast('✅ 应用已安装，可在桌面找到', 2000);
        }
    }, 500);
});

if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
    document.getElementById('install-btn').style.display = 'none';
}



        // ===== 初始化 =====
        document.addEventListener('DOMContentLoaded', function () {
            console.log('app_v0.94 加载成功（批量导入+统计图表）');

            // ===== 返回键回到主界面：初始化历史状态 =====
            window.history.pushState({ page: 'home' }, '', window.location.href);


            if (!checkLogin()) { document.getElementById('login-page').style.display = 'flex'; } else { navigateTo('home'); }
            loadProcessList();

            document.getElementById('register-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    registerQuery();
                }
            });
            document.getElementById('stats-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    statsQuery();
                }
            });
            document.getElementById('defect-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    defectQuery();
                }
            });
            document.getElementById('name-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    loginByName();
                }
            });
            document.getElementById('batch-id-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('batch-name-input').focus();
                }
            });
            document.getElementById('batch-name-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('batch-count-input').focus();
                }
            });
            document.getElementById('batch-count-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('process-select-dropdown').focus();
                }
            });
            document.getElementById('process-select-dropdown').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addProcess();
                }
            });
            document.getElementById('new-process-input').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    createProcess();
                }
            });


            // ===== 返回键回到主界面：拦截返回键 =====
            window.addEventListener('popstate', function (event) {
                const activePage = document.querySelector('.page.active');

                // 如果向导打开，返回上一步
                if (wizardState.active) {
                    wizardPrev();
                    return;
                }

                if (!activePage) return;
                // 如果当前不是主页，跳转到主页
                if (activePage.id !== 'page-home') {
                    navigateTo('home');
                    // 重新推入状态，防止连续返回时跳出
                    window.history.pushState({ page: 'home' }, '', window.location.href);
                } else {
                    // 已经在主页，再按一次退出
                    if (window.exitTimer) {
                        clearTimeout(window.exitTimer);
                        window.exitTimer = null;
                        // 允许退出
                        window.history.back();
                    } else {
                        showToast('再按一次退出应用', 1500);
                        window.exitTimer = setTimeout(() => {
                            window.exitTimer = null;
                        }, 2000);
                        // 阻止这次返回
                        window.history.pushState({ page: 'home' }, '', window.location.href);
                    }
                }
            });
        });