// ===== 通用查询 =====
async function fetchProductDetail(productCode) {
    if (!productCode || productCode.trim() === '') { showToast('请输入物料码'); return null; }
    productCode = productCode.trim();
    try {
        const url = `${API_BASE}/getProductInfo?product_code=${encodeURIComponent(productCode)}`;
        const response = await fetch(url);
        const text = await response.text();
        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try {
                const errData = JSON.parse(text);
                errMsg = errData.msg || errMsg;
            } catch (_) { errMsg = text || errMsg; }
            throw new Error(errMsg);
        }
        const data = JSON.parse(text);
        if (!data.success) throw new Error(data.msg || '查询失败');
        return data;
    } catch (err) {
        console.error('查询异常:', err);
        showToast('查询失败：' + err.message, 3000);
        return null;
    }
}

// ===== 统计功能 =====
async function fetchStats(type) {
    try {
        const url = `${API_BASE}/getStats?type=${type}`;
        const response = await fetch(url);
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = JSON.parse(text);
        if (!data.success) throw new Error(data.msg || '获取统计失败');
        return data.data;
    } catch (err) {
        console.error(`${type} 统计异常:`, err);
        showToast(`${type === 'worker' ? '员工' : '产品'}统计失败：` + err.message, 3000);
        return [];
    }
}

// ===== 标记/取消不合格 =====
async function markDefect(productId, processId, stepOrder, action) {
    const actionText = action === 'mark' ? '标记为不合格' : '取消不合格标记';
    if (!confirm(`确定要${actionText}该工序吗？`)) return;
    try {
        showToast('⏳ 处理中...', 1000);
        const response = await fetch(`${API_BASE}/markDefect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId, process_id: processId, step_order: stepOrder,
                action
            })
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
            showToast(`✅ ${result.msg}`, 2000);
            const input = document.getElementById('defect-input');
            const code = input.value.trim();
            if (code) {
                const data = await fetchProductDetail(code);
                if (data) renderProductDetail(data, 'defect-result', { showDefect: true });
            }
        } else { throw new Error(result.msg || '操作失败'); }
    } catch (err) {
        console.error('标记异常:', err);
        showToast('❌ 操作失败：' + err.message, 3000);
    }
}

// ======== 批量扫码登记 ========
async function getBatchCount(batchId) {
    try {
        const response = await fetch(`${API_BASE}/getBatchCount?batch_id=${encodeURIComponent(batchId)}`);
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = JSON.parse(text);
        return data.success ? data.count : 0;
    } catch (err) {
        console.error('获取批次总数失败:', err);
        return 0;
    }
}