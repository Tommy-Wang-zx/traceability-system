// ===== 查询统计 =====
async function statsQuery() {
    const input = document.getElementById('stats-input');
    const code = input.value.trim();
    if (!code) { showToast('请输入物料码'); return; }
    saveCache(CACHE_KEY_STATS_INPUT, code);
    const data = await fetchProductDetail(code);
    if (data) renderProductDetail(data, 'stats-result', { showDefect: false });
}

// ========================================
// 六、查询统计（含图表）
// ========================================
async function loadWorkerStats() {
    const container = document.getElementById('stats-report-content');
    container.innerHTML = '<div class="card"><div class="empty-tip">⏳ 加载中...</div></div>';
    document.getElementById('stats-tab-worker').className = 'btn btn-primary';
    document.getElementById('stats-tab-product').className = 'btn btn-outline';
    document.getElementById('stats-tab-chart').className = 'btn btn-chart';
    const data = await fetchStats('worker');
    workerStatsData = data;
    if (data.length === 0) {
        container.innerHTML = `<div class="card"><div class="empty-tip">暂无员工完成数据</div></div>`;
        return;
    }
    let html = `
                <div class="card">
                    <div class="card-title">👷 员工完成量统计（共 ${data.length} 人）</div>
                    <table style="width:100%;font-size:14px;border-collapse:collapse;">
                        <thead><tr style="background:#f5f5f5;text-align:left;">
                            <th style="padding:8px 4px;">员工</th>
                            <th style="padding:8px 4px;text-align:center;">完成数</th>
                            <th style="padding:8px 4px;text-align:center;">合格</th>
                            <th style="padding:8px 4px;text-align:center;">不合格</th>
                            <th style="padding:8px 4px;text-align:center;">良品率</th>
                        </tr></thead>
                        <tbody>
            `;
    data.forEach(item => {
        const rate = item.passRate || 0;
        const rateClass = rate >= 80 ? 'rate-high' : 'rate-low';
        html += `
                    <tr style="border-bottom:1px solid #f0f0f0;">
                        <td style="padding:10px 4px;font-weight:500;">${item.worker}</td>
                        <td style="padding:10px 4px;text-align:center;">${item.total}</td>
                        <td style="padding:10px 4px;text-align:center;color:#52c41a;">${item.passed}</td>
                        <td style="padding:10px 4px;text-align:center;color:#ff4d4f;">${item.failed}</td>
                        <td style="padding:10px 4px;text-align:center;"><span class="${rateClass}">${rate}%</span></td>
                    </tr>
                `;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
    showToast('✅ 员工统计加载完成', 1500);
}

async function loadProductStats() {
    const container = document.getElementById('stats-report-content');
    container.innerHTML = '<div class="card"><div class="empty-tip">⏳ 加载中...</div></div>';
    document.getElementById('stats-tab-product').className = 'btn btn-primary';
    document.getElementById('stats-tab-worker').className = 'btn btn-outline';
    document.getElementById('stats-tab-chart').className = 'btn btn-chart';
    const data = await fetchStats('product');
    productStatsData = data;
    const filtered = data.filter(item => item.totalCompleted > 0);
    if (filtered.length === 0) {
        container.innerHTML = `<div class="card"><div class="empty-tip">暂无产品完成数据</div></div>`;
        return;
    }
    let html = `
                <div class="card">
                    <div class="card-title">📦 产品完成统计（共 ${filtered.length} 个产品有记录）</div>
                    <table style="width:100%;font-size:14px;border-collapse:collapse;">
                        <thead><tr style="background:#f5f5f5;text-align:left;">
                            <th style="padding:8px 4px;">产品</th>
                            <th style="padding:8px 4px;text-align:center;">已完成工序</th>
                            <th style="padding:8px 4px;text-align:center;">合格</th>
                            <th style="padding:8px 4px;text-align:center;">不合格</th>
                            <th style="padding:8px 4px;text-align:center;">良品率</th>
                        </tr></thead>
                        <tbody>
            `;
    filtered.forEach(item => {
        const rate = item.passRate || 0;
        const rateClass = rate >= 80 ? 'rate-high' : 'rate-low';
        const displayName = item.display || `${item.name} (${item.batch_id})`;
        html += `
                    <tr style="border-bottom:1px solid #f0f0f0;">
                        <td style="padding:10px 4px;font-weight:500;">${displayName}</td>
                        <td style="padding:10px 4px;text-align:center;">${item.totalCompleted}</td>
                        <td style="padding:10px 4px;text-align:center;color:#52c41a;">${item.passed}</td>
                        <td style="padding:10px 4px;text-align:center;color:#ff4d4f;">${item.failed}</td>
                        <td style="padding:10px 4px;text-align:center;"><span class="${rateClass}">${rate}%</span></td>
                    </tr>
                `;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
    showToast('✅ 产品统计加载完成', 1500);
}



// ===== 图表统计 =====
async function loadChartStats() {
    const container = document.getElementById('stats-report-content');
    container.innerHTML = '<div class="card"><div class="empty-tip">⏳ 加载图表数据...</div></div>';
    document.getElementById('stats-tab-chart').className = 'btn btn-chart active';
    document.getElementById('stats-tab-worker').className = 'btn btn-outline';
    document.getElementById('stats-tab-product').className = 'btn btn-outline';

    // 并行获取数据
    const [workerData, productData] = await Promise.all([
        fetchStats('worker'),
        fetchStats('product')
    ]);
    workerStatsData = workerData;
    productStatsData = productData;

    // 准备图表数据
    const workerNames = workerData.map(item => item.worker);
    const workerTotals = workerData.map(item => item.total);
    const workerPassRates = workerData.map(item => item.passRate || 0);

    const productFiltered = productData.filter(item => item.totalCompleted > 0);
    const productNames = productFiltered.map(item => item.name || item.product_code);
    const productTotals = productFiltered.map(item => item.totalCompleted);
    const productPassRates = productFiltered.map(item => item.passRate || 0);

    let html = `
                <div class="card">
                    <div class="card-title">📈 图表统计</div>
            `;

    if (workerData.length === 0 && productFiltered.length === 0) {
        html += `<div class="empty-tip">暂无数据可展示图表</div>`;
        html += `</div>`;
        container.innerHTML = html;
        return;
    }

    // 员工完成量柱状图
    if (workerData.length > 0) {
        html += `
                    <div class="chart-box">
                        <div class="chart-title">👷 员工完成量排行</div>
                        <div class="chart-container" style="height:${Math.max(200, workerData.length * 30)}px;">
                            <canvas id="chart-worker-total"></canvas>
                        </div>
                    </div>
                `;
    }

    // 员工良品率柱状图
    if (workerData.length > 0) {
        html += `
                    <div class="chart-box">
                        <div class="chart-title">📊 员工良品率</div>
                        <div class="chart-container" style="height:${Math.max(200, workerData.length * 30)}px;">
                            <canvas id="chart-worker-rate"></canvas>
                        </div>
                    </div>
                `;
    }

    // 产品完成量柱状图（取前20）
    if (productFiltered.length > 0) {
        const topProducts = productFiltered.slice(0, 20);
        html += `
                    <div class="chart-box">
                        <div class="chart-title">📦 产品完成量排行（前20）</div>
                        <div class="chart-container" style="height:${Math.max(200, topProducts.length * 28)}px;">
                            <canvas id="chart-product-total"></canvas>
                        </div>
                    </div>
                `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // 渲染图表（使用 setTimeout 确保 DOM 已渲染）
    requestAnimationFrame(() => {
        // 销毁旧图表
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key]) {
                chartInstances[key].destroy();
                delete chartInstances[key];
            }
        });

        const colors = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa541c'];

        // 员工完成量
        if (workerData.length > 0) {
            const ctx1 = document.getElementById('chart-worker-total');
            if (ctx1) {
                chartInstances['workerTotal'] = new Chart(ctx1, {
                    type: 'bar',
                    data: {
                        labels: workerNames,
                        datasets: [{
                            label: '完成数量',
                            data: workerTotals,
                            backgroundColor: workerTotals.map((v, i) => colors[i % colors
                                .length]),
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { stepSize: 1 } }
                        }
                    }
                });
            }
        }

        // 员工良品率
        if (workerData.length > 0) {
            const ctx2 = document.getElementById('chart-worker-rate');
            if (ctx2) {
                chartInstances['workerRate'] = new Chart(ctx2, {
                    type: 'bar',
                    data: {
                        labels: workerNames,
                        datasets: [{
                            label: '良品率 (%)',
                            data: workerPassRates,
                            backgroundColor: workerPassRates.map(v => v >= 80 ?
                                'rgba(82,196,26,0.8)' : v >= 60 ?
                                    'rgba(250,173,20,0.8)' :
                                    'rgba(255,77,79,0.8)'),
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }
                        }
                    }
                });
            }
        }

        // 产品完成量
        if (productFiltered.length > 0) {
            const topProducts = productFiltered.slice(0, 20);
            const ctx3 = document.getElementById('chart-product-total');
            if (ctx3) {
                chartInstances['productTotal'] = new Chart(ctx3, {
                    type: 'bar',
                    data: {
                        labels: topProducts.map(item => item.name || item.product_code),
                        datasets: [{
                            label: '已完成工序',
                            data: topProducts.map(item => item.totalCompleted),
                            backgroundColor: topProducts.map((v, i) => colors[i % colors
                                .length]),
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { stepSize: 1 } }
                        }
                    }
                });
            }
        }
    }, 100);
}


// ===== 数据导出 =====
function exportWorkerCSV() {
    if (!workerStatsData || workerStatsData.length === 0) {
        showToast('请先加载员工统计数据', 2000);
        return;
    }
    const headers = ['员工', '完成数', '合格', '不合格', '良品率'];
    const rows = workerStatsData.map(item => [
        item.worker,
        item.total,
        item.passed,
        item.failed,
        item.passRate + '%'
    ]);
    downloadCSV(headers, rows, '员工统计_车间追溯.csv');
    showToast('📤 员工统计导出成功', 1500);
}

function exportProductCSV() {
    if (!productStatsData || productStatsData.length === 0) {
        showToast('请先加载产品统计数据', 2000);
        return;
    }
    const headers = ['产品', '批次号', '已完成工序', '合格', '不合格', '良品率'];
    const rows = productStatsData.filter(item => item.totalCompleted > 0).map(item => [
        item.name || item.product_code,
        item.batch_id || '-',
        item.totalCompleted,
        item.passed,
        item.failed,
        item.passRate + '%'
    ]);
    if (rows.length === 0) { showToast('暂无产品完成数据可导出', 2000); return; }
    downloadCSV(headers, rows, '产品统计_车间追溯.csv');
    showToast('📤 产品统计导出成功', 1500);
}

function downloadCSV(headers, rows, filename) {
    const BOM = '\uFEFF';
    let csv = BOM + headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
