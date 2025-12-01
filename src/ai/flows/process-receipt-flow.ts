
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
    const { output } = await prompt(input);
    return output!;
  }
);
