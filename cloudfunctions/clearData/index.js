const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event, context) => {
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

    const { confirm, target } = bodyData;
    if (confirm !== 'YES_DELETE') {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '请确认 confirm: "YES_DELETE"' })
        };
    }

    const allowedTargets = ['products', 'product_process_plan', 'production_records', 'all'];
    if (!allowedTargets.includes(target)) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: 'target 参数错误，可选: products, product_process_plan, production_records, all' })
        };
    }

    try {
        const collections = target === 'all' 
            ? ['products', 'product_process_plan', 'production_records']
            : [target];

        const results = {};
        for (let name of collections) {
            let deletedCount = 0;
            // 🔥 用循环分页删除，避免一次性取太多数据
            while (true) {
                const res = await db.collection(name).limit(100).get();
                const docs = res.data || [];
                if (docs.length === 0) break;
                for (let doc of docs) {
                    await db.collection(name).doc(doc._id).remove();
                    deletedCount++;
                }
            }
            results[name] = deletedCount;
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                msg: `✅ 已清空: ${collections.join(', ')}`,
                results: results
            })
        };
    } catch (err) {
        console.error('清空数据异常:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '服务器错误: ' + err.message })
        };
    }
};