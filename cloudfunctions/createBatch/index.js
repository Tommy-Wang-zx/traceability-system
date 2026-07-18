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

    const { batch_id, product_name, process_names, count, preview = false } = bodyData;

    if (!batch_id || !product_name || !process_names || !count) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '缺少必要参数' })
        };
    }

    try {
        const existingRes = await db.collection('products')
            .where({ batch_id: batch_id })
            .limit(1)
            .get();
        const batchExists = existingRes.data.length > 0;

        const countRes = await db.collection('products')
            .where({ batch_id: batch_id })
            .get();
        const startSeq = countRes.data.length + 1;

        // 生成预览数据
        const previewItems = [];
        const total = parseInt(count);
        const firstThree = Math.min(3, total);
        for (let i = 0; i < firstThree; i++) {
            const seq = startSeq + i;
            const serial = String(seq).padStart(4, '0');
            previewItems.push({
                serial: serial,
                material_code: `${batch_id}-${serial}-1`
            });
        }
        if (total > 3) {
            const lastSeq = startSeq + total - 1;
            const lastSerial = String(lastSeq).padStart(4, '0');
            previewItems.push({
                serial: lastSerial,
                material_code: `${batch_id}-${lastSerial}-1`
            });
        }

        if (preview) {
            return {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: true,
                    preview: previewItems,
                    start_serial: String(startSeq).padStart(4, '0'),
                    end_serial: String(startSeq + total - 1).padStart(4, '0'),
                    total: total,
                    batch_id: batch_id,
                    product_name: product_name,
                    process_names: process_names,
                    batch_exists: batchExists,
                    existing_count: countRes.data.length
                })
            };
        }

        if (batchExists) {
            return {
                statusCode: 409,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    msg: `批次号 "${batch_id}" 已存在，请使用不同的批次号`
                })
            };
        }

        // 工序 ID 查询
        const processIds = [];
        for (let name of process_names) {
            const procRes = await db.collection('processes')
                .where({ name: name.trim() })
                .get();
            if (procRes.data.length === 0) {
                return {
                    statusCode: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ success: false, msg: `工序 "${name}" 不存在` })
                };
            }
            processIds.push({ process_id: procRes.data[0]._id, name: name.trim() });
        }

        // ===== 🔥 生成数据 =====
        const products = [];
        const plans = [];
        for (let i = 0; i < total; i++) {
            const seq = startSeq + i;
            const serial = String(seq).padStart(4, '0');
            const material_code = `${batch_id}-${serial}-1`;
            const productId = `prod_${batch_id.replace(/-/g, '_')}_${serial}`;
            products.push({
                _id: productId,
                material_code: material_code,
                batch_id: batch_id,
                serial_number: serial,
                product_name: product_name,
                status: 'pending'
            });
            const procList = processIds.map((p, idx) => ({
                process_id: p.process_id,
                step_order: idx + 1
            }));
            plans.push({
                _id: `plan_${batch_id.replace(/-/g, '_')}_${serial}`,
                batch_id: batch_id,
                product_id: productId,
                processes: procList
            });
        }

        // ===== 🔥 批量并发写入（性能优化） =====
        const CONCURRENT_BATCH_SIZE = 20; // 每批20个并发

        // 写入 products
        for (let i = 0; i < products.length; i += CONCURRENT_BATCH_SIZE) {
            const batch = products.slice(i, i + CONCURRENT_BATCH_SIZE);
            await Promise.all(batch.map(p => db.collection('products').add(p)));
        }

        // 写入 plans
        for (let i = 0; i < plans.length; i += CONCURRENT_BATCH_SIZE) {
            const batch = plans.slice(i, i + CONCURRENT_BATCH_SIZE);
            await Promise.all(batch.map(p => db.collection('product_process_plan').add(p)));
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                msg: `✅ 成功创建 ${total} 个产品`,
                count: total,
                start_serial: String(startSeq).padStart(4, '0'),
                end_serial: String(startSeq + total - 1).padStart(4, '0')
            })
        };

    } catch (err) {
        console.error('创建批次异常:', err);
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