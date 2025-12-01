'use server';
/**
 * @fileOverview Processes a receipt image to extract transaction details.
 *
 * - processReceipt - A function that handles the receipt processing.
 * - ReceiptInput - The input type for the processReceipt function.
 * - ReceiptOutput - The return type for the processReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { doc, updateDoc, increment, collection, addDoc, writeBatch } from 'firebase/firestore';
import { initializeServerFirebase } from '@/firebase/server-init';

const ReceiptInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "A photo of a bank transfer receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   userId: z.string().describe("The ID of the user who uploaded the receipt."),
   userName: z.string().describe("The name of the user who uploaded the receipt."),
   userPhoneNumber: z.string().describe("The phone number of the user who uploaded the receipt."),
});
export type ReceiptInput = z.infer<typeof ReceiptInputSchema>;

const ReceiptOutputSchema = z.object({
  isReceipt: z.boolean().describe('Whether the image appears to be a valid receipt.'),
  amount: z.number().describe('The numeric amount of the transaction found in the receipt.'),
  recipientName: z.string().describe('The name of the recipient of the transfer.'),
  transactionDate: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
});
export type ReceiptOutput = z.infer<typeof ReceiptOutputSchema>;

export async function processReceipt(input: ReceiptInput): Promise<ReceiptOutput> {
  return processReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processReceiptPrompt',
  input: {schema: ReceiptInputSchema},
  output: {schema: ReceiptOutputSchema},
  prompt: `You are an expert financial assistant specialized in processing bank transfer receipts from Yemen.
Your task is to analyze the provided receipt image and extract the transaction amount, the recipient's name, and the transaction date.

- The recipient is likely "محمد راضي باشادي" or similar.
- The amount will be in Yemeni Rial (YER).
- The date should be extracted and formatted as YYYY-MM-DD.
- If the image is not a receipt or the required information cannot be found, set isReceipt to false and other fields to their defaults.

Receipt Image: {{media url=receiptImage}}`,
});

const processReceiptFlow = ai.defineFlow(
  {
    name: 'processReceiptFlow',
    inputSchema: ReceiptInputSchema,
    outputSchema: ReceiptOutputSchema,
  },
  async (input) => {
    const { firestore } = initializeServerFirebase();
    const { output } = await prompt(input);

    if (output && output.isReceipt && output.amount > 0) {
      const { userId, userName, userPhoneNumber } = input;
      const { amount } = output;

      const userDocRef = doc(firestore, 'users', userId);
      const userTransactionsRef = collection(firestore, 'users', userId, 'transactions');
      const userNotificationsRef = collection(firestore, 'users', userId, 'notifications');
      const now = new Date().toISOString();

      try {
        const batch = writeBatch(firestore);

        // 1. Update user balance
        batch.update(userDocRef, { balance: increment(amount) });

        // 2. Create transaction record
        const transactionRef = doc(userTransactionsRef);
        batch.set(transactionRef, {
            id: transactionRef.id,
            userId: userId,
            transactionDate: now,
            amount: amount,
            transactionType: 'تغذية رصيد (آلي)',
            notes: `معالجة إيصال بتاريخ ${output.transactionDate}`,
        });
        
        // 3. Send notification
        const notificationRef = doc(userNotificationsRef);
        batch.set(notificationRef, {
            title: 'تمت تغذية حسابك بنجاح',
            body: `تمت إضافة مبلغ ${amount.toLocaleString('en-US')} ريال إلى رصيدك بعد معالجة الإيصال.`,
            timestamp: now,
        });

        await batch.commit();

        return output;
      } catch (error) {
        console.error("Error updating user balance in flow: ", error);
        // Throw a new error to indicate the database operation failed
        throw new Error("Failed to update user records in the database.");
      }
    }
    
    // If output is invalid or not a receipt, return it as is to the client for handling.
    return output || { isReceipt: false, amount: 0, recipientName: '', transactionDate: '' };
  }
);
