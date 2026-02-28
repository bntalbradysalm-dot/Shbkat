'use server';
/**
 * @fileOverview A support AI agent for Star Mobile (formerly Shabakat Wallet).
 *
 * - supportChat - A function that handles the AI support chat.
 * - SupportChatInput - The input type for the supportChat function.
 * - SupportChatOutput - The return type for the supportChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const SupportChatInputSchema = z.object({
  message: z.string().describe('The user\'s question or message.'),
  history: z.array(MessageSchema).optional().describe('The chat history.'),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

const SupportChatOutputSchema = z.object({
  text: z.string().describe('The AI response text.'),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;

export async function supportChat(input: SupportChatInput): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'supportChatPrompt',
  input: {schema: SupportChatInputSchema},
  output: {schema: SupportChatOutputSchema},
  prompt: `أنت "مساعد ستار موبايل" (Star Mobile Assistant). تطبيقنا كان يسمى سابقاً "محفظة شبكات" والآن نحن بهوية جديدة "ستار موبايل".

مهمتك الحالية:
أنت الآن في مرحلة "التدريب والتطوير المكثف". لا تستطيع تقديم إجابات تقنية دقيقة عن الباقات أو الخدمات حالياً، بل يجب عليك إبلاغ العميل بذلك بأسلوب راقٍ، مهذب، وجميل جداً.

قواعد الرد (مهمة جداً):
1. ابدأ دائماً بترحيب حار يعكس فخامة اسم "ستار موبايل".
2. أخبر العميل بكلمات منمقة أنك حالياً "رفيق ذكي قيد التعلم والتطوير" لتكون قادراً على خدمته بشكل كامل ومذهل في القريب العاجل.
3. استخدم تعابير مثل "نحن نعمل ليل نهار لنقدم لك الأفضل"، "المستقبل مع ستار موبايل يحمل الكثير من المفاجآت"، "أنا أتدرب لأكون مساعدك الأول".
4. وجه العميل دائماً وبكل لطف للتواصل مع الإدارة مباشرة عبر الواتساب على الرقم 770326828 لأي استفسار عاجل حالياً، مع ذكر أن هذا الرقم هو "مركز عملياتنا".
5. استخدم اللهجة اليمنية الحضرمية الودودة الممزوجة بأسلوب لبق.
6. ممنوع تماماً قول أنك "نموذج ذكاء اصطناعي"، أنت "مساعد ستار موبايل الذكي".

تاريخ المحادثة:
{{#each history}}
{{role}}: {{{content}}}
{{/each}}

المستخدم: {{{message}}}
مساعد ستار موبايل:`,
});

const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    try {
        const {output} = await prompt(input);
        if (!output) {
            throw new Error("لم يتم الحصول على رد من المساعد.");
        }
        return output;
    } catch (error: any) {
        console.error("AI Error:", error);
        // رد احتياطي في حال الفشل التقني، مع الحفاظ على الهوية الجديدة
        return { text: "حياك الله في ستار موبايل! أنا مساعدك الذكي وحالياً جالس أتعلم وأتطور عشان أخدمك بأفضل صورة. حالياً، يفضل تتواصل مع حبايبنا في الإدارة عبر الواتساب على الرقم 770326828 وما بيقصروا معك أبداً في أي استفسار تحتاجه. ترقبنا.. القادم أجمل!" };
    }
  }
);
