// ===== 员工登记 =====
async function registerQuery() {
    const input = document.getElementById('register-input');
    const code = input.value.trim();
    if (!code) { showToast('请输入物料码'); return; }
    saveCache(CACHE_KEY_REGISTER_INPUT, code);
    const data = await fetchProductDetail(code);
    if (data) renderProductDetail(data, 'register-result', { showRegister: true });
}

async function submitRegistration() {
    const selected = document.querySelector('input[name="register_process"]:checked');
    if (!selected) { showToast('请选择一个工序', 2000); return; }
    const worker = currentUser ? currentUser.name : '未知员工';
    const processId = selected.value;
    const stepOrder = parseInt(selected.dataset.step);
    const productId = selected.dataset.productId;
    const record = {
        product_id: productId,
        process_id: processId,
        step_order: stepOrder,
        worker: worker,
        status: 'completed',
        timestamp: new Date().toISOString()
    };
    try {
        showToast('⏳ 提交中...', 1000);
        const response = await fetch(`${API_BASE}/submitRecord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        const text = await response.text();
        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try {
                const errData = JSON.parse(text);
                errMsg = errData.msg || errMsg;
            } catch (_) { errMsg = text || errMsg; }
            throw new Error(errMsg);
        }
        const result = JSON.parse(text);
        if (result.success) {
            showToast('✅ 登记成功！', 2000);
            setTimeout(async () => {
                const input = document.getElementById('register-input');
                const code = input.value.trim();
                if (code) {
                    const data = await fetchProductDetail(code);
                    if (data) renderProductDetail(data, 'register-result', { showRegister: true });
                }
            }, 500);
        } else { throw new Error(result.msg || '提交失败'); }
    } catch (err) {
        console.error('提交异常:', err);
        showToast('❌ 登记失败：' + err.message, 3000);
    }
}
