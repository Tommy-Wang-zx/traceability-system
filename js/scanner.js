function startScanner(target) {
    const ua = navigator.userAgent.toLowerCase();
    // 检测微信或企业微信
    if (ua.indexOf('micromessenger') !== -1 || ua.indexOf('wxwork') !== -1) {
        const appName = ua.indexOf('wxwork') !== -1 ? '企业微信' : '微信';
        showToast(
            `📱 ${appName}内无法使用摄像头扫码\n\n请点击右上角「...」→「在浏览器中打开」\n或复制链接到系统浏览器打开`,
            4000
        );
        return;
    }
    if (!target) return;
    scanTarget = target;
    const overlay = document.getElementById('scanner-overlay');
    overlay.classList.add('active');
    document.getElementById('scanner-status').textContent = '正在打开摄像头...';
    const videoElement = document.getElementById('scanner-video');
    if (html5QrCode) { try { html5QrCode.stop().then(() => html5QrCode.clear()); } catch (e) { } html5QrCode = null; }
    videoElement.innerHTML = '';
    html5QrCode = new Html5Qrcode("scanner-video");
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanError)
        .then(() => { document.getElementById('scanner-status').textContent = '📷 扫描中...'; })
        .catch((err) => {
            console.error('扫码启动失败:', err);
            document.getElementById('scanner-status').textContent = '❌ 摄像头启动失败: ' + err.message;
            showToast('摄像头启动失败，请检查权限', 3000);
        });
}


async function onScanSuccess(decodedText, decodedResult) {
    console.log('扫码结果:', decodedText);

    document.getElementById('scanner-status').textContent = '✅ 扫码成功: ' + decodedText;
    showToast('✅ 扫码成功', 1000);
    let inputId = null,
        queryFn = null;
    if (scanTarget === 'register') {
        inputId = 'register-input';
        queryFn = registerQuery;
    } else if (scanTarget === 'stats') {
        inputId = 'stats-input';
        queryFn = statsQuery;
    } else if (scanTarget === 'defect') {
        inputId = 'defect-input';
        queryFn = defectQuery;
    }
    if (inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = decodedText;
            saveCache(inputId === 'register-input' ? CACHE_KEY_REGISTER_INPUT : CACHE_KEY_STATS_INPUT, decodedText);
        }
    }

    // =========== 批量扫码模式检测 ============
    if (batchModeActive && batchTarget && scanTarget === 'register') {
        await batchRegister(decodedText);
        // 批量模式下不关闭扫码，继续扫下一个
        return;
    }

    closeScanner();
    if (queryFn) { setTimeout(queryFn, 500); }
}


function onScanError(err) { }

function closeScanner() {
    const overlay = document.getElementById('scanner-overlay');
    overlay.classList.remove('active');
    if (html5QrCode) {
        try {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                html5QrCode = null;
            }).catch(() => { });
        } catch (e) { }
    }
    document.getElementById('scanner-status').textContent = '等待扫码...';
    scanTarget = null;
}


// ===== 批量扫码登记 =====
function startBatchMode(productId, processId, stepOrder, processName, batchId) {
    // 检查是否已经进入批量模式
    if (batchModeActive) {
        if (!confirm('当前已在批量模式，是否退出并重新开始？')) return;
        exitBatchMode();
    }

    batchModeActive = true;
    batchTarget = {
        product_id: productId,
        process_id: processId,
        step_order: stepOrder,
        name: processName,
        batch_id: batchId
    };
    batchCount = 0;
    batchTotal = 0;

    // 查询该批次总数量
    fetch(`${API_BASE}/getBatchCount?batch_id=${encodeURIComponent(batchId)}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                batchTotal = data.count || 0;
            }
        })
        .catch(() => { });

    showToast(`📦 进入批量模式：登记「${processName}」，请连续扫码`, 2500);
    updateBatchModeUI();
}


function exitBatchMode() {
    batchModeActive = false;
    batchTarget = null;
    batchCount = 0;
    batchTotal = 0;
    document.getElementById('batch-mode-bar').classList.add('hidden');
    showToast('已退出批量模式', 1500);
}

function updateBatchModeUI() {
    const bar = document.getElementById('batch-mode-bar');
    if (!bar) return;
    if (batchModeActive && batchTarget) {
        bar.classList.remove('hidden');
        document.getElementById('batch-mode-info').textContent =
            `📦 批量登记「${batchTarget.name}」已登记 ${batchCount} 个${batchTotal > 0 ? ` / 共 ${batchTotal} 个` : ''}`;
    } else {
        bar.classList.add('hidden');
    }
}

async function batchRegister(materialCode) {
    if (!batchModeActive || !batchTarget) return false;

    // 先查询这个物料码对应的产品信息，获取 product_id
    try {
        const detail = await fetchProductDetail(materialCode);
        if (!detail || !detail.product) {
            showToast('❌ 未找到该物料码对应的产品', 1500);
            return false;
        }

        const product = detail.product;
        // 检查批次号是否一致
        if (product.batch_id !== batchTarget.batch_id) {
            showToast(`⚠️ 批次不一致！当前是「${product.batch_id}」，目标批次是「${batchTarget.batch_id}」`, 2500);
            return false;
        }

        // 检查该工序是否已完成
        const process = detail.processes.find(p => p.process_id === batchTarget.process_id);
        if (process && process.worker) {
            showToast(`⏳ 该工序已被 ${process.worker} 登记过`, 1500);
            return false;
        }

        // 执行登记
        const worker = currentUser ? currentUser.name : '未知员工';
        const record = {
            product_id: product._id,
            process_id: batchTarget.process_id,
            step_order: batchTarget.step_order,
            worker: worker,
            status: 'completed',
            timestamp: new Date().toISOString()
        };

        const response = await fetch(`${API_BASE}/submitRecord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        const text = await response.text();
        if (!response.ok) throw new Error(text);
        const result = JSON.parse(text);
        if (result.success) {
            batchCount++;
            updateBatchModeUI();
            showToast(`✅ 已登记 ${batchCount} 个「${batchTarget.name}」`, 1000);
            return true;
        } else {
            throw new Error(result.msg || '登记失败');
        }
    } catch (err) {
        console.error('批量登记异常:', err);
        showToast('❌ ' + err.message, 2000);
        return false;
    }
}

