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

    const { _id, name } = bodyData;
    if (!_id) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '缺少工序ID' })
        };
    }
    if (!name || name.trim() === '') {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '工序名称不能为空' })
        };
    }

    try {
        // 检查是否已存在同名工序（排除自身）
        const existRes = await db.collection('processes')
            .where({ name: name.trim() })
            .get();
        if (existRes.data.length > 0 && existRes.data[0]._id !== _id) {
            return {
                statusCode: 409,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, msg: '工序名称已存在' })
            };
        }

        await db.collection('processes').doc(_id).update({
            name: name.trim()
        });

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                msg: '工序更新成功'
            })
        };
    } catch (err) {
        console.error('更新工序异常:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '服务器错误: ' + err.message })
        };
    }
};