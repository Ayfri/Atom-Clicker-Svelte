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

function generateClientSignature(data: string, timestamp: number): string {
    // Utiliser une fenêtre de temps de 5 secondes pour la signature
    const timeWindow = Math.floor(timestamp / 5000);
    const signatureData = `${data}|${timeWindow}`;
    return simpleHash(signatureData).toString(36);
}

export function verifyAndDecryptClientData(
    encodedData: string,
    signature: string,
    timestamp: number,
    maxAge: number = 5 * 60 * 1000 // 5 minutes by default
): Record<string, any> | null {
    try {
        // Check if the data is too old
        const age = Date.now() - timestamp;
        if (age > maxAge) {
            console.error('Data is too old:', { age, maxAge, timestamp, now: Date.now() });
            return null;
        }

        // Verify signature with a 5-second window
        const expectedSignature = generateClientSignature(encodedData, timestamp);
        // Also check the signature for ±1 time window to handle edge cases
        const prevSignature = generateClientSignature(encodedData, timestamp - 5000);
        const nextSignature = generateClientSignature(encodedData, timestamp + 5000);

        if (signature !== expectedSignature &&
            signature !== prevSignature &&
            signature !== nextSignature) {
            console.error('Invalid signature:', {
                provided: signature,
                expected: expectedSignature,
                prev: prevSignature,
                next: nextSignature,
                timestamp,
                dataLength: encodedData.length
            });
            return null;
        }

        // Decode the base64 data
        const decodedStr = decodeURIComponent(escape(atob(encodedData)));
        const parsedData = JSON.parse(decodedStr);

        // Log successful parsing
        console.log('Successfully parsed save data:', {
            timestamp,
            dataSize: encodedData.length,
            parsedKeys: Object.keys(parsedData)
        });

        return parsedData;
    } catch (error) {
        console.error('Error in verifyAndDecryptClientData:', {
            error,
            dataLength: encodedData?.length,
            timestamp,
            signature
        });
        return null;
    }
}

// For storing in Auth0, we'll use a simple XOR encryption with the server key
function simpleEncrypt(text: string): string {
    try {
        const result = text.split('').map((char, i) => {
            return String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length));
        }).join('');
        return btoa(result);
    } catch (error) {
        console.error('Error in simpleEncrypt:', error);
        throw new Error('Encryption failed');
    }
}

function simpleDecrypt(encryptedData: string): string {
    try {
        const encrypted = atob(encryptedData);
        return encrypted.split('').map((char, i) => {
            return String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length));
        }).join('');
    } catch (error) {
        console.error('Error in simpleDecrypt:', error);
        throw new Error('Decryption failed');
    }
}

export function encryptData(data: any): string {
    try {
        const dataStr = JSON.stringify(data);
        return simpleEncrypt(dataStr);
    } catch (error) {
        console.error('Error in encryptData:', error);
        throw new Error('Failed to encrypt data');
    }
}

export function decryptData(encryptedData: string): any | null {
    try {
        const decryptedStr = simpleDecrypt(encryptedData);
        return JSON.parse(decryptedStr);
    } catch (error) {
        console.error('Error in decryptData:', error);
        return null;
    }
}
