const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event, context) => {
    console.log('=== getStats 被调用 ===');
    console.log('httpMethod:', event.httpMethod);
    console.log('query:', event.queryStringParameters);

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: 'Method Not Allowed' })
        };
    }

    const type = event.queryStringParameters?.type || 'worker';
    console.log('统计类型:', type);

    try {
        let result;
        if (type === 'product') {
            result = await getProductStats();
        } else {
            result = await getWorkerStats();
        }
        console.log('统计完成，数据条数:', result.length);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                type: type,
                data: result
            })
        };
    } catch (err) {
        console.error('统计异常:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                msg: '服务器错误: ' + err.message
            })
        };
    }
};

// ===================== 员工统计 =====================
async function getWorkerStats() {
    console.log('查询 production_records（所有已完成记录）...');
    const recordsRes = await db.collection('production_records')
        .where({ status: 'completed' })
        .get();
    const records = recordsRes.data || [];
    console.log('找到记录数:', records.length);

    const stats = {};
    records.forEach(rec => {
        const worker = rec.worker || '未知员工';
        if (!stats[worker]) {
            stats[worker] = { total: 0, passed: 0, failed: 0 };
        }
        stats[worker].total += 1;
        if (rec.quality_status === 'failed') {
            stats[worker].failed += 1;
        } else {
            stats[worker].passed += 1;
        }
    });

    const result = Object.keys(stats).map(worker => ({
        worker,
        total: stats[worker].total,
        passed: stats[worker].passed,
        failed: stats[worker].failed,
        passRate: stats[worker].total > 0
            ? Math.round((stats[worker].passed / stats[worker].total) * 100)
            : 0
    }));
    result.sort((a, b) => b.total - a.total);
    console.log('员工统计结果:', result);
    return result;
}
// ===================== 产品统计（分页获取所有产品） =====================
async function getProductStats() {
    console.log('查询 production_records（已完成记录）...');
    const recordsRes = await db.collection('production_records')
        .where({ status: 'completed' })
        .get();
    const records = recordsRes.data || [];
    console.log('找到记录数:', records.length);

    if (records.length === 0) {
        console.warn('没有已完成的生产记录');
        return [];
    }

    // 按 product_id 分组统计
    const statsMap = {};
    records.forEach(rec => {
        const pid = rec.product_id;
        if (!pid) return;
        if (!statsMap[pid]) {
            statsMap[pid] = { total: 0, passed: 0, failed: 0 };
        }
        statsMap[pid].total += 1;
        if (rec.quality_status === 'failed') {
            statsMap[pid].failed += 1;
        } else {
            statsMap[pid].passed += 1;
        }
    });
    console.log('统计到的 product_id 数量:', Object.keys(statsMap).length);

    // 🔥 分页获取所有产品（因为默认只返回 100 条）
    console.log('分页查询 products 集合...');
    let allProducts = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    while (hasMore) {
        const res = await db.collection('products').skip(offset).limit(limit).get();
        allProducts = allProducts.concat(res.data);
        if (res.data.length < limit) hasMore = false;
        offset += limit;
    }
    const products = allProducts;
    console.log('获取到全部产品数:', products.length);

    // 建立 _id -> 产品 的映射
    const productMap = {};
    products.forEach(p => {
        productMap[p._id] = p;
    });

    // 组合结果
    const result = [];
    Object.keys(statsMap).forEach(pid => {
        const prod = productMap[pid];
        const stats = statsMap[pid];
        let displayName, batchId, code;
        if (prod) {
            displayName = prod.product_name || prod.name || '未命名';
            batchId = prod.batch_id || '-';
            code = prod.material_code || prod.product_code || pid;
        } else {
            // 匹配不上，显示 pid，同时从 pid 中提取批次号尝试
            displayName = pid;
            batchId = '-';
            code = pid;
        }
        result.push({
            product_code: code,
            name: displayName,
            batch_id: batchId,
            display: `${displayName} (${batchId})`,
            totalCompleted: stats.total,
            passed: stats.passed,
            failed: stats.failed,
            passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0
        });
    });

    result.sort((a, b) => b.totalCompleted - a.totalCompleted);
    console.log('产品统计完成，结果数:', result.length);
    return result;
}