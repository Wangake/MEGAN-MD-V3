/*
 * MEGAN-MD Downloader Commands
 * YouTube, TikTok, Spotify downloads
 */

const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs-extra');
const path = require('path');

const commands = [];
const TEMP_DIR = path.join(__dirname, '../megan/temp');

// Helper functions
async function searchYoutube(query, limit = 5) {
    const search = await yts(query);
    return search.videos.slice(0, limit);
}

function formatNumber(num) {
    if (!num) return 'N/A';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ==================== PLAY COMMAND ====================
commands.push({
    pattern: 'play',
    aliases: ['song', 'music'],
    react: '🎵',
    category: 'downloader',
    description: 'Download song from YouTube',
    async execute(context) {
        const { msg, from, sock, args, reply, react, config } = context;
        
        if (!args.length) {
            return reply(`🎵 *Usage:* ${config.PREFIX}play <song name>\nExample: ${config.PREFIX}play nandy asante`);
        }
        
        const query = args.join(' ');
        
        await react('🎵');
        await reply(`🔍 Searching: "${query}"...`);
        
        try {
            const videos = await searchYoutube(query);
            if (!videos.length) {
                await react('❌');
                return reply('❌ No results found.');
            }
            
            const video = videos[0];
            
            const searchMsg = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                             `┃ *${config.BOT_NAME}*\n` +
                             `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                             `🎵 *SONG FOUND*\n\n` +
                             `📀 *Title:* ${video.title}\n` +
                             `⏱️ *Duration:* ${video.timestamp}\n` +
                             `👤 *Channel:* ${video.author.name}\n` +
                             `👁️ *Views:* ${formatNumber(video.views)}\n\n` +
                             `⬇️ *Downloading...*`;
            
            await reply(searchMsg);
            
            // Use gifted-tech API or your own
            const apiUrl = `https://api.giftedtech.co.ke/api/downloader/song?search=${encodeURIComponent(video.url)}&apikey=${config.API?.gifted?.key}`;
            
            const response = await axios.get(apiUrl, { timeout: 30000 });
            
            if (!response.data?.status) throw new Error('Download failed');
            
            const { url } = response.data.data;
            
            // Download file
            const fileResponse = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileResponse.data);
            
            await sock.sendMessage(from, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Download failed: ${error.message}`);
        }
    }
});

// ==================== YTMP3 COMMAND ====================
commands.push({
    pattern: 'ytmp3',
    aliases: ['ytaudio'],
    react: '🎵',
    category: 'downloader',
    description: 'Download YouTube audio',
    async execute(context) {
        const { msg, from, sock, args, reply, react, config } = context;
        
        if (!args.length) {
            return reply(`🎵 *Usage:* ${config.PREFIX}ytmp3 <YouTube URL>\nExample: ${config.PREFIX}ytmp3 https://youtu.be/...`);
        }
        
        const url = args[0];
        
        await react('🎵');
        await reply('⬇️ Downloading audio...');
        
        try {
            const apiUrl = `https://api.giftedtech.co.ke/api/downloader/ytmp3?url=${encodeURIComponent(url)}&apikey=${config.API?.gifted?.key}`;
            
            const response = await axios.get(apiUrl, { timeout: 30000 });
            
            if (!response.data?.status) throw new Error('Download failed');
            
            const { download_url, title } = response.data.data;
            
            const fileResponse = await axios.get(download_url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileResponse.data);
            
            await sock.sendMessage(from, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Download failed: ${error.message}`);
        }
    }
});

// ==================== TIKTOK COMMAND ====================
commands.push({
    pattern: 'tiktok',
    aliases: ['tt'],
    react: '📱',
    category: 'downloader',
    description: 'Download TikTok video',
    async execute(context) {
        const { msg, from, sock, args, reply, react, config } = context;
        
        if (!args.length) {
            return reply(`📱 *Usage:* ${config.PREFIX}tiktok <TikTok URL>`);
        }
        
        const url = args[0];
        
        await react('📱');
        await reply('⬇️ Downloading TikTok...');
        
        try {
            const apiUrl = `https://api.giftedtech.co.ke/api/downloader/tiktok?url=${encodeURIComponent(url)}&apikey=${config.API?.gifted?.key}`;
            
            const response = await axios.get(apiUrl, { timeout: 30000 });
            
            if (!response.data?.status) throw new Error('Download failed');
            
            const { video, title, author } = response.data.data;
            
            const fileResponse = await axios.get(video, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileResponse.data);
            
            await sock.sendMessage(from, {
                video: buffer,
                caption: `📱 *TikTok*\n👤 ${author?.nickname || 'Unknown'}\n📝 ${title || ''}`
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Download failed: ${error.message}`);
        }
    }
});

module.exports = commands;