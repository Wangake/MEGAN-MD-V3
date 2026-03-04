/*
 * MEGAN-MD Media Processor
 * Image/Video/Audio/Sticker manipulation
 */

const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { fromBuffer } = require('file-type');

ffmpeg.setFfmpegPath(ffmpegPath);

class MediaProcessor {
    constructor() {
        this.tempDir = path.join(__dirname, '../../temp');
        fs.ensureDirSync(this.tempDir);
    }
    
    // ==================== STICKER TOOLS ====================
    
    async createSticker(buffer, options = {}) {
        try {
            const sticker = new Sticker(buffer, {
                pack: options.pack || 'MEGAN-MD',
                author: options.author || 'Wanga',
                type: options.type || StickerTypes.DEFAULT,
                quality: options.quality || 80,
                background: options.background || 'transparent'
            });
            
            return await sticker.toBuffer();
        } catch (error) {
            throw error;
        }
    }
    
    async stickerToImage(buffer) {
        try {
            // Try sharp first
            try {
                return await sharp(buffer).png().toBuffer();
            } catch {
                // Fallback to basic conversion
                return buffer;
            }
        } catch (error) {
            throw error;
        }
    }
    
    // ==================== AUDIO TOOLS ====================
    
    async toAudio(buffer) {
        return this.processWithFFmpeg(buffer, 'mp3', (input, output) => {
            return new Promise((resolve, reject) => {
                ffmpeg(input)
                    .noVideo()
                    .audioCodec('libmp3lame')
                    .audioBitrate(128)
                    .toFormat('mp3')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(output);
            });
        });
    }
    
    async toPTT(buffer) {
        return this.processWithFFmpeg(buffer, 'ogg', (input, output) => {
            return new Promise((resolve, reject) => {
                ffmpeg(input)
                    .noVideo()
                    .audioCodec('libopus')
                    .audioBitrate(24)
                    .audioChannels(1)
                    .audioFrequency(16000)
                    .toFormat('ogg')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(output);
            });
        });
    }
    
    // ==================== VIDEO TOOLS ====================
    
    async toVideo(buffer) {
        return this.processWithFFmpeg(buffer, 'mp4', (input, output) => {
            return new Promise((resolve, reject) => {
                ffmpeg(input)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions(['-preset ultrafast', '-movflags +faststart'])
                    .toFormat('mp4')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(output);
            });
        });
    }
    
    // ==================== IMAGE TOOLS ====================
    
    async resize(buffer, width, height) {
        return await sharp(buffer)
            .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();
    }
    
    async circle(buffer) {
        try {
            const image = sharp(buffer);
            const metadata = await image.metadata();
            
            const size = Math.min(metadata.width, metadata.height);
            
            return await image
                .resize(size, size)
                .composite([{
                    input: Buffer.from(`<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" /></svg>`),
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();
        } catch (error) {
            throw error;
        }
    }
    
    // ==================== UTILITIES ====================
    
    async processWithFFmpeg(buffer, ext, processFn) {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.tmp`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.${ext}`);
        
        try {
            await fs.writeFile(inputPath, buffer);
            await processFn(inputPath, outputPath);
            return await fs.readFile(outputPath);
        } finally {
            await fs.remove(inputPath).catch(() => {});
            await fs.remove(outputPath).catch(() => {});
        }
    }
    
    async getInfo(buffer) {
        const type = await fromBuffer(buffer);
        return {
            mime: type?.mime || 'unknown',
            ext: type?.ext || 'bin',
            size: buffer.length,
            sizeFormatted: this.formatBytes(buffer.length)
        };
    }
    
    formatBytes(bytes) {
        if (bytes >= 1024 * 1024 * 1024) {
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        } else if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        } else if (bytes >= 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        }
        return bytes + ' bytes';
    }
    
    async cleanup() {
        const files = await fs.readdir(this.tempDir);
        let deleted = 0;
        
        for (const file of files) {
            try {
                await fs.remove(path.join(this.tempDir, file));
                deleted++;
            } catch {}
        }
        
        return deleted;
    }
}

module.exports = new MediaProcessor();