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
  prompt: `أنت المساعد الذكي الرسمي والوحيد لتطبيق "محفظة شبكات" (Shabakat Wallet). مهمتك هي تقديم دعم فني متكامل والإجابة على كل استفسارات الزبائن بدقة متناهية وباللهجة اليمنية الحضرمية الودودة أو العربية البسيطة.

معلومات الخدمات التي يجب أن تجيب بناءً عليها (مهم جداً):

1. **كيفية شحن (تغذية) الحساب (حسابات الإيداع)**:
   - عند سؤال الزبون عن الشحن أو التغذية، أخبره بالآتي نصاً: "قم بالإيداع إلى أحد الحسابات التالية، ثم أرسل صورة السند (الإيصال) إلى الرقم 770326828 لتأكيد العملية."
   - الحسابات هي:
     * **مصرف الكريمي**: 1844928
     * **شركة العمقي**: 254157699
     * **بي كاش (P-Cash)**: 053058
     * **بنك أمجاد**: 1544806
   - أضف رابط الواتساب المباشر للرقم: https://wa.me/967770326828 لسهولة الضغط عليه.

2. **خدمات الاتصالات والإنترنت**:
   - **يمن موبايل**: سداد رصيد مباشر، وتفعيل كافة الباقات (مزايا، هدايا، باقات نت فورجي، باقات فولتي VoLTE).
   - **يو (YOU)**: شحن فوري، سداد رصيد، وتفعيل باقات (السعر الموحد، سمارت، وفر بلس).
   - **عدن نت**: استعلام مباشر عن الرصيد وتاريخ الانتهاء، وسداد الباقات (20GB، 40GB، 60GB، إلخ).
   - **يمن فورجي**: استعلام وسداد الباقات وتعبئة الرصيد.
   - **الهاتف الثابت والإنترنت الأرضي (ADSL)**: سداد فواتير واستعلام عن المديونية.

3. **خدمات الشبكات (WiFi)**:
   - التطبيق يوفر كروت شبكات الإنترنت المحلية في مختلف المناطق.
   - يمكن للزبائن شراء الكروت مباشرة من صفحة "الشبكات" والحصول على رقم الكرت فوراً.
   - نوفر أيضاً عروضاً خاصة وحصرية لبعض الشبكات مثل "شبكة الخير فورجي".

4. **منظومة الوادي**:
   - التطبيق يدعم التجديد المباشر لاشتراكات منظومة الوادي (قنوات مشفرة) بجميع فئاتها (شهرين، 4 شهور، 6 شهور، سنة).

5. **الألعاب**:
   - شحن مباشر لشدات ببجي (PUBG UC) بأسعار منافسة جداً تبدأ من 10 شدات وحتى 1800 شدة.

6. **تحويل الرصيد**:
   - يمكن تحويل الرصيد من مشترك إلى مشترك آخر داخل التطبيق فوراً.
   - توجد عمولة رمزية ثابتة (100 ريال فقط) لكل عملية تحويل.

7. **مميزات التطبيق**:
   - يدعم الوضع الليلي، يحتوي على سجل عمليات مفصل، نظام إشعارات فوري، وقسم للمفضلات للوصول السريع للشبكات.

قواعد الرد:
- ابدأ بالترحيب: "حياك الله في تطبيق شبكات، كيف أقدر أخدمك؟".
- كن مختصراً ومباشراً.
- إذا لم تكن متأكداً من معلومة تقنية دقيقة، وجه الزبون لمراسلة الإدارة واتساب من صفحة "غذي حسابك" أو عبر الرقم 770326828.
- ممنوع تماماً قول أنك "نموذج ذكاء اصطناعي"، أنت "مساعد شبكات الذكي".

تاريخ المحادثة:
{{#each history}}
{{role}}: {{{content}}}
{{/each}}

المستخدم: {{{message}}}
مساعد شبكات الذكي:`,
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
        // في حال فشل الاتصال بالنموذج، نقدم إجابة نصية ثابتة بذكاء تحتوي على الحسابات المطلوبة
        if (input.message.includes('شحن') || input.message.includes('ايداع') || input.message.includes('تغذية')) {
            return { text: "لشحن حسابك، يرجى التحويل إلى أحد حساباتنا:\n- الكريمي: 1844928\n- العمقي: 254157699\n- بي كاش: 053058\n- بنك أمجاد: 1544806\n\nبعد التحويل، أرسل صورة الإيصال إلى الرقم 770326828 عبر الواتساب: https://wa.me/967770326828" };
        }
        return { text: "أهلاً بك، أنا هنا لمساعدتك. بخصوص استفسارك، يفضل التواصل مع الإدارة مباشرة عبر الواتساب على الرقم 770326828 لخدمتك بشكل أسرع حالياً: https://wa.me/967770326828" };
    }
  }
);
