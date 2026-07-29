// Server-side counterpart of src/lib/utils/obfuscation.ts.
// See src/lib/utils/signing.ts for why this is a tamper/replay guard, not a security boundary.

import { generateSignature } from '$lib/utils/signing';

export function verifyAndDecryptClientData(
	encodedData: string,
	signature: string,
	timestamp: number,
	maxAge: number = 5 * 60 * 1000 // 5 minutes by default
): Record<string, any> | null {
	try {
		// Reject data that is too old, or timestamped in the future (clock skew aside)
		const age = Date.now() - timestamp;
		if (age > maxAge || age < -10_000) {
			console.error('Data is too old or timestamped in the future:', { age, maxAge, timestamp, now: Date.now() });
			return null;
		}

		// Verify signature with a 5-second window, checking ±1 window for edge cases
		const expectedSignature = generateSignature(encodedData, timestamp);
		const prevSignature = generateSignature(encodedData, timestamp - 5000);
		const nextSignature = generateSignature(encodedData, timestamp + 5000);

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
		return JSON.parse(decodedStr);
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
