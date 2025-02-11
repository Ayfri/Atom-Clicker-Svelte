import { OBFUSCATION_KEY } from '$env/static/private';

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function simpleEncrypt(text: string, key: string): string {
    const result = text.split('').map((char, i) => {
        return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length));
    }).join('');
    return btoa(result);
}

function simpleDecrypt(encryptedBase64: string, key: string): string {
    const encrypted = atob(encryptedBase64);
    return encrypted.split('').map((char, i) => {
        return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length));
    }).join('');
}

function generateSignature(data: Record<string, any>, timestamp: number): string {
    const sortedKeys = Object.keys(data).sort();
    const values = sortedKeys.map(key => data[key]).join('|');
    const signatureData = `${values}|${timestamp}|${OBFUSCATION_KEY}`;
    return simpleEncrypt(signatureData, OBFUSCATION_KEY);
}

function generateClientSignature(data: Record<string, any>, timestamp: number): string {
    const sortedKeys = Object.keys(data).sort();
    const values = sortedKeys.map(key => data[key]).join('|');
    const signatureData = `${values}|${timestamp}`;
    return simpleHash(signatureData).toString(36);
}

export function encryptLeaderboardData(data: any[]): string {
    const timestamp = Date.now();
    const signature = generateSignature({ data: JSON.stringify(data) }, timestamp);
    const payload = JSON.stringify({
        data,
        timestamp,
        signature
    });
    return simpleEncrypt(payload, OBFUSCATION_KEY);
}

export function decryptLeaderboardData(encryptedData: string): any[] {
    try {
        const decryptedStr = simpleDecrypt(encryptedData, OBFUSCATION_KEY);
        const { data, timestamp, signature } = JSON.parse(decryptedStr);

        // Verify signature
        const expectedSignature = generateSignature({ data: JSON.stringify(data) }, timestamp);
        if (signature !== expectedSignature) {
            console.error('Invalid signature in leaderboard data');
            return [];
        }

        return data;
    } catch (error) {
        console.error('Error decrypting leaderboard data:', error);
        return [];
    }
}

export function verifyAndDecryptClientData(
    encryptedData: string,
    signature: string,
    timestamp: number,
    maxAge: number = 5 * 60 * 1000 // 5 minutes by default
): Record<string, any> | null {
    // Check if the data is too old
    if (Date.now() - timestamp > maxAge) {
        return null;
    }

    try {
        // Decrypt the data (reverse the base64 and string reversal)
        const decodedData = atob(encryptedData);
        const dataStr = decodedData.split('').reverse().join('');
        const data = JSON.parse(dataStr);

        // Verify client signature
        const expectedSignature = generateClientSignature(data, timestamp);
        if (signature !== expectedSignature) {
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error decrypting client data:', error);
        return null;
    }
} 
