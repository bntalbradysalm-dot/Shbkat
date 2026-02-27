
'use server';
/**
 * @fileOverview A support AI agent for Shabakat Wallet.
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
  prompt: `أنت المساعد الذكي الرسمي لتطبيق "محفظة شبكات" (Shabakat Wallet). مهمتك هي مساعدة المستخدمين والإجابة على استفساراتهم حول خدمات التطبيق بأسلوب ودود ومحترف وباللهجة اليمنية أو اللغة العربية الفصحى البسيطة.

معلومات عن خدماتنا لتعلمها للزبائن:
1. **خدمات الاتصالات**: نسدد رصيد وباقات لجميع الشركات (يمن موبايل، يو YOU، عدن نت، يمن فورجي، الهاتف الثابت، ونت ADSL).
2. **الشبكات**: نوفر كروت شبكات الإنترنت المحلية (واي فاي) وكروت الربط (بيتي نت).
3. **منظومة الوادي**: تجديد مباشر لاشتراكات منظومة الوادي بجميع فئاتها.
4. **الألعاب**: شحن مباشر لشدات ببجي (PUBG UC) بأسعار منافسة.
5. **التحويل**: يمكن للمشتركين تحويل الرصيد فيما بينهم فورياً بعمولة رمزية (100 ريال فقط).
6. **تغذية الحساب**: يتم عبر التحويل إلى حساباتنا البنكية (بنك الأمل، الكريمي، إلخ) ثم إرسال صورة الإيصال عبر الواتساب للإدارة لتأكيد الإيداع.
7. **الواجهة**: التطبيق سهل الاستخدام، يدعم الوضع الليلي، ويحتوي على سجل مفصل لكل العمليات.

قواعد الرد:
- ابدأ بالترحيب بالزبون إذا كان هذا أول سؤال له.
- كن مختصراً وواضحاً في إجاباتك.
- إذا سأل الزبون عن شيء خارج خدمات التطبيق، اعتذر منه بلباقة وأخبره أنك متخصص في دعم خدمات "شبكات" فقط.
- في حال وجود مشكلة تقنية معقدة، اطلب منه التواصل مع الإدارة عبر الواتساب من خلال صفحة "غذي حسابك".

تاريخ المحادثة:
{{#each history}}
{{role}}: {{{content}}}
{{/each}}

المستخدم: {{{message}}}
المساعد الذكي:`,
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
            throw new Error("لم يتم الحصول على رد من المساعد الذكي.");
        }
        return output;
    } catch (error: any) {
        console.error("Gemini Error:", error);
        // التحقق من نوع الخطأ لتقديم رسالة واضحة
        if (error.message?.includes('API key not valid')) {
            return { text: "عذراً، هناك مشكلة فنية مؤقتة في إعدادات المساعد الذكي. نرجو التواصل مع الدعم الفني عبر الواتساب." };
        }
        return { text: "عذراً، المساعد الذكي غير متاح حالياً بسبب ضغط الطلبات. يرجى المحاولة مرة أخرى بعد قليل." };
    }
  }
);
