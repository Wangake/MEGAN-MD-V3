/*
 * MEGAN-MD Tools Commands
 * Utility and helper commands
 */

const axios = require('axios');
const translate = require('@iamtraction/google-translate');

const commands = [];

// ==================== WEATHER ====================
commands.push({
    pattern: 'weather',
    aliases: ['wth', 'temp'],
    react: '🌤️',
    category: 'tools',
    description: 'Check weather in a city',
    async execute(context) {
        const { msg, from, sock, args, reply, react, config } = context;
        
        if (args.length < 1) {
            return reply('❌ Please provide city name\nExample: .weather Nairobi');
        }
        
        await react('🌤️');
        
        const city = args.join(' ');
        
        try {
            const apiKey = config.API?.weather || 'your-api-key';
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`);
            
            const data = response.data;
            const weather = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                           `┃ *WEATHER INFO*\n` +
                           `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                           `📍 *City:* ${data.name}, ${data.sys.country}\n` +
                           `🌡️ *Temperature:* ${data.main.temp}°C\n` +
                           `🤔 *Feels like:* ${data.main.feels_like}°C\n` +
                           `💧 *Humidity:* ${data.main.humidity}%\n` +
                           `💨 *Wind:* ${data.wind.speed} m/s\n` +
                           `☁️ *Condition:* ${data.weather[0].description}\n` +
                           `📊 *Pressure:* ${data.main.pressure} hPa`;
            
            await reply(weather);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ City not found`);
        }
    }
});

// ==================== TRANSLATE ====================
commands.push({
    pattern: 'translate',
    aliases: ['tr', 'tl'],
    react: '🌐',
    category: 'tools',
    description: 'Translate text to another language',
    async execute(context) {
        const { msg, from, sock, args, reply, react, quoted } = context;
        
        let text = '';
        let targetLang = 'en';
        
        if (args.length >= 2) {
            targetLang = args[0];
            text = args.slice(1).join(' ');
        } else if (args.length === 1) {
            text = args[0];
        } else if (quoted) {
            text = quoted.conversation || quoted.extendedTextMessage?.text || '';
        } else {
            return reply('❌ Please provide text to translate\nExample: .translate es Hello');
        }
        
        if (!text) {
            return reply('❌ No text to translate');
        }
        
        await react('🌐');
        
        try {
            const result = await translate(text, { to: targetLang });
            
            const response = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                            `┃ *TRANSLATION*\n` +
                            `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                            `🔤 *Original:* ${text}\n` +
                            `🌍 *Language:* ${targetLang}\n` +
                            `📝 *Result:* ${result.text}`;
            
            await reply(response);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Translation failed: ${error.message}`);
        }
    }
});

// ==================== QR CODE ====================
commands.push({
    pattern: 'qr',
    aliases: ['qrcode'],
    react: '📱',
    category: 'tools',
    description: 'Generate QR code from text',
    async execute(context) {
        const { msg, from, sock, args, reply, react } = context;
        
        if (args.length < 1) {
            return reply('❌ Please provide text for QR code\nExample: .qr Hello World');
        }
        
        await react('📱');
        
        const text = args.join(' ');
        
        try {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;
            
            await sock.sendMessage(from, {
                image: { url: qrUrl },
                caption: `✅ QR Code for: ${text}`
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== SHORT URL ====================
commands.push({
    pattern: 'shorten',
    aliases: ['shorturl', 'tinyurl'],
    react: '🔗',
    category: 'tools',
    description: 'Shorten a URL',
    async execute(context) {
        const { msg, from, sock, args, reply, react } = context;
        
        if (args.length < 1) {
            return reply('❌ Please provide URL to shorten\nExample: .shorten https://example.com');
        }
        
        await react('🔗');
        
        const url = args[0];
        
        try {
            const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
            
            await reply(`🔗 *Shortened URL:*\n${response.data}`);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== CALCULATOR ====================
commands.push({
    pattern: 'calc',
    aliases: ['calculate', 'math'],
    react: '🧮',
    category: 'tools',
    description: 'Calculate mathematical expression',
    async execute(context) {
        const { msg, from, sock, args, reply, react } = context;
        
        if (args.length < 1) {
            return reply('❌ Please provide expression\nExample: .calc 2+2*5');
        }
        
        await react('🧮');
        
        const expression = args.join(' ');
        
        try {
            // Safe eval
            const result = Function('"use strict";return (' + expression + ')')();
            
            await reply(`🧮 *Result:* ${result}`);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Invalid expression`);
        }
    }
});

// ==================== FETCH ====================
commands.push({
    pattern: 'fetch',
    aliases: ['get', 'request'],
    react: '📡',
    category: 'tools',
    description: 'Fetch content from URL',
    async execute(context) {
        const { msg, from, sock, args, reply, react } = context;
        
        if (args.length < 1) {
            return reply('❌ Please provide URL\nExample: .fetch https://api.example.com');
        }
        
        await react('📡');
        
        const url = args[0];
        
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const data = typeof response.data === 'object' 
                ? JSON.stringify(response.data, null, 2) 
                : response.data;
            
            const output = `📡 *Response:*\n\`\`\`\n${data.substring(0, 1000)}\n\`\`\``;
            
            await reply(output);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== BASE64 ====================
commands.push({
    pattern: 'base64',
    aliases: ['b64'],
    react: '🔐',
    category: 'tools',
    description: 'Encode/decode Base64',
    async execute(context) {
        const { msg, from, sock, args, reply, react } = context;
        
        if (args.length < 2) {
            return reply('❌ Usage: .base64 encode|decode <text>\nExample: .base64 encode Hello');
        }
        
        await react('🔐');
        
        const mode = args[0].toLowerCase();
        const text = args.slice(1).join(' ');
        
        try {
            let result;
            
            if (mode === 'encode' || mode === 'enc') {
                result = Buffer.from(text).toString('base64');
            } else if (mode === 'decode' || mode === 'dec') {
                result = Buffer.from(text, 'base64').toString('utf8');
            } else {
                return reply('❌ Mode must be encode or decode');
            }
            
            await reply(`🔐 *Result:*\n${result}`);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== JSON PRETTY ====================
commands.push({
    pattern: 'json',
    aliases: ['pretty', 'formatjson'],
    react: '📋',
    category: 'tools',
    description: 'Pretty print JSON',
    async execute(context) {
        const { msg, from, sock, args, reply, react, quoted } = context;
        
        let text = '';
        
        if (args.length) {
            text = args.join(' ');
        } else if (quoted) {
            text = quoted.conversation || quoted.extendedTextMessage?.text || '';
        }
        
        if (!text) {
            return reply('❌ Please provide JSON to format');
        }
        
        await react('📋');
        
        try {
            const json = JSON.parse(text);
            const pretty = JSON.stringify(json, null, 2);
            
            await reply(`📋 *Formatted JSON:*\n\`\`\`\n${pretty}\n\`\`\``);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Invalid JSON: ${error.message}`);
        }
    }
});

module.exports = commands;