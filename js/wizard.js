
// ===== 向导系统 =====
const WIZARD_PRESETS = {
    worker: {
        name: '🧑‍🏭 员工登记预设',
        desc: '适合一线工人：扫码查产品 → 登记工序 → 批量快速登记',
        steps: [
            { title: '扫码或输入物料码', desc: '在「员工登记」页面，扫描产品二维码或手动输入物料码', action: '点击「📷 扫码」或输入后点击「查询」', target: 'register-input' },
            { title: '查看产品信息', desc: '确认产品名称、批次号、工序列表是否正确', action: '查看产品信息卡片，确认无误', target: 'register-result' },
            { title: '选择工序并登记', desc: '在工序列表中，选择你完成的工序，点击「提交登记」', action: '点击工序旁的「提交登记」按钮', target: 'register-result' },
            { title: '批量登记（可选）', desc: '如果同一批次多个产品要做同一工序，点击「批量登记」后连续扫码', action: '点击「📦 批量登记」→ 连续扫码', target: 'register-result' }
        ]
    },
    manager: {
        name: '👨‍💼 管理者预设',
        desc: '适合管理员：录入批次 → 生成二维码 → 查看统计',
        steps: [
            { title: '录入新批次', desc: '在「批次管理」页面，输入批次号、产品名称、数量和工序', action: '填写信息后点击「预览」→「确认导入」', target: 'batch-id-input' },
            { title: '生成二维码标签', desc: '同一页面下方，输入批次号生成所有产品的二维码', action: '输入批次号 → 点击「生成」→ 导出为图片', target: 'qr-batch-input' },
            { title: '等待员工登记', desc: '工人完成工序后，数据会自动记录到系统', action: '切换到「查询统计」查看进度', target: 'stats-tab-report' },
            { title: '不合格标记（如需）', desc: '在「不合格标记」页面，对不合格工序进行标记', action: '输入物料码 → 选择工序 → 标记不合格', target: 'defect-input' },
            { title: '查看统计报表', desc: '在「查询统计」页面查看员工完成量和产品完成度', action: '点击「员工统计」或「产品统计」查看数据', target: 'stats-tab-worker' }
        ]
    }
};

let wizardState = { active: false, preset: 'worker', currentStep: 0, steps: [] };

function openWizard() {
    const choice = confirm('选择预设方案：\n点击「确定」= 员工登记预设\n点击「取消」= 管理者预设');
    wizardState.preset = choice ? 'worker' : 'manager';
    wizardState.steps = WIZARD_PRESETS[wizardState.preset].steps;
    wizardState.currentStep = 0;
    wizardState.active = true;
    const overlay = document.getElementById('wizard-overlay');
    if (overlay) overlay.classList.add('active');
    renderWizardContent();
}

function renderWizardContent() {
    const { steps, currentStep, preset } = wizardState;
    const total = steps.length;
    const step = steps[currentStep];
    const presetData = WIZARD_PRESETS[preset];

    document.getElementById('wizard-title').textContent = `${presetData.name} · 第 ${currentStep + 1}/${total} 步`;
    document.getElementById('wizard-desc').textContent = step.desc;
    document.getElementById('wizard-action').innerHTML = `
                <div style="font-weight:500;margin-bottom:4px;">📌 操作指引</div>
                <div>${step.action}</div>
                <div style="font-size:12px;color:#bfbfbf;margin-top:4px;">📍 位置：${step.target}</div>
            `;

    const dots = document.getElementById('wizard-dots');
    dots.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const dot = document.createElement('span');
        dot.className = 'step-dot';
        if (i < currentStep) dot.classList.add('done');
        if (i === currentStep) dot.classList.add('active');
        dots.appendChild(dot);
    }

    document.getElementById('wizard-prev-btn').style.display = currentStep === 0 ? 'none' : 'block';
    document.getElementById('wizard-next-btn').textContent = currentStep === total - 1 ? '✅ 完成' : '下一步 →';
}

function wizardNext() {
    const { steps, currentStep } = wizardState;
    if (currentStep < steps.length - 1) {
        wizardState.currentStep++;
        const step = steps[wizardState.currentStep];
        const pageMap = {
            'register-input': 'register', 'register-result': 'register',
            'batch-id-input': 'batch', 'qr-batch-input': 'batch',
            'stats-tab-report': 'stats', 'stats-tab-worker': 'stats',
            'defect-input': 'defect'
        };
        const targetPage = pageMap[step.target] || 'home';
        navigateTo(targetPage);
        renderWizardContent();
    } else {
        closeWizard();
        showToast('🎉 向导已完成！', 2000);
    }
}

function closeWizard() {
    wizardState.active = false;
    const overlay = document.getElementById('wizard-overlay');
    if (overlay) overlay.classList.remove('active');
}