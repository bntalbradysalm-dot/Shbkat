
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

const ReceiptInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "A photo of a bank transfer receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   userId: z.string().describe("The ID of the user who uploaded the receipt."),
   userName: z.string().describe("The name of the user who uploaded the receipt."),
   userPhoneNumber: z.string().describe("The phone number of the user who uploaded the receipt."),
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
4.  **Extract Transaction Date**: Find the date of the transaction and format it as YYYY-MM-DD.
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
    const { output } = await prompt(input);
    return output!;
  }
);
