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

    const { products, preview = false } = bodyData;

    if (!products || !Array.isArray(products) || products.length === 0) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '产品数据不能为空' })
        };
    }

    try {
        // 验证数据格式
        const validProducts = [];
        const errors = [];
        products.forEach((item, idx) => {
            const { batch_id, product_name, start_serial, end_serial, process_names } = item;
            if (!batch_id || !product_name || !start_serial || !end_serial || !process_names || !Array.isArray(process_names) || process_names.length === 0) {
                errors.push(`第 ${idx + 1} 行：缺少必要字段`);
                return;
            }
            const start = parseInt(start_serial);
            const end = parseInt(end_serial);
            if (isNaN(start) || isNaN(end) || start > end || start < 0 || end < 0) {
                errors.push(`第 ${idx + 1} 行：序列号范围无效（${start_serial} ~ ${end_serial}）`);
                return;
            }
            // 检查批次号是否已存在
            // 这里只做预览检查，正式导入时再检查
            validProducts.push({
                batch_id: batch_id.trim(),
                product_name: product_name.trim(),
                start_serial: start,
                end_serial: end,
                process_names: process_names.map(p => p.trim()).filter(p => p)
            });
        });

        if (errors.length > 0) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    msg: '数据格式错误',
                    errors: errors
                })
            };
        }

        // 预览模式：只返回预览数据
        if (preview) {
            const previewData = [];
            const batchExists = {};
            for (let item of validProducts) {
                const existRes = await db.collection('products')
                    .where({ batch_id: item.batch_id })
                    .limit(1)
                    .get();
                batchExists[item.batch_id] = existRes.data.length > 0;
                // 生成预览条目
                const total = item.end_serial - item.start_serial + 1;
                const examples = [];
                const firstThree = Math.min(3, total);
                for (let i = 0; i < firstThree; i++) {
                    const seq = item.start_serial + i;
                    const serial = String(seq).padStart(3, '0');
                    examples.push({ serial, material_code: `${item.batch_id}-${serial}` });
                }
                if (total > 3) {
                    const lastSeq = item.end_serial;
                    const lastSerial = String(lastSeq).padStart(3, '0');
                    examples.push({ serial: lastSerial, material_code: `${item.batch_id}-${lastSerial}` });
                }
                previewData.push({
                    batch_id: item.batch_id,
                    product_name: item.product_name,
                    start_serial: String(item.start_serial).padStart(3, '0'),
                    end_serial: String(item.end_serial).padStart(3, '0'),
                    total: total,
                    process_names: item.process_names,
                    examples: examples,
                    batch_exists: batchExists[item.batch_id]
                });
            }
            return {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: true,
                    preview: previewData,
                    total_items: validProducts.length
                })
            };
        }

        // ===== 正式导入 =====
        // 检查所有批次号是否已存在
        const batchCheck = {};
        for (let item of validProducts) {
            const existRes = await db.collection('products')
                .where({ batch_id: item.batch_id })
                .limit(1)
                .get();
            if (existRes.data.length > 0) {
                batchCheck[item.batch_id] = true;
            }
        }
        const existingBatches = Object.keys(batchCheck).filter(k => batchCheck[k]);
        if (existingBatches.length > 0) {
            return {
                statusCode: 409,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    msg: `批次号已存在：${existingBatches.join(', ')}`,
                    existing_batches: existingBatches
                })
            };
        }

        // 获取所有工序名称 → ID 映射
        const allProcessesRes = await db.collection('processes').get();
        const processMap = {};
        allProcessesRes.data.forEach(p => {
            processMap[p.name] = p._id;
        });

        // 批量导入
        let totalProducts = 0;
        let totalPlans = 0;
        const results = [];

        for (let item of validProducts) {
            const { batch_id, product_name, start_serial, end_serial, process_names } = item;
            const total = end_serial - start_serial + 1;
            
            // 检查工序是否存在
            const missingProcesses = process_names.filter(name => !processMap[name]);
            if (missingProcesses.length > 0) {
                results.push({
                    batch_id,
                    success: false,
                    msg: `工序不存在：${missingProcesses.join(', ')}`
                });
                continue;
            }

            const processIds = process_names.map(name => processMap[name]);

            // 生成产品
            const productsToAdd = [];
            const plansToAdd = [];
            for (let i = 0; i < total; i++) {
                const seq = start_serial + i;
                const serial = String(seq).padStart(3, '0');
                const material_code = `${batch_id}-${serial}`;
                const productId = `prod_${batch_id.replace(/-/g, '_')}_${serial}`;
                productsToAdd.push({
                    _id: productId,
                    material_code: material_code,
                    batch_id: batch_id,
                    serial_number: serial,
                    product_name: product_name,
                    status: 'pending'
                });
                const procList = processIds.map((pid, idx) => ({
                    process_id: pid,
                    step_order: idx + 1
                }));
                plansToAdd.push({
                    _id: `plan_${batch_id.replace(/-/g, '_')}_${serial}`,
                    batch_id: batch_id,
                    product_id: productId,
                    processes: procList
                });
            }

            // 批量写入（分批）
            const batchSize = 50;
            for (let i = 0; i < productsToAdd.length; i += batchSize) {
                const batch = productsToAdd.slice(i, i + batchSize);
                for (let p of batch) {
                    await db.collection('products').add(p);
                }
            }
            for (let i = 0; i < plansToAdd.length; i += batchSize) {
                const batch = plansToAdd.slice(i, i + batchSize);
                for (let p of batch) {
                    await db.collection('product_process_plan').add(p);
                }
            }

            totalProducts += productsToAdd.length;
            totalPlans += plansToAdd.length;
            results.push({
                batch_id,
                success: true,
                count: productsToAdd.length,
                msg: `成功导入 ${productsToAdd.length} 个产品`
            });
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                msg: `✅ 成功导入 ${totalProducts} 个产品，${totalPlans} 条工序计划`,
                results: results,
                totalProducts,
                totalPlans
            })
        };

    } catch (err) {
        console.error('批量导入异常:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '服务器错误: ' + err.message })
        };
    }
};