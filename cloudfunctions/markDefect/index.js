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

    const { product_id, process_id, step_order, action } = bodyData;
    // action: 'mark' 标记不合格, 'unmark' 取消标记

    if (!product_id || !process_id || step_order === undefined) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '缺少必要参数' })
        };
    }

    if (action !== 'mark' && action !== 'unmark') {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: 'action 参数错误，请使用 mark 或 unmark' })
        };
    }

    try {
        // 查找对应的生产记录
        const recordRes = await db.collection('production_records')
            .where({
                product_id: product_id,
                process_id: process_id,
                step_order: step_order,
                status: 'completed'
            })
            .get();

        if (recordRes.data.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, msg: '未找到该工序的完成记录' })
            };
        }

        const record = recordRes.data[0];
        const recordId = record._id;

        // 更新 quality_status
        const newQualityStatus = action === 'mark' ? 'failed' : 'passed';

        await db.collection('production_records').doc(recordId).update({
            quality_status: newQualityStatus
        });

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                msg: action === 'mark' ? '已标记为不合格' : '已取消不合格标记',
                quality_status: newQualityStatus
            })
        };

    } catch (err) {
        console.error('标记异常:', err);
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