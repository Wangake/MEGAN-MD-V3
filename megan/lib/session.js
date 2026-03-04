/*
 * MEGAN-MD Session Decoder
 * Megan~base64 format
 */

const zlib = require('zlib');
const fs = require('fs-extra');
const path = require('path');

class SessionDecoder {
    // Decode Megan~base64 to JSON
    static decode(sessionString) {
        try {
            if (!sessionString || !sessionString.startsWith('Megan~')) {
                throw new Error('Invalid session format. Must start with Megan~');
            }
            
            const base64Data = sessionString.replace('Megan~', '');
            const compressed = Buffer.from(base64Data, 'base64');
            const decompressed = zlib.gunzipSync(compressed);
            
            return JSON.parse(decompressed.toString('utf8'));
        } catch (error) {
            throw new Error(`Failed to decode session: ${error.message}`);
        }
    }
    
    // Encode JSON to Megan~base64
    static encode(jsonData) {
        try {
            const jsonString = JSON.stringify(jsonData);
            const compressed = zlib.gzipSync(Buffer.from(jsonString, 'utf8'));
            
            return 'Megan~' + compressed.toString('base64');
        } catch (error) {
            throw new Error(`Failed to encode session: ${error.message}`);
        }
    }
    
    // Validate session string
    static isValid(sessionString) {
        if (!sessionString || typeof sessionString !== 'string') return false;
        if (!sessionString.startsWith('Megan~')) return false;
        
        try {
            const base64Part = sessionString.replace('Megan~', '');
            Buffer.from(base64Part, 'base64').toString('base64') === base64Part;
            return true;
        } catch {
            return false;
        }
    }
    
    // Save decoded session to file
    static async saveToFile(sessionString, outputPath) {
        const decoded = this.decode(sessionString);
        await fs.writeJson(outputPath, decoded, { spaces: 2 });
        return decoded;
    }
    
    // Load session from file and encode
    static async loadFromFile(filePath) {
        const jsonData = await fs.readJson(filePath);
        return this.encode(jsonData);
    }
}

module.exports = SessionDecoder;