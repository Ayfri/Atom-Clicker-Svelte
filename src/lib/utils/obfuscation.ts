// Simple client-side obfuscation - this is not cryptographically secure
// but makes it harder to tamper with data in transit

function simpleHash(str: string): number {
    let hash = 0;
    const strLength = str.length;
    for (let i = 0; i < strLength; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function generateClientSignature(data: string, timestamp: number): string {
    // Use a 5-second time window for the signature
    const timeWindow = Math.floor(timestamp / 5000);
    const signatureData = `${data}|${timeWindow}`;
    return simpleHash(signatureData).toString(36);
}

export function obfuscateClientData(data: Record<string, any>) {
    try {
        const timestamp = Date.now();
        const dataStr = JSON.stringify(data);

        // Encode the data in base64
        const encodedData = btoa(unescape(encodeURIComponent(dataStr)));

        // Generate a signature to prevent tampering
        const signature = generateClientSignature(encodedData, timestamp);

        return {
            data: encodedData,
            signature,
            timestamp
        };
    } catch (error) {
        console.error('Error in obfuscateClientData:', error);
        throw error;
    }
}
