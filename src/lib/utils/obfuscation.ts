// Simple client-side obfuscation - this is not cryptographically secure
// but makes it harder to tamper with data in transit

import { generateSignature } from './signing';

export function obfuscateClientData(data: Record<string, any>) {
	try {
		const timestamp = Date.now();
		const dataStr = JSON.stringify(data);

		// Encode the data in base64
		const encodedData = btoa(unescape(encodeURIComponent(dataStr)));

		// Generate a signature to prevent tampering
		const signature = generateSignature(encodedData, timestamp);

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
