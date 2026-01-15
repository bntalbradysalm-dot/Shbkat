
'use server';
/**
 * @fileOverview Processes a receipt image to extract transaction details and verify recipient.
 *
 * - processReceipt - A function that handles the receipt processing.
 * - ReceiptInput - The input type for the processReceipt function.
 * - ReceiptOutput - The return type for the processReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { initializeServerFirebase } from '@/firebase/server-init';

const ReceiptInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "A photo of a bank transfer receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   userId: z.string().describe("The ID of the user who uploaded the receipt."),
   expectedRecipientName: z.string().describe("The expected name of the recipient for verification."),
   expectedAccountNumber: z.string().describe("The expected account number of the recipient for verification."),
});
export type ReceiptInput = z.infer<typeof ReceiptInputSchema>;

const ReceiptOutputSchema = z.object({
  isReceipt: z.boolean().describe('Whether the image appears to be a valid receipt.'),
  amount: z.number().describe('The numeric amount of the transaction found in the receipt.'),
  isNameMatch: z.boolean().describe('Whether the recipient name on the receipt matches the expected name.'),
  recipientName: z.string().describe('The name of the recipient of the transfer found on the receipt.'),
  isAccountNumberMatch: z.boolean().describe('Whether the recipient account number on the receipt matches the expected account number.'),
  accountNumber: z.string().describe('The account number of the recipient found on the receipt.'),
  transactionDate: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
  transactionReference: z.string().describe('The unique transaction reference number or operation ID from the receipt.'),
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
Your task is to analyze the provided receipt image and extract key information.

1.  **Extract Transaction Amount**: Find the total amount of the transaction in Yemeni Rial (YER).
2.  **Extract Recipient's Name**: Find the name of the person or entity who received the money.
3.  **Extract Recipient's Account Number**: Find the account number of the recipient.
4.  **Extract Transaction Date**: Find the date of the transaction in YYYY-MM-DD format.
5.  **Extract Transaction Reference**: Find the unique transaction reference number. It might be labeled "رقم العملية", "رقم المرجع", "Transaction ID", or something similar. This is crucial for preventing duplicate entries.
6.  **Verify Recipient Name**: Compare the extracted recipient name with the provided expected recipient name: \`{{{expectedRecipientName}}}\`. The names might have slight variations, so be flexible (e.g., "محمد راضي باشادي" is the same as "محمد باشادي"). Set \`isNameMatch\` to true if they match, otherwise set it to false.
7.  **Verify Account Number**: Compare the extracted account number with the provided expected account number: \`{{{expectedAccountNumber}}}\`. Account numbers must match exactly. Set \`isAccountNumberMatch\` to true if they match, otherwise set it to false.
8.  **Validate Receipt**: If the image does not appear to be a valid bank transfer receipt or if the required information (especially transaction reference) cannot be found, set \`isReceipt\` to false and other fields to their defaults.

Receipt Image: {{media url=receiptImage}}`,
});

const processReceiptFlow = ai.defineFlow(
  {
    name: 'processReceiptFlow',
    inputSchema: ReceiptInputSchema,
    outputSchema: ReceiptOutputSchema,
  },
  async (input) => {
    let output;
    try {
        const response = await prompt(input);
        output = response.output;
    } catch (e: any) {
        if (e.message && (e.message.includes('503') || e.message.toLowerCase().includes('overloaded'))) {
            throw new Error('الخدمة مشغولة حاليًا بسبب كثرة الطلبات. الرجاء المحاولة مرة أخرى بعد لحظات.');
        }
        throw new Error('فشل تحليل صورة الإيصال. الرجاء التأكد من وضوح الصورة والمحاولة مرة أخرى.');
    }

    if (!output) {
      throw new Error("Failed to get a response from the AI model.");
    }
    
    if (!output.isReceipt) {
      throw new Error("The uploaded image does not appear to be a valid receipt.");
    }
    if (!output.isNameMatch) {
      throw new Error(`Recipient name mismatch. Expected something like "${input.expectedRecipientName}", but found "${output.recipientName}".`);
    }
    if (!output.isAccountNumberMatch) {
        throw new Error(`Recipient account number mismatch. Expected "${input.expectedAccountNumber}", but found "${output.accountNumber}".`);
    }
    if (!output.transactionReference) {
      throw new Error("Could not find a transaction reference number on the receipt.");
    }

    // Return the validated output. The client will handle the database transaction.
    return output;
  }
);
