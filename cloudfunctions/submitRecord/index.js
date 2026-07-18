const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event, context) => {
    // ===== 处理 OPTIONS 预检 =====
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: 'Method Not Allowed' })
        };
    }

    let bodyData;
    try {
        bodyData = JSON.parse(event.body || '{}');
    } catch (e) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '无效 JSON' })
        };
    }

    const { product_id, process_id, step_order, worker, status, timestamp } = bodyData;

    if (!product_id || !process_id || !step_order || !worker) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '缺少必要参数' })
        };
    }

    try {
        // 检查是否已存在记录
        const existing = await db.collection('production_records')
            .where({
                product_id: product_id,
                process_id: process_id,
                step_order: step_order
            })
            .get();

        if (existing.data.length > 0) {
            return {
                statusCode: 409,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    msg: '该工序已有工人登记',
                    existing: existing.data[0]
                })
            };
        }

        // 新增记录
        const result = await db.collection('production_records').add({
            product_id: product_id,
            process_id: process_id,
            step_order: step_order,
            worker: worker,
            status: status || 'completed',
            timestamp: timestamp || new Date().toISOString()
        });

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                msg: '登记成功',
                id: result.id
            })
        };
    } catch (err) {
        console.error('提交记录失败:', err);
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