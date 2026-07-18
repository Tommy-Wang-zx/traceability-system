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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    let material_code = null;
    if (event.httpMethod === 'GET') {
        material_code = event.queryStringParameters?.product_code;
    } else if (event.httpMethod === 'POST') {
        try {
            const bodyObj = JSON.parse(event.body || '{}');
            material_code = bodyObj.product_code;
        } catch (e) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, msg: '无效 JSON' })
            };
        }
    } else {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: 'Method Not Allowed' })
        };
    }

    if (!material_code) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '缺少物料码' })
        };
    }

    try {
        // ===== 1. 查询产品 =====
        const productRes = await db.collection('products')
            .where({ material_code: material_code })
            .get();

        if (productRes.data.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, msg: '未找到该物料码对应的产品' })
            };
        }
        const product = productRes.data[0];

        // ===== 2. 查询该批次的工序计划 =====
        const planRes = await db.collection('product_process_plan')
            .where({ batch_id: product.batch_id })
            .get();

        let processes = [];
        let allCompleted = true;  // 标记所有工序是否都已完成

        if (planRes.data.length > 0) {
            const plan = planRes.data[0];
            const procList = plan.processes || [];

            for (let proc of procList) {
                // 查工序名称
                const processRes = await db.collection('processes')
                    .where({ _id: proc.process_id })
                    .get();
                let processName = '未命名工序';
                if (processRes.data && processRes.data.length > 0) {
                    processName = processRes.data[0].name || '未命名工序';
                }

                // 查该工序是否有生产记录
                const recordRes = await db.collection('production_records')
                    .where({
                        product_id: product._id,
                        process_id: proc.process_id,
                        step_order: proc.step_order
                    })
                    .get();

                let worker = null;
                let status = 'pending';
                let quality_status = null;  // 🔥 新增
                if (recordRes.data && recordRes.data.length > 0) {
                    const record = recordRes.data[0];
                    worker = record.worker || null;
                    status = record.status || 'completed';
                    quality_status = record.quality_status || null;  // 🔥 新增
                }

                // 如果有任何工序不是 completed，则标记为未完成
                if (status !== 'completed') {
                    allCompleted = false;
                }

                processes.push({
                    process_id: proc.process_id,
                    name: processName,
                    step_order: proc.step_order,
                    worker: worker,
                    status: status,
                    quality_status: quality_status  // 🔥 新增
                });
            }
        }

        // ===== 3. 如果所有工序都已完成，自动将产品状态更新为 'done' =====
        // 注意：这里只修改返回给前端的显示，不实际修改数据库
        // 如果要持久化，可以在这里加一个 update 操作
        let productStatus = product.status;
        if (processes.length > 0 && allCompleted) {
            productStatus = 'done';  // 显示为“已完成”
            // 可选：如果需要持久化到数据库，取消下面注释
            // await db.collection('products').doc(product._id).update({ status: 'done' });
        }

        // ===== 4. 返回结果 =====
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                product: {
                    ...product,
                    status: productStatus  // 使用计算后的状态
                },
                processes: processes
            })
        };

    } catch (err) {
        console.error('云函数错误:', err);
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