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
  increment,
  FirestoreError
} from 'firebase/firestore';
import { initializeServerFirebase } from '@/firebase/server-init';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
type ProcessReceiptInput = z.infer<typeof ProcessReceiptInputSchema>;

const ReceiptDataSchema = z.object({
  isReceipt: z.boolean().describe('Whether the image appears to be a valid payment receipt.'),
  transactionId: z.string().optional().describe('The unique transaction or reference ID from the receipt. Should be alphanumeric.'),
  extractedAmount: z.number().optional().describe('The numerical amount of money transferred according to the receipt.'),
  recipientName: z.string().optional().describe('The name of the recipient or beneficiary of the transfer.'),
});
type ReceiptData = z.infer<typeof ReceiptDataSchema>;


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
      return { success: false, message: 'لم يتم العور على مبلغ في الإيصال. الرجاء استخدام إيصال واضح.', transactionId: null, extractedAmount: null };
    }
    if (!aiResponse.recipientName) {
        return { success: false, message: 'لم يتمكن الذكاء الاصطناعي من قراءة اسم المستلم من الإيصال.', transactionId: null, extractedAmount: null };
    }

    // 3. Fetch registered payment methods and validate recipient name
    const paymentMethodsRef = collection(firestore, 'paymentMethods');
    let paymentMethodsSnap;
    try {
        paymentMethodsSnap = await getDocs(paymentMethodsRef);
    } catch (error) {
        // This is a Firestore permission error if it fails.
        const permissionError = new FirestorePermissionError({
            path: 'paymentMethods',
            operation: 'list',
        });
        // We will emit it to be caught by the listener, but also return a friendly error.
        errorEmitter.emit('permission-error', permissionError);
        return { success: false, message: 'حدث خطأ أثناء التحقق من طرق الدفع.', transactionId: null, extractedAmount: null };
    }

    const registeredAccountHolders = paymentMethodsSnap.docs.map(doc => doc.data().accountHolderName as string);
    const isRecipientValid = registeredAccountHolders.some(holderName => 
      aiResponse.recipientName!.toLowerCase().includes(holderName.toLowerCase()) || 
      holderName.toLowerCase().includes(aiResponse.recipientName!.toLowerCase())
    );

    if (!isRecipientValid) {
        return { 
            success: false, 
            message: `اسم المستلم في الإيصال (${aiResponse.recipientName}) لا يطابق أي من حساباتنا المسجلة.`, 
            transactionId: aiResponse.transactionId, 
            extractedAmount: aiResponse.extractedAmount 
        };
    }

    // 4. Check for duplicate transaction ID
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
    
    // 5. All checks passed, proceed with balance update and logging
    const batch = writeBatch(firestore);
    const now = new Date().toISOString();
    const amount = aiResponse.extractedAmount;

    // a. Log the successful deposit request
    const depositRequestRef = doc(collection(firestore, 'depositRequests'));
    const depositRequestData = {
        userId: input.userId,
        userName: input.userName,
        userPhoneNumber: input.userPhoneNumber,
        claimedAmount: input.amount,
        extractedAmount: aiResponse.extractedAmount,
        transactionId: aiResponse.transactionId,
        recipientName: aiResponse.recipientName,
        receiptImageUrl: input.receiptImage, // Save image for auditing
        status: 'completed_auto',
        timestamp: now,
    };
    batch.set(depositRequestRef, depositRequestData);

    // b. Update user's balance
    const userDocRef = doc(firestore, 'users', input.userId);
    batch.update(userDocRef, { balance: increment(amount) });
    
    // c. Create a transaction record for the user
    const userTransactionRef = doc(collection(firestore, `users/${input.userId}/transactions`));
    const transactionData = {
        id: userTransactionRef.id,
        userId: input.userId,
        transactionDate: now,
        amount: amount,
        transactionType: 'تغذية رصيد (آلي)',
        notes: `رقم العملية: ${aiResponse.transactionId}`,
    };
    batch.set(userTransactionRef, transactionData);

    // Commit the batch and handle errors without try/catch
    await batch.commit().catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: '/', // Path is complex for a batch, using root as placeholder
            operation: 'write', 
            requestResourceData: {
                batchOperations: [
                    { path: depositRequestRef.path, data: depositRequestData, operation: 'set' },
                    { path: userDocRef.path, data: { balance: `increment(${amount})` }, operation: 'update' },
                    { path: userTransactionRef.path, data: transactionData, operation: 'set' }
                ]
            },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
        
    return {
        success: true,
        message: 'تمت إضافة المبلغ إلى رصيدك بنجاح.',
        transactionId: aiResponse.transactionId,
        extractedAmount: aiResponse.extractedAmount,
    };
  }
);

// Export a wrapper function for client-side usage
export async function processReceipt(input: ProcessReceiptInput): Promise<ProcessReceiptOutput> {
  return processReceiptFlow(input);
}

    