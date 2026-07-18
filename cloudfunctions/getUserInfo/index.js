// 云函数：getUserInfo
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });

// 企业微信配置（替换成你的）
const CORP_ID = 'wwde4aa70609aa1f0e';
const AGENT_ID = '1000002';
const SECRET = 'VymJreNwMtG3ZUT7PhFskMoWSgeM-ckWRGZ0fgouKqY';

exports.main = async (event, context) => {
    // 处理 OPTIONS 预检
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

    // 只允许 GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: 'Method Not Allowed' })
        };
    }

    const { code } = event.queryStringParameters || {};
    if (!code) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: '缺少 code 参数' })
        };
    }

    try {
        // 1. 获取 access_token
        const tokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID}&corpsecret=${SECRET}`;
        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();
        if (tokenData.errcode !== 0) {
            throw new Error(`获取 access_token 失败: ${tokenData.errmsg}`);
        }

        // 2. 用 code 换取 userid
        const userUrl = `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${tokenData.access_token}&code=${code}`;
        const userRes = await fetch(userUrl);
        const userData = await userRes.json();
        if (userData.errcode !== 0) {
            throw new Error(`获取用户信息失败: ${userData.errmsg}`);
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                data: {
                    userid: userData.userid,
                    // 如需姓名，可调用通讯录接口获取，这里简化
                }
            })
        };
    } catch (error) {
        console.error('云函数错误:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, msg: error.message })
        };
    }
};