// ===== 加载管理员列表（从云数据库） =====
async function loadAdminList() {
    try {
        const url = `${API_BASE}/getAdminList`;  // 注意确保路径正确
        const response = await fetch(url);
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = JSON.parse(text);
        if (data.success && Array.isArray(data.admins)) {
            adminList = data.admins;
            // 可选：缓存到 localStorage 以备离线使用
            localStorage.setItem('cached_admin_list', JSON.stringify(adminList));
        } else {
            throw new Error(data.msg || '获取管理员列表失败');
        }
    } catch (err) {
        console.error('加载管理员列表失败:', err);
        // 降级：从 localStorage 读取缓存
        const cached = localStorage.getItem('cached_admin_list');
        if (cached) {
            try {
                adminList = JSON.parse(cached);
                console.log('使用缓存的管理员列表');
            } catch (e) {
                adminList = [];
            }
        } else {
            adminList = [];
        }
    }
}


// ===== 登录 =====
function loginAsTest() { loginWithName('测试员工'); }

function loginWechat() { showToast('企业微信授权功能暂未开放', 2500); }

function loginByName() {
    const input = document.getElementById('name-input');
    const name = input.value.trim();
    if (!name) { showToast('请输入姓名', 1500); return; }
    loginWithName(name);
}

function loginWithName(name) {
    saveCache(CACHE_KEY_USER, name);
    // 不再使用硬编码 ADMIN_LIST，改为调用 loadAdminList()
    loadAdminList().then(() => {
        const isAdmin = adminList.includes(name);
        currentUser = { name, isAdmin };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('login-page').style.display = 'none';
        updateUIForUser();
        showToast(`👋 欢迎，${name}${isAdmin ? '（管理员）' : ''}`, 1500);
        navigateTo('home');
        restoreCachedResults();
    }).catch(() => {
        // fallback: 如果加载失败，暂时允许以非管理员身份进入
        currentUser = { name, isAdmin: false };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('login-page').style.display = 'none';
        updateUIForUser();
        showToast(`👋 欢迎，${name}`, 1500);
        navigateTo('home');
        restoreCachedResults();
    });
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    document.getElementById('login-page').style.display = 'flex';
    closeSidebar();
    showToast('已退出登录', 1500);
}

function checkLogin() {
    const lastUser = loadCache(CACHE_KEY_USER);
    if (lastUser) { document.getElementById('name-input').value = lastUser; }
    const stored = sessionStorage.getItem('currentUser');
    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            document.getElementById('login-page').style.display = 'none';
            updateUIForUser();
            restoreCachedResults();
            return true;
        } catch (e) { }
    }
    document.getElementById('login-page').style.display = 'flex';
    return false;
}



function restoreCachedResults() {
    const registerData = loadCache(CACHE_KEY_REGISTER);
    if (registerData && registerData.product && registerData.processes) {
        renderProductDetail(registerData, 'register-result', { showRegister: true });
    }
    const statsData = loadCache(CACHE_KEY_STATS);
    if (statsData && statsData.product && statsData.processes) {
        renderProductDetail(statsData, 'stats-result', { showDefect: false });
    }
    const registerInput = loadCache(CACHE_KEY_REGISTER_INPUT);
    if (registerInput) { document.getElementById('register-input').value = registerInput; }
    const statsInput = loadCache(CACHE_KEY_STATS_INPUT);
    if (statsInput) { document.getElementById('stats-input').value = statsInput; }
}

function updateUIForUser() {
    if (!currentUser) return;
    const { name, isAdmin } = currentUser;
    document.getElementById('header-user').textContent = name;
    document.getElementById('register-user').textContent = name;
    document.getElementById('stats-user').textContent = name;
    document.getElementById('defect-user').textContent = name;
    document.getElementById('batch-user').textContent = name;
    document.getElementById('process-user').textContent = name;
    document.getElementById('data-user').textContent = name;
    document.getElementById('sidebar-name').textContent = name;
    document.getElementById('sidebar-role').textContent = isAdmin ? '管理员' : '普通员工';
    document.getElementById('sidebar-avatar').textContent = name.charAt(0).toUpperCase();
    const adminBtns = [
        'home-stats-btn', 'home-defect-btn', 'home-batch-btn',
        'home-process-btn', 'home-data-btn',
        'menu-stats', 'menu-defect', 'menu-batch', 'menu-process', 'menu-data'
    ];
    adminBtns.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        // 使用 currentUser.isAdmin 判断
        if (isAdmin) {
            el.classList.remove('disabled');
            el.disabled = false;
            if (id.startsWith('menu-')) el.style.display = 'flex';
        } else {
            el.classList.add('disabled');
            el.disabled = true;
            if (id.startsWith('menu-')) el.style.display = 'none';
            // 如果当前页面是管理页面，跳转回主页
            if (['page-stats', 'page-defect', 'page-batch', 'page-process', 'page-data'].some(p =>
                document.getElementById(p).classList.contains('active'))) {
                navigateTo('home');
            }
        }
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('active')) { closeSidebar(); } else {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.remove('active');
}


function navigateTo(page) {
    const adminPages = ['stats', 'defect', 'batch', 'process', 'data'];
    if (adminPages.includes(page) && currentUser && !currentUser.isAdmin) {
        showToast('您没有权限访问此功能', 2000);
        return;
    }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('#sidebar .menu-item').forEach(el => el.classList.remove('active'));
    const menuItem = document.querySelector(`#sidebar .menu-item[data-page="${page}"]`);
    if (menuItem) menuItem.classList.add('active');
    closeSidebar();
    if (page === 'register') document.getElementById('register-input').focus();
    else if (page === 'stats') {
        document.getElementById('stats-input').focus();
        toggleStatsTab('query');
    } else if (page === 'defect') { document.getElementById('defect-input').focus(); } else if (
        page === 'batch') {
            document.getElementById('batch-id-input').focus();
        loadProcessList();
    } else if (page === 'process') { loadProcessListForManage(); } else if (page === 'data') {
        document.getElementById('data-result').innerHTML = '';
    }

    if (page !== 'home') {
        window.history.pushState({ page: page }, '', window.location.href);
    }
}

function toggleStatsTab(tab) {
    const queryDiv = document.getElementById('stats-query');
    const reportDiv = document.getElementById('stats-report');
    const qBtn = document.getElementById('stats-tab-query');
    const rBtn = document.getElementById('stats-tab-report');
    if (tab === 'query') {
        queryDiv.classList.remove('hidden');
        reportDiv.classList.add('hidden');
        qBtn.className = 'btn btn-primary';
        rBtn.className = 'btn btn-outline';
    } else {
        queryDiv.classList.add('hidden');
        reportDiv.classList.remove('hidden');
        qBtn.className = 'btn btn-outline';
        rBtn.className = 'btn btn-primary';
        // 默认加载员工统计
        document.getElementById('stats-tab-worker').className = 'btn btn-primary';
        document.getElementById('stats-tab-product').className = 'btn btn-outline';
        document.getElementById('stats-tab-chart').className = 'btn btn-chart';
        loadWorkerStats();
    }
}
