/*
 * MEGAN-MD Uploader
 * Multiple upload services
 */

const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const path = require('path');
const config = require('../config');

function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

function getFileContentType(ext) {
    const types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
        '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4', '.pdf': 'application/pdf', '.txt': 'text/plain',
        '.zip': 'application/zip', '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return types[ext.toLowerCase()] || 'application/octet-stream';
}

class Uploader {
    // Upload to Catbox (free, no API key)
    static async catbox(buffer, filename) {
        try {
            const form = new FormData();
            const stream = bufferToStream(buffer);
            
            form.append('reqtype', 'fileupload');
            form.append('userhash', '');
            form.append('fileToUpload', stream, {
                filename: filename,
                contentType: getFileContentType(path.extname(filename))
            });

            const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            return { url: data.trim(), success: true };
        } catch (error) {
            return { url: null, success: false, error: error.message };
        }
    }

    // Upload to ImgBB (needs API key)
    static async imgbb(buffer, filename) {
        try {
            const apiKey = config.API?.imgbb || 'bbc0c59714520ebcd0af58caf995bd08';
            
            const form = new FormData();
            const stream = bufferToStream(buffer);
            
            form.append('image', stream, {
                filename: filename,
                contentType: getFileContentType(path.extname(filename))
            });

            const { data } = await axios.post(
                `https://api.imgbb.com/1/upload?key=${apiKey}`,
                form,
                { headers: form.getHeaders() }
            );

            return { url: data.data.url, success: true };
        } catch (error) {
            return { url: null, success: false, error: error.message };
        }
    }

    // Upload to Pixhost
    static async pixhost(buffer, filename) {
        try {
            const { fileTypeFromBuffer } = await import('file-type');
            const type = await fileTypeFromBuffer(buffer);
            const ext = type?.ext || path.extname(filename).replace('.', '');
            
            const form = new FormData();
            const stream = bufferToStream(buffer);
            form.append('img', stream, {
                filename: `image.${ext}`,
                contentType: type?.mime || getFileContentType(`.${ext}`)
            });
            form.append('content_type', '0');

            const { data } = await axios.post('https://api.pixhost.to/images', form, {
                headers: { ...form.getHeaders(), 'Accept': 'application/json' }
            });
            
            const { data: html } = await axios.get(data.show_url, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const regex = html.match(/id="image"[^>]*class="image-img"[^>]*src="([^"]*)"/);
            if (!regex || !regex[1]) throw new Error("Failed to get image URL");

            return { url: regex[1], success: true };
        } catch (error) {
            return { url: null, success: false, error: error.message };
        }
    }

    // Upload to Github CDN
    static async github(buffer, filename) {
        try {
            const form = new FormData();
            const stream = bufferToStream(buffer);
            
            form.append('file', stream, {
                filename: filename,
                contentType: getFileContentType(path.extname(filename))
            });

            const { data } = await axios.post('https://ghbcdn.giftedtech.co.ke/api/upload.php', form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            return { url: data.rawUrl || data, success: true };
        } catch (error) {
            return { url: null, success: false, error: error.message };
        }
    }

    // Auto-detect best uploader
    static async auto(buffer, filename) {
        // Try Catbox first (free, no key)
        let result = await this.catbox(buffer, filename);
        if (result.success) return result;
        
        // Fallback to ImgBB
        result = await this.imgbb(buffer, filename);
        if (result.success) return result;
        
        // Last resort - Pixhost
        return await this.pixhost(buffer, filename);
    }
}

module.exports = Uploader;