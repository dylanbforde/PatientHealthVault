import { createHash, generateKeyPairSync, createSign, createVerify } from "crypto";
import type { HealthRecord } from "@shared/schema";

// Generate a new key pair for a user
export function generateKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { publicKey, privateKey };
}

// Create a hash of the record content for signing
function createRecordHash(record: Partial<HealthRecord>) {
  const contentToHash = {
    userId: record.userId,
    title: record.title,
    date: record.date,
    recordType: record.recordType,
    content: record.content,
    facility: record.facility
  };
  
  return createHash('sha256')
    .update(JSON.stringify(contentToHash))
    .digest('hex');
}

// Sign a health record
export function signRecord(record: Partial<HealthRecord>, privateKey: string): string {
  const hash = createRecordHash(record);
  const signer = createSign('SHA256');
  signer.update(hash);
  signer.end();
  
  return signer.sign(privateKey, 'base64');
}

// Verify a health record's signature
export function verifyRecord(record: HealthRecord, publicKey: string): boolean {
  const hash = createRecordHash(record);
  const verifier = createVerify('SHA256');
  verifier.update(hash);
  verifier.end();
  
  try {
    return verifier.verify(publicKey, record.signature!, 'base64');
  } catch (error) {
    console.error('Error verifying record:', error);
    return false;
  }
}
