const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event, context) => {
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
    const batch_id = event.queryStringParameters?.batch_id;
    if (!batch_id) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '缺少 batch_id' })
        };
    }
    try {
        // ===== 🔥 分页获取所有产品 =====
        let allProducts = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;
        
        while (hasMore) {
            const res = await db.collection('products')
                .where({ batch_id: batch_id })
                .orderBy('serial_number', 'asc')
                .skip(offset)
                .limit(limit)
                .get();
            allProducts = allProducts.concat(res.data);
            if (res.data.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }
        
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                data: allProducts
            })
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: err.message })
        };
    }
};