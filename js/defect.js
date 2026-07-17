

// ===== 不合格标记 =====
async function defectQuery() {
    const input = document.getElementById('defect-input');
    const code = input.value.trim();
    if (!code) { showToast('请输入物料码'); return; }
    const data = await fetchProductDetail(code);
    if (data) renderProductDetail(data, 'defect-result', { showDefect: true });
}