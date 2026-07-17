// ===== 渲染产品详情 =====
function renderProductDetail(data, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) { console.warn('容器不存在:', containerId); return; }
    const { product, processes } = data;
    const { showRegister = false, showDefect = false } = options;
    const statusMap = { 'pending': '待生产', 'processing': '生产中', 'done': '已完成' };
    const statusText = statusMap[product.status] || product.status;
    const statusClass = product.status === 'done' ? 'done' : (product.status === 'processing' ? 'processing' :
        'pending');

    let html = `
                <div class="card">
                    <div class="card-title">📦 产品信息</div>
                    <div class="product-info">
                        <p><span class="label">名称：</span>${product.product_name || '未命名'}</p>
                        <p><span class="label">物料码：</span><strong>${product.material_code}</strong></p>
                        <p><span class="label">批次号：</span>${product.batch_id || '-'}</p>
                        <p><span class="label">序列号：</span>${product.serial_number || '-'}</p>
                        <p><span class="label">状态：</span><span class="badge ${statusClass}">${statusText}</span></p>
                    </div>
                </div>
            `;
    if (processes && processes.length > 0) {
        html += `<div class="card"><div class="card-title">📋 工序列表（共 ${processes.length} 步）</div>`;
        processes.forEach((p, index) => {
            const stepName = p.name || '（未命名工序）';
            const isDone = p.worker && p.worker !== '' && p.worker !== null;
            const isFailed = p.quality_status === 'failed';
            let statusLabel = '⏳ 待完成';
            let statusClass = 'pending';
            if (isFailed) {
                statusLabel = '❌ 不合格';
                statusClass = 'failed';
            } else if (isDone) {
                statusLabel = '✅ 已完成';
                statusClass = 'done';
            }
            const workerInfo = isDone ? `👤 ${p.worker}` : '';
            html += `
                        <div class="process-item">
                            <span><span class="process-step">#${p.step_order || index + 1}</span><span class="process-name">${stepName}</span></span>
                            <span><span class="process-status ${statusClass}">${statusLabel}</span>${workerInfo ? `<span class="process-worker">${workerInfo}</span>` : ''}</span>
                        </div>
                    `;
            if (showDefect && isDone && !isFailed) {
                html +=
                    `<div style="text-align:right;margin-top:-8px;margin-bottom:8px;"><button class="btn btn-danger btn-sm" onclick="markDefect('${product._id}','${p.process_id}',${p.step_order},'mark')">⚠️ 标记不合格</button></div>`;
            }
            if (showDefect && isFailed) {
                html +=
                    `<div style="text-align:right;margin-top:-8px;margin-bottom:8px;"><button class="btn btn-success btn-sm" onclick="markDefect('${product._id}','${p.process_id}',${p.step_order},'unmark')">✅ 取消标记</button></div>`;
            }

            // ===== 批量登记按钮（仅对已完成且非不合格的工序，且当前是员工登记模式） =====
            if (showRegister && isDone && !isFailed) {
                html += `
                            <div style="text-align:right;margin-top:-8px;margin-bottom:8px;">
                                <button class="btn btn-sm" onclick="startBatchMode('${product._id}','${p.process_id}',${p.step_order},'${p.name}','${product.batch_id}')" style="background:#722ed1;color:white;border:none;border-radius:4px;padding:4px 12px;font-size:13px;">
                                    📦 批量登记
                                </button>
                            </div>
                        `;
            }

        });
        html += `</div>`;
        if (showRegister) {
            html += `<div class="card" style="background:#fafafa;"><div class="card-title">✍️ 登记工序</div><div style="margin-bottom:10px;font-size:14px;color:#8c8c8c;">选择你完成的工序：</div>`;
            let hasAvailable = false;
            processes.forEach((p, index) => {
                const isDone = p.worker && p.worker !== '' && p.worker !== null;
                if (!isDone) hasAvailable = true;
                const disabled = isDone ? 'disabled' : '';
                const checked = index === 0 && !isDone ? 'checked' : '';
                html += `
                            <label style="display:block;padding:8px 0;font-size:16px;border-bottom:1px solid #f5f5f5;opacity:${isDone ? 0.5 : 1};">
                                <input type="radio" name="register_process" value="${p.process_id}" data-step="${p.step_order}" data-product-id="${product._id}" ${disabled} ${checked}>
                                #${p.step_order} ${p.name}
                                ${isDone ? '（已完成，工人：' + p.worker + '）' : '（待完成）'}
                            </label>
                        `;
            });
            if (hasAvailable) {
                html +=
                    `<button class="btn btn-success" onclick="submitRegistration()" style="margin-top:12px;">✅ 提交登记</button>
                                <div style="font-size:13px;color:#bfbfbf;margin-top:6px;">选择一个工序后提交</div>`;
            } else {
                html += `<div style="padding:10px 0;color:#52c41a;text-align:center;">🎉 所有工序已完成！</div>`;
            }
            html += `</div>`;
        }
    } else {
        html +=
            `<div class="card"><div class="card-title">📋 工序列表</div><div class="empty-tip">该产品暂无工序计划</div></div>`;
    }
    container.innerHTML = html;
    if (containerId === 'register-result') { saveCache(CACHE_KEY_REGISTER, data); } else if (containerId ===
        'stats-result') { saveCache(CACHE_KEY_STATS, data); }
}