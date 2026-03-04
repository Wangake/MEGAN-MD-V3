/*
 * MEGAN-MD JID Validator
 * Standardize and validate JIDs
 */

class JIDValidator {
    // Standardize any JID format
    static standardize(jid) {
        if (!jid) return '';
        
        try {
            // Convert to string
            jid = String(jid);
            
            // Remove device ID (everything after colon)
            jid = jid.split(':')[0];
            
            // Remove any paths
            jid = jid.split('/')[0];
            
            // Handle LIDs
            if (jid.includes('@lid')) {
                return jid.toLowerCase();
            }
            
            // Add domain if missing
            if (!jid.includes('@')) {
                jid = jid + '@s.whatsapp.net';
            }
            
            // Ensure correct domain
            if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@g.us') && !jid.endsWith('@lid')) {
                jid = jid.split('@')[0] + '@s.whatsapp.net';
            }
            
            return jid.toLowerCase();
        } catch (e) {
            return '';
        }
    }
    
    // Extract phone number from JID
    static extractPhone(jid) {
        if (!jid) return null;
        
        const standardized = this.standardize(jid);
        let phone = standardized.split('@')[0];
        phone = phone.replace(/\D/g, '');
        
        return phone || null;
    }
    
    // Check if JID is a group
    static isGroup(jid) {
        return jid && jid.endsWith('@g.us');
    }
    
    // Check if JID is a user
    static isUser(jid) {
        return jid && jid.endsWith('@s.whatsapp.net');
    }
    
    // Check if JID is a newsletter
    static isNewsletter(jid) {
        return jid && jid.endsWith('@newsletter');
    }
    
    // Check if JID is a status broadcast
    static isStatus(jid) {
        return jid === 'status@broadcast';
    }
    
    // Compare two JIDs
    static areSame(jid1, jid2) {
        if (!jid1 || !jid2) return false;
        return this.standardize(jid1) === this.standardize(jid2);
    }
    
    // Format JID for display
    static format(jid) {
        if (!jid) return 'Unknown';
        return '@' + jid.split('@')[0];
    }
}

module.exports = JIDValidator;