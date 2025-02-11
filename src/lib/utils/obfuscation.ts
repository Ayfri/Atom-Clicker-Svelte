// Simple client-side obfuscation - this is not cryptographically secure
// but makes it harder to tamper with data in transit

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function generateClientSignature(data: Record<string, any>, timestamp: number): string {
    const sortedKeys = Object.keys(data).sort();
    const values = sortedKeys.map(key => data[key]).join('|');
    const signatureData = `${values}|${timestamp}`;
    return simpleHash(signatureData).toString(36);
}

export function obfuscateClientData(data: Record<string, any>): {
    data: string;
    signature: string;
    timestamp: number;
} {
    const timestamp = Date.now();
    const dataStr = JSON.stringify(data);
    
    // Simple obfuscation using base64 and reversing
    const reversed = dataStr.split('').reverse().join('');
    const encoder = new TextEncoder();
    const bytes = encoder.encode(reversed);
    const obfuscated = btoa(String.fromCharCode(...bytes));
    const signature = generateClientSignature(data, timestamp);

    return {
        data: obfuscated,
        signature,
        timestamp
    };
} 
