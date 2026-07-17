

// ===== 数据管理 - 清空 =====
async function clearData(target) {
    const targetLabels = {
        'products': '产品数据（products）',
        'product_process_plan': '工序计划（product_process_plan）',
        'production_records': '生产记录（production_records）',
        'all': '所有数据（全部）'
    };
    const label = targetLabels[target] || target;
    if (!confirm(`⚠️ 确定要清空「${label}」吗？\n\n此操作不可恢复！\n工序列表（processes）不会被删除。`)) return;
    const resultDiv = document.getElementById('data-result');
    resultDiv.innerHTML = '<div style="color:#faad14;">⏳ 正在清空...</div>';
    try {
        const response = await fetch(`${API_BASE}/clearData`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirm: 'YES_DELETE', target: target })
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
            resultDiv.innerHTML = `
                        <div style="background:#f6ffed;padding:12px;border-radius:8px;border-left:3px solid #52c41a;">
                            <div style="color:#52c41a;font-weight:600;">✅ ${result.msg}</div>
                            <div style="color:#8c8c8c;font-size:13px;margin-top:4px;">已删除记录数：${JSON.stringify(result.results)}</div>
                        </div>
                    `;
            localStorage.removeItem(CACHE_KEY_REGISTER);
            localStorage.removeItem(CACHE_KEY_STATS);
            document.getElementById('register-result').innerHTML = '';
            document.getElementById('stats-result').innerHTML = '';
            showToast('✅ 数据已清空', 2000);
        } else { throw new Error(result.msg || '清空失败'); }
    } catch (err) {
        console.error('清空数据异常:', err);
        resultDiv.innerHTML =
            `<div style="background:#fff1f0;padding:12px;border-radius:8px;border-left:3px solid #ff4d4f;color:#ff4d4f;">❌ ${err.message}</div>`;
    }
}

