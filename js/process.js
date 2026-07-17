
// ===== 工序管理 =====
async function loadProcessListForManage() {
    const container = document.getElementById('process-list-container');
    container.innerHTML = '<div class="empty-tip">⏳ 加载中...</div>';
    try {
        const response = await fetch(`${API_BASE}/getProcessList`);
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = JSON.parse(text);
        if (!result.success) throw new Error(result.msg || '获取工序列表失败');
        const processes = result.processes || [];
        document.getElementById('process-count').textContent = `共 ${processes.length} 个`;
        if (processes.length === 0) {
            container.innerHTML = '<div class="empty-tip">暂无工序，请添加</div>';
            return;
        }
        let html = '';
        processes.forEach(p => {
            html += `
                        <div class="process-list-item" data-id="${p._id}">
                            <span class="id-tag">${p._id}</span>
                            <span class="name" id="name-${p._id}">${p.name}</span>
                            <div class="actions">
                                <button class="btn-sm btn-edit" onclick="startEditProcess('${p._id}','${p.name}')">✏️</button>
                                <button class="btn-sm btn-delete" onclick="deleteProcess('${p._id}','${p.name}')">🗑️</button>
                            </div>
                        </div>
                    `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error('加载工序列表失败:', err);
        container.innerHTML = `<div class="empty-tip">❌ 加载失败：${err.message}</div>`;
    }
}




function startEditProcess(id, currentName) {
    const nameEl = document.getElementById('name-' + id);
    const item = nameEl.closest('.process-list-item');
    const actions = item.querySelector('.actions');
    const currentHtml = nameEl.textContent;
    nameEl.innerHTML = `
                <input type="text" class="process-edit-input" id="edit-input-${id}" value="${currentName}" 
                       onkeypress="if(event.key==='Enter'){saveEditProcess('${id}')}">
            `;
    actions.innerHTML = `
                <button class="btn-sm btn-success" onclick="saveEditProcess('${id}')" style="background:#52c41a;color:white;border:none;border-radius:4px;padding:4px 12px;">💾</button>
                <button class="btn-sm btn-outline" onclick="cancelEditProcess('${id}','${currentName}')" style="background:#f5f5f5;color:#333;border:1px solid #d9d9d9;border-radius:4px;padding:4px 12px;">✕</button>
            `;
    setTimeout(() => document.getElementById('edit-input-' + id).focus(), 100);
}

function cancelEditProcess(id, currentName) {
    const nameEl = document.getElementById('name-' + id);
    const item = nameEl.closest('.process-list-item');
    const actions = item.querySelector('.actions');
    nameEl.textContent = currentName;
    actions.innerHTML = `
                <button class="btn-sm btn-edit" onclick="startEditProcess('${id}','${currentName}')">✏️</button>
                <button class="btn-sm btn-delete" onclick="deleteProcess('${id}','${currentName}')">🗑️</button>
            `;
}




async function saveEditProcess(id) {
    const input = document.getElementById('edit-input-' + id);
    const newName = input.value.trim();
    if (!newName) { showToast('工序名称不能为空', 1500); return; }
    try {
        const response = await fetch(`${API_BASE}/updateProcess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _id: id, name: newName })
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
            showToast('✅ 工序已更新', 1500);
            loadProcessListForManage();
        } else { throw new Error(result.msg || '更新失败'); }
    } catch (err) {
        console.error('更新工序异常:', err);
        showToast('❌ 更新失败：' + err.message, 3000);
    }
}

async function createProcess() {
    const input = document.getElementById('new-process-input');
    const name = input.value.trim();
    if (!name) { showToast('请输入工序名称', 1500); return; }
    try {
        const response = await fetch(`${API_BASE}/createProcess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
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
            showToast('✅ 工序创建成功', 1500);
            input.value = '';
            loadProcessListForManage();
            loadProcessList();
        } else { throw new Error(result.msg || '创建失败'); }
    } catch (err) {
        console.error('创建工序异常:', err);
        showToast('❌ 创建失败：' + err.message, 3000);
    }
}

async function deleteProcess(id, name) {
    if (!confirm(`确定要删除工序「${name}」吗？\n\n如果该工序被产品使用，将无法删除。`)) return;
    try {
        const response = await fetch(`${API_BASE}/deleteProcess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _id: id })
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
            showToast('✅ 工序已删除', 1500);
            loadProcessListForManage();
            loadProcessList();
        } else { throw new Error(result.msg || '删除失败'); }
    } catch (err) {
        console.error('删除工序异常:', err);
        showToast('❌ ' + err.message, 3000);
    }
}
