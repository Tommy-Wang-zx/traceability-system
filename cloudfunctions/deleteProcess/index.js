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

    const { _id } = bodyData;
    if (!_id) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '缺少工序ID' })
        };
    }

    try {
        // 检查是否被产品使用
        const usedRes = await db.collection('product_process_plan')
            .where({ 'processes.process_id': _id })
            .get();
        if (usedRes.data.length > 0) {
            // 找出具体哪些产品在使用
            const productIds = usedRes.data.map(p => p.product_id).filter(Boolean);
            const products = [];
            if (productIds.length > 0) {
                for (let pid of productIds.slice(0, 5)) {
                    const pRes = await db.collection('products').doc(pid).get();
                    if (pRes.data) {
                        products.push(pRes.data.material_code || pRes.data.product_code || pid);
                    }
                }
            }
            const productNames = products.length > 0 ? products.join(', ') : '部分产品';
            const extra = products.length >= 5 ? '等' : '';
            return {
                statusCode: 409,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    msg: `该工序被产品 ${productNames}${extra} 使用，无法删除`
                })
            };
        }

        await db.collection('processes').doc(_id).remove();

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                msg: '工序删除成功'
            })
        };
    } catch (err) {
        console.error('删除工序异常:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '服务器错误: ' + err.message })
        };
    }
};