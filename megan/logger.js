/*
 * MEGAN-MD Logger
 */

class Logger {
    constructor(name = 'MEGAN-MD') {
        this.name = name;
    }
    
    getTime() {
        return new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
    
    info(message) {
        console.log(`[${this.getTime()}] [${this.name}] ℹ️ ${message}`);
    }
    
    success(message) {
        console.log(`[${this.getTime()}] [${this.name}] ✅ ${message}`);
    }
    
    warn(message) {
        console.log(`[${this.getTime()}] [${this.name}] ⚠️ ${message}`);
    }
    
    error(message) {
        console.log(`[${this.getTime()}] [${this.name}] ❌ ${message}`);
    }
    
    debug(message) {
        console.log(`[${this.getTime()}] [${this.name}] 🐛 ${message}`);
    }
}

module.exports = Logger;