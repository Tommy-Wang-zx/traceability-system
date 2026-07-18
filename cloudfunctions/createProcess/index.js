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

    const { name } = bodyData;
    if (!name || name.trim() === '') {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '工序名称不能为空' })
        };
    }

    try {
        // 检查是否已存在同名工序
        const existRes = await db.collection('processes')
            .where({ name: name.trim() })
            .get();
        if (existRes.data.length > 0) {
            return {
                statusCode: 409,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, msg: '工序名称已存在' })
            };
        }

        // 生成新ID
        const countRes = await db.collection('processes').get();
        const count = countRes.data.length + 1;
        const newId = `proc_${String(count).padStart(3, '0')}`;

        const result = await db.collection('processes').add({
            _id: newId,
            name: name.trim()
        });

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                msg: '工序创建成功',
                data: { _id: newId, name: name.trim() }
            })
        };
    } catch (err) {
        console.error('创建工序异常:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '服务器错误: ' + err.message })
        };
    }
};