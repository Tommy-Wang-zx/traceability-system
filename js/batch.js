
// ===== 批次管理 =====
async function loadProcessList() {
    try {
        const response = await fetch(`${API_BASE}/getProcessList`);
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = JSON.parse(text);
        if (!result.success) throw new Error(result.msg || '获取工序列表失败');
        allProcesses = result.processes || [];
        const select = document.getElementById('process-select-dropdown');
        select.innerHTML = '<option value="">-- 请选择工序 --</option>';
        allProcesses.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
        updateSelectOptions();
    } catch (err) {
        console.error('加载工序列表失败:', err);
        allProcesses = [
            { _id: 'proc_001', name: '下料' },
            { _id: 'proc_002', name: '铣削' },
            { _id: 'proc_003', name: '打磨' },
            { _id: 'proc_004', name: '焊接' },
            { _id: 'proc_005', name: '质检' }
        ];
        const select = document.getElementById('process-select-dropdown');
        select.innerHTML = '<option value="">-- 请选择工序 --</option>';
        allProcesses.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
        showToast('使用默认工序列表', 1500);
    }
}


function updateSelectOptions() {
    const select = document.getElementById('process-select-dropdown');
    const options = select.querySelectorAll('option');
    options.forEach(opt => {
        if (opt.value && selectedProcesses.includes(opt.value)) { opt.disabled = true; } else {
            opt
                .disabled = false;
        }
    });
}

function addProcess() {
    const select = document.getElementById('process-select-dropdown');
    const value = select.value;
    if (!value) { showToast('请先选择一个工序', 1500); return; }
    if (selectedProcesses.includes(value)) { showToast('该工序已添加', 1500); return; }
    selectedProcesses.push(value);
    renderSelectedProcesses();
    updateSelectOptions();
    select.value = '';
    showToast(`✅ 已添加工序：${value}`, 1000);
}

function removeProcess(name) {
    selectedProcesses = selectedProcesses.filter(p => p !== name);
    renderSelectedProcesses();
    updateSelectOptions();
}

function renderSelectedProcesses() {
    const container = document.getElementById('selected-process-list');
    if (selectedProcesses.length === 0) { container.innerHTML = '<span class="empty-hint">暂未选择工序，请添加</span>'; return; }
    let html = '';
    selectedProcesses.forEach(name => {
        html +=
            `<span class="selected-tag">${name}<span class="del" onclick="removeProcess('${name}')">✕</span></span>`;
    });
    container.innerHTML = html;
}




// ===== 手动录入 - 预览 =====
async function previewBatch() {
    const batchId = document.getElementById('batch-id-input').value.trim();
    const productName = document.getElementById('batch-name-input').value.trim();
    const count = parseInt(document.getElementById('batch-count-input').value.trim());
    if (!batchId) { showToast('请输入批次号', 2000); return; }
    if (!productName) { showToast('请输入产品名称', 2000); return; }
    if (!count || count < 1) { showToast('请输入有效数量（≥1）', 2000); return; }
    if (selectedProcesses.length === 0) { showToast('请至少添加一个工序', 2000); return; }
    const container = document.getElementById('batch-result');
    container.innerHTML = '<div class="card"><div class="empty-tip">⏳ 生成预览中...</div></div>';
    const confirmBtn = document.getElementById('batch-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = true;
    try {
        const response = await fetch(`${API_BASE}/createBatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                batch_id: batchId, product_name: productName, process_names: selectedProcesses,
                count: count, preview: true
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
        if (!result.success) throw new Error(result.msg || '预览失败');
        let html = `
                    <div class="card">
                        <div class="card-title">👀 预览结果</div>
                        <div class="preview-summary">
                            <strong>批次号：</strong><span class="highlight">${result.batch_id}</span><br>
                            <strong>产品名称：</strong>${result.product_name}<br>
                            <strong>工序：</strong>${selectedProcesses.join(' → ')}<br>
                            <strong>总数量：</strong>${result.total} 个<br>
                            <strong>序列号范围：</strong>${result.start_serial} ~ ${result.end_serial}
                `;
        if (result.batch_exists) {
            html +=
                `<br><br><span style="color:#ff4d4f;font-weight:600;background:#fff1f0;padding:4px 12px;border-radius:4px;">⚠️ 批次号 "${result.batch_id}" 已存在（已有 ${result.existing_count} 个产品），请使用不同批次号</span>`;
            if (confirmBtn) confirmBtn.disabled = true;
        } else { if (confirmBtn) confirmBtn.disabled = false; }
        html += `
                        </div>
                        <table class="preview-table">
                            <thead><tr><th>#</th><th>序列号</th><th>物料码</th></tr></thead>
                            <tbody>
                `;
        result.preview.forEach((item, idx) => {
            const label = idx === result.preview.length - 1 && result.total > 3 ? '... 最后' : idx + 1;
            html += `<tr><td>${label}</td><td>${item.serial}</td><td><code>${item.material_code}</code></td></tr>`;
        });
        html += `</tbody></table>`;
        if (result.batch_exists) {
            html += `<div style="margin-top:12px;font-size:13px;color:#ff4d4f;">❌ 该批次号已存在，无法继续导入</div>`;
        } else {
            html += `<div style="margin-top:12px;font-size:13px;color:#52c41a;">✅ 批次号可用，点击「确认导入」写入数据库</div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
        container.dataset.batchId = batchId;
        container.dataset.productName = productName;
        container.dataset.count = count;
        container.dataset.processNames = JSON.stringify(selectedProcesses);
        container.dataset.batchExists = result.batch_exists ? 'true' : 'false';
    } catch (err) {
        console.error('预览异常:', err);
        container.innerHTML =
            `<div class="card" style="border-left:4px solid #ff4d4f;"><div style="color:#ff4d4f;">❌ ${err.message}</div></div>`;
        if (confirmBtn) confirmBtn.disabled = true;
    }
}

// ===== 手动录入 - 确认 =====
async function confirmBatch() {
    const container = document.getElementById('batch-result');
    const batchId = container.dataset.batchId;
    const productName = container.dataset.productName;
    const count = parseInt(container.dataset.count);
    const processNames = JSON.parse(container.dataset.processNames || '[]');
    const batchExists = container.dataset.batchExists === 'true';
    if (!batchId || !productName || !count || processNames.length === 0) {
        showToast('请先点击「预览」生成预览数据', 2000);
        return;
    }
    if (batchExists) {
        showToast(`❌ 批次号 "${batchId}" 已存在，请使用不同的批次号`, 3000);
        return;
    }
    if (!confirm(`确认导入 ${count} 个「${productName}」到批次「${batchId}」？`)) return;
    const confirmBtn = document.getElementById('batch-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = true;
    container.innerHTML = '<div class="card"><div class="empty-tip">⏳ 导入中...</div></div>';
    try {
        const response = await fetch(`${API_BASE}/createBatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                batch_id: batchId, product_name: productName, process_names: processNames,
                count: count, preview: false
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
        if (!result.success) throw new Error(result.msg || '导入失败');
        container.innerHTML = `
                    <div class="card" style="border-left:3px solid #52c41a;">
                        <div style="color:#52c41a;font-weight:600;">✅ ${result.msg}</div>
                        <div style="color:#8c8c8c;margin-top:6px;font-size:14px;">序列号范围：${result.start_serial} ~ ${result.end_serial}</div>
                    </div>
                `;
        selectedProcesses = [];
        renderSelectedProcesses();
        updateSelectOptions();
        document.getElementById('batch-name-input').value = '';
        document.getElementById('batch-count-input').value = '';
        showToast('✅ 批次导入成功！', 2000);
    } catch (err) {
        console.error('导入异常:', err);
        container.innerHTML =
            `<div class="card" style="border-left:4px solid #ff4d4f;"><div style="color:#ff4d4f;">❌ ${err.message}</div></div>`;
    } finally { if (confirmBtn) confirmBtn.disabled = false; }
}

// ===== 批量导入 =====
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet);
            if (!json || json.length === 0) {
                showToast('文件为空或格式不正确', 2000);
                return;
            }
            // 解析数据
            const parsed = [];
            const errors = [];
            json.forEach((row, idx) => {
                const keys = Object.keys(row);
                // 尝试智能匹配列名
                let batch_id = row['批次号'] || row['batch_id'] || row['batchId'] || '';
                let product_name = row['产品名称'] || row['产品名'] || row['product_name'] || row['name'] ||
                    '';
                let start_serial = row['起始序列号'] || row['start_serial'] || row['start'] || '';
                let end_serial = row['结束序列号'] || row['end_serial'] || row['end'] || '';
                let process_names = row['工序'] || row['process_names'] || row['工序列表'] || '';

                if (!batch_id && !product_name && !start_serial && !end_serial) {
                    // 尝试用数字索引
                    const vals = Object.values(row);
                    if (vals.length >= 5) {
                        batch_id = String(vals[0] || '');
                        product_name = String(vals[1] || '');
                        start_serial = String(vals[2] || '');
                        end_serial = String(vals[3] || '');
                        process_names = String(vals[4] || '');
                    }
                }

                if (!batch_id || !product_name || !start_serial || !end_serial) {
                    errors.push(`第 ${idx + 1} 行：缺少必要字段`);
                    return;
                }
                // 处理工序列表（可能是逗号分隔的字符串）
                let processList = [];
                if (typeof process_names === 'string') {
                    processList = process_names.split(/[,，、\s]+/).filter(p => p.trim());
                } else if (Array.isArray(process_names)) {
                    processList = process_names.filter(p => p);
                } else {
                    processList = [String(process_names)];
                }
                // 检查起始序列号是否有效
                const start = parseInt(start_serial);
                const end = parseInt(end_serial);
                if (isNaN(start) || isNaN(end) || start > end || start < 0) {
                    errors.push(`第 ${idx + 1} 行：序列号范围无效（${start_serial} ~ ${end_serial}）`);
                    return;
                }
                parsed.push({
                    batch_id: String(batch_id).trim(),
                    product_name: String(product_name).trim(),
                    start_serial: start,
                    end_serial: end,
                    process_names: processList
                });
            });

            if (parsed.length === 0) {
                showToast('没有有效数据，请检查格式', 2000);
                return;
            }

            // 预览
            const previewContainer = document.getElementById('import-preview');
            previewContainer.innerHTML = `
                        <div style="background:#e6f7ff;padding:8px 12px;border-radius:8px;margin-bottom:8px;font-size:14px;">
                            ✅ 解析到 ${parsed.length} 批次，共 ${parsed.reduce((sum, p) => sum + (p.end_serial - p.start_serial + 1), 0)} 个产品
                            ${errors.length > 0 ? `<br><span style="color:#ff4d4f;">⚠️ ${errors.length} 行数据有误，已跳过</span>` : ''}
                        </div>
                    `;

            let html = '';
            parsed.forEach((p, idx) => {
                const total = p.end_serial - p.start_serial + 1;
                html += `
                            <div class="batch-item">
                                <div class="meta">
                                    <span><span class="label">批次号</span> <span class="value">${p.batch_id}</span></span>
                                    <span><span class="label">产品</span> <span class="value">${p.product_name}</span></span>
                                    <span><span class="label">序列号</span> <span class="value">${String(p.start_serial).padStart(3, '0')} ~ ${String(p.end_serial).padStart(3, '0')}</span></span>
                                    <span><span class="label">数量</span> <span class="value">${total}</span></span>
                                    <span><span class="label">工序</span> <span class="value">${p.process_names.join(' → ')}</span></span>
                                </div>
                                <div class="examples">示例物料码：${Array.from({ length: Math.min(3, total) }, (_, i) => p.batch_id + '-' + String(p.start_serial + i).padStart(3, '0')).join(', ')}${total > 3 ? ' ...' : ''}</div>
                            </div>
                        `;
            });
            previewContainer.innerHTML += html;

            // 显示确认导入按钮
            document.getElementById('import-confirm-btn').disabled = false;
            document.getElementById('import-confirm-btn').textContent = `✅ 确认导入 ${parsed.length} 批次`;
            importPreviewData = parsed;

        } catch (err) {
            console.error('文件解析失败:', err);
            showToast('文件解析失败：' + err.message, 3000);
        }
    };
    reader.readAsArrayBuffer(file);
    // 重置input，允许重复选择同一文件
    event.target.value = '';
}

async function confirmImport() {
    if (importPreviewData.length === 0) {
        showToast('请先上传并预览数据', 2000);
        return;
    }
    if (!confirm(`确认导入 ${importPreviewData.length} 批次（约 ${importPreviewData.reduce((sum, p) => sum + (p.end_serial - p.start_serial + 1), 0)} 个产品）？`)) return;

    const btn = document.getElementById('import-confirm-btn');
    btn.disabled = true;
    btn.textContent = '⏳ 导入中...';

    try {
        const response = await fetch(`${API_BASE}/batchImportProducts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: importPreviewData, preview: false })
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
            showToast(`✅ ${result.msg}`, 3000);
            const previewContainer = document.getElementById('import-preview');
            previewContainer.innerHTML = `
                        <div style="background:#f6ffed;padding:12px;border-radius:8px;border-left:3px solid #52c41a;">
                            <div style="color:#52c41a;font-weight:600;">✅ ${result.msg}</div>
                            <div style="color:#8c8c8c;font-size:13px;margin-top:4px;">共 ${result.totalProducts} 个产品，${result.totalPlans} 条工序计划</div>
                        </div>
                    `;
            importPreviewData = [];
            btn.textContent = '✅ 导入完成';
            btn.disabled = true;
        } else { throw new Error(result.msg || '导入失败'); }
    } catch (err) {
        console.error('批量导入异常:', err);
        showToast('❌ 导入失败：' + err.message, 3000);
        btn.textContent = '✅ 确认导入';
        btn.disabled = false;
    }
}

function clearImportPreview() {
    document.getElementById('import-preview').innerHTML = '';
    document.getElementById('import-confirm-btn').disabled = true;
    document.getElementById('import-confirm-btn').textContent = '✅ 确认导入';
    importPreviewData = [];
    document.getElementById('file-input').value = '';
}




async function generateQRCodes() {
    const input = document.getElementById('qr-batch-input');
    const batchId = input.value.trim();
    if (!batchId) { showToast('请输入批次号', 1500); return; }
    const container = document.getElementById('qr-preview');
    container.innerHTML = '<div class="empty-tip">⏳ 加载中...</div>';
    document.getElementById('qr-export-btn').disabled = true;
    qrCodeData = [];
    try {
        const response = await fetch(`${API_BASE}/getProductsByBatch?batch_id=${encodeURIComponent(batchId)}`);
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = JSON.parse(text);
        if (!result.success) throw new Error(result.msg || '查询失败');
        const products = result.data || [];
        if (products.length === 0) { container.innerHTML = '<div class="empty-tip">该批次暂无产品</div>'; return; }
        container.innerHTML = '';
        if (typeof QRCode === 'undefined') {
            await loadScript('https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js');
        }
        products.forEach((prod, idx) => {
            const tag = document.createElement('div');
            tag.className = 'qr-tag';
            const qrDiv = document.createElement('div');
            qrDiv.id = `qr-${idx}`;
            tag.appendChild(qrDiv);
            const label = document.createElement('div');
            label.className = 'qr-label';
            label.textContent = prod.material_code || prod.product_code || '';
            tag.appendChild(label);
            container.appendChild(tag);
            new QRCode(qrDiv, {
                text: prod.material_code || prod.product_code || '',
                width: 80,
                height: 80,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            qrCodeData.push(prod);
        });
        document.getElementById('qr-export-btn').disabled = false;
        showToast(`✅ 已生成 ${products.length} 个二维码标签`, 2000);
    } catch (err) {
        console.error('生成二维码失败:', err);
        container.innerHTML = `<div class="empty-tip">❌ ${err.message}</div>`;
    }
}

function clearQRPreview() {
    document.getElementById('qr-preview').innerHTML = '<div class="empty-tip">输入批次号后点击「生成」</div>';
    document.getElementById('qr-export-btn').disabled = true;
    qrCodeData = [];
}

function exportQRCodeImage() {
    const container = document.getElementById('qr-preview');
    const tags = container.querySelectorAll('.qr-tag');
    if (tags.length === 0) { showToast('请先生成二维码', 1500); return; }
    showToast('⏳ 正在生成图片...', 1500);
    if (typeof html2canvas === 'undefined') {
        loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')
            .then(() => doExportQRCode())
            .catch(() => showToast('❌ 加载绘图库失败', 2000));
    } else {
        doExportQRCode();
    }
}

function doExportQRCode() {
    const container = document.getElementById('qr-preview');
    const tags = container.querySelectorAll('.qr-tag');
    const total = tags.length;
    const pageSize = 100;
    const pages = Math.ceil(total / pageSize);

    if (pages > 1) {
        // 分页导出
        let currentPage = 0;
        function exportPage() {
            const start = currentPage * pageSize;
            const end = Math.min(start + pageSize, total);
            // 创建一个临时容器只放当前页的标签
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:12px;background:#fff;';
            for (let i = start; i < end; i++) {
                const clone = tags[i].cloneNode(true);
                tempContainer.appendChild(clone);
            }
            document.body.appendChild(tempContainer);
            html2canvas(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                logging: false
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `二维码标签_第${currentPage + 1}页_${document.getElementById('qr-batch-input').value.trim() || 'batch'}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                document.body.removeChild(tempContainer);
                currentPage++;
                if (currentPage < pages) {
                    setTimeout(exportPage, 500);
                } else {
                    showToast(`✅ 已导出 ${pages} 页二维码标签`, 2000);
                }
            }).catch(err => {
                console.error('导出失败:', err);
                showToast('❌ 导出失败：' + err.message, 2000);
            });
        }
        exportPage();
    } else {
        // 少于100个，直接导出
        html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `二维码标签_${document.getElementById('qr-batch-input').value.trim() || 'batch'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('✅ 二维码标签已导出', 1500);
        }).catch(err => {
            console.error('导出失败:', err);
            showToast('❌ 导出失败：' + err.message, 2000);
        });
    }
}
