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
  updateDoc,
  increment,
} from 'firebase/firestore';
import { initializeServerFirebase } from '@/firebase/server-init';

const ProcessReceiptInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "A photo of a payment receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  amount: z.number().describe('The amount the user claims to have deposited.'),
  userId: z.string().describe('The ID of the user submitting the receipt.'),
  userName: z.string().describe('The name of the user submitting the receipt.'),
  userPhoneNumber: z.string().describe('The phone number of the user submitting the receipt.')
});
type ProcessReceiptInput = z.infer<typeof ProcessReceiptInputSchema>;

const ReceiptDataSchema = z.object({
  isReceipt: z.boolean().describe('Whether the image appears to be a valid payment receipt.'),
  transactionId: z.string().optional().describe('The unique transaction or reference ID from the receipt. Should be alphanumeric.'),
  extractedAmount: z.number().optional().describe('The numerical amount of money transferred according to the receipt.'),
  recipientName: z.string().optional().describe('The name of the recipient or beneficiary of the transfer.'),
});

const ProcessReceiptOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  transactionId: z.string().optional().nullable(),
  extractedAmount: z.number().optional().nullable(),
});
type ProcessReceiptOutput = z.infer<typeof ProcessReceiptOutputSchema>;

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

const processReceiptFlow = ai.defineFlow(
  {
    name: 'processReceiptFlow',
    inputSchema: ProcessReceiptInputSchema,
    outputSchema: ProcessReceiptOutputSchema,
  },
  async (input) => {
    const { firestore } = initializeServerFirebase();

    const aiResponse = await processReceiptPrompt(input);
    const receiptData = aiResponse.output();

    if (!receiptData) {
      return { success: false, message: 'فشل الذكاء الاصطناعي في تحليل الإيصال.', transactionId: null, extractedAmount: null };
    }
    if (!receiptData.isReceipt) {
      return { success: false, message: 'الصورة المرفقة لا تبدو كإيصال دفع صالح.', transactionId: null, extractedAmount: null };
    }
    if (!receiptData.extractedAmount) {
      return { success: false, message: 'لم يتم العثور على مبلغ في الإيصال. الرجاء استخدام إيصال واضح.', transactionId: null, extractedAmount: null };
    }

    const depositRequestsRef = collection(firestore, 'depositRequests');
    if (receiptData.transactionId) {
        const q = query(depositRequestsRef, where('transactionId', '==', receiptData.transactionId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return {
              success: false,
              message: 'هذا الإيصال تم استخدامه مسبقاً. لا يمكن معالجة نفس العملية مرتين.',
              transactionId: receiptData.transactionId,
              extractedAmount: receiptData.extractedAmount,
            };
        }
    }
        
    const now = new Date().toISOString();
    const amount = receiptData.extractedAmount;
    const userDocRef = doc(firestore, 'users', input.userId);
    
    try {
        const batch = writeBatch(firestore);
        
        // Use a direct update for balance to simplify and ensure it works
        batch.update(userDocRef, { balance: increment(amount) });
        
        const depositRequestRef = doc(depositRequestsRef);
        batch.set(depositRequestRef, {
            userId: input.userId,
            userName: input.userName,
            transactionId: receiptData.transactionId || `MANUAL-${Date.now()}`,
            claimedAmount: input.amount,
            extractedAmount: amount,
            status: 'completed_auto',
            timestamp: now,
        });

        const userTransactionRef = doc(collection(firestore, `users/${input.userId}/transactions`));
        batch.set(userTransactionRef, {
            id: userTransactionRef.id,
            userId: input.userId,
            transactionDate: now,
            amount: amount,
            transactionType: 'تغذية رصيد (آلي)',
            notes: `رقم العملية: ${receiptData.transactionId || 'غير متوفر'}`,
        });

        await batch.commit();
            
        return {
            success: true,
            message: 'تمت إضافة المبلغ إلى رصيدك بنجاح.',
            transactionId: receiptData.transactionId,
            extractedAmount: receiptData.extractedAmount,
        };

    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
             return {
                success: false,
                message: `فشلت عملية تحديث الرصيد بسبب عدم كفاية الأذونات. الرجاء التحقق من قواعد الأمان الخاصة بك للسماح بالكتابة إلى 'users', 'depositRequests', و 'transactions'.`,
                transactionId: receiptData.transactionId,
                extractedAmount: receiptData.extractedAmount,
            };
        }
        
        console.error("Error processing receipt flow:", serverError);
        return {
            success: false,
            message: 'حدث خطأ غير متوقع أثناء معالجة الإيصال. لم يتم تحديث الرصيد.',
            transactionId: receiptData.transactionId,
            extractedAmount: receiptData.extractedAmount,
        };
    }
  }
);

// Export a wrapper function for client-side usage
export async function processReceipt(input: ProcessReceiptInput): Promise<ProcessReceiptOutput> {
  return processReceiptFlow(input);
}
