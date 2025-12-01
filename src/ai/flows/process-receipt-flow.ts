'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  increment
} from 'firebase/firestore';
import { initializeServerFirebase } from '@/firebase/server-init';

// Input Schema
const ProcessReceiptInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "A photo of a payment receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  amount: z.number().describe('The amount the user claims to have deposited.'),
  userId: z.string().describe('The ID of the user submitting the receipt.'),
  userName: z.string().describe('The name of the user submitting the receipt.'),
  userPhoneNumber: z.string().describe('The phone number of the user submitting the receipt.')
});
export type ProcessReceiptInput = z.infer<typeof ProcessReceiptInputSchema>;

// AI Model Output Schema
const ReceiptDataSchema = z.object({
  isReceipt: z.boolean().describe('Whether the image appears to be a valid payment receipt.'),
  transactionId: z.string().optional().describe('The unique transaction or reference ID from the receipt. Should be alphanumeric.'),
  extractedAmount: z.number().optional().describe('The numerical amount of money transferred according to the receipt.'),
  recipientName: z.string().optional().describe('The name of the recipient or beneficiary of the transfer.'),
});

// Final Flow Output Schema
const ProcessReceiptOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  transactionId: z.string().optional().nullable(),
  extractedAmount: z.number().optional().nullable(),
});
type ProcessReceiptOutput = z.infer<typeof ProcessReceiptOutputSchema>;

// Define the AI prompt
const processReceiptPrompt = ai.definePrompt({
  name: 'processReceiptPrompt',
  input: { schema: ProcessReceiptInputSchema },
  output: { schema: ReceiptDataSchema },
  prompt: `You are an intelligent financial assistant. Your task is to analyze the provided receipt image and extract key information.

  **Instructions:**
  1.  **Verify Receipt:** First, determine if the image is a legitimate payment or bank transfer receipt. If it is not, set 'isReceipt' to false and ignore other fields.
  2.  **Extract Transaction ID:** Find a unique reference number, transaction ID, or operation number. It is crucial for preventing duplicate entries.
  3.  **Extract Amount:** Identify the total amount transferred. It must be a number.
  4.  **Extract Recipient Name:** Find the name of the person or entity who received the money.

  User-provided amount: {{{amount}}}
  Receipt Image: {{media url=receiptImage}}`,
});


// Define the main flow
const processReceiptFlow = ai.defineFlow(
  {
    name: 'processReceiptFlow',
    inputSchema: ProcessReceiptInputSchema,
    outputSchema: ProcessReceiptOutputSchema,
  },
  async (input) => {
    const { firestore } = initializeServerFirebase();

    // 1. Get AI analysis of the receipt
    const { output: aiResponse } = await processReceiptPrompt(input);
    if (!aiResponse) {
      return { success: false, message: 'فشل الذكاء الاصطناعي في تحليل الإيصال.', transactionId: null, extractedAmount: null };
    }

    if (!aiResponse.isReceipt) {
      return { success: false, message: 'الصورة المرفقة لا تبدو كإيصال دفع صالح.', transactionId: null, extractedAmount: null };
    }

    // 2. Validate extracted data
    if (!aiResponse.transactionId) {
      return { success: false, message: 'لم يتم العثور على رقم عملية في الإيصال. الرجاء استخدام إيصال واضح.', transactionId: null, extractedAmount: null };
    }
    if (!aiResponse.extractedAmount) {
      return { success: false, message: 'لم يتم العثور على مبلغ في الإيصال. الرجاء استخدام إيصال واضح.', transactionId: null, extractedAmount: null };
    }
    
    // Optional: Check if extracted amount matches user-provided amount (with a small tolerance)
    if (Math.abs(aiResponse.extractedAmount - input.amount) > 1) { // Tolerance of 1 unit
        return { success: false, message: `المبلغ في الإيصال (${aiResponse.extractedAmount}) لا يتطابق مع المبلغ المدخل (${input.amount}).`, transactionId: null, extractedAmount: null };
    }


    // 3. Check for duplicate transaction ID
    const depositRequestsRef = collection(firestore, 'depositRequests');
    const q = query(depositRequestsRef, where('transactionId', '==', aiResponse.transactionId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return {
        success: false,
        message: 'هذا الإيصال تم استخدامه مسبقاً. لا يمكن معالجة نفس العملية مرتين.',
        transactionId: aiResponse.transactionId,
        extractedAmount: aiResponse.extractedAmount,
      };
    }
    
    // 4. All checks passed, proceed with balance update and logging
    try {
        const batch = writeBatch(firestore);
        const now = new Date().toISOString();
        const amount = aiResponse.extractedAmount;

        // a. Log the successful deposit request
        const depositRequestRef = doc(collection(firestore, 'depositRequests'));
        batch.set(depositRequestRef, {
            ...aiResponse,
            userId: input.userId,
            userName: input.userName,
            userPhoneNumber: input.userPhoneNumber,
            claimedAmount: input.amount,
            status: 'completed_auto',
            timestamp: now,
            receiptImageUrl: input.receiptImage, // For auditing, consider storing the image URL (upload to Storage first)
        });

        // b. Update user's balance
        const userDocRef = doc(firestore, 'users', input.userId);
        batch.update(userDocRef, { balance: increment(amount) });
        
        // c. Create a transaction record for the user
        const userTransactionRef = doc(collection(firestore, `users/${input.userId}/transactions`));
        batch.set(userTransactionRef, {
            userId: input.userId,
            transactionDate: now,
            amount: amount,
            transactionType: 'تغذية رصيد (آلي)',
            notes: `رقم العملية: ${aiResponse.transactionId}`,
        });

        await batch.commit();
        
        return {
            success: true,
            message: 'تمت إضافة المبلغ إلى رصيدك بنجاح.',
            transactionId: aiResponse.transactionId,
            extractedAmount: aiResponse.extractedAmount,
        };

    } catch(error) {
        console.error("Firestore batch write failed: ", error);
        return { success: false, message: 'فشلت عملية تحديث الرصيد. الرجاء المحاولة مرة أخرى.', transactionId: null, extractedAmount: null };
    }
  }
);

// Export a wrapper function for client-side usage
export async function processReceipt(input: ProcessReceiptInput): Promise<ProcessReceiptOutput> {
  return processReceiptFlow(input);
}
