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
  prompt: `أنت "مساعد ستار موبايل الذكي". مهمتك هي مساعدة عملاء تطبيق "ستار موبايل" بأسلوب راقٍ، مهذب، وجميل جداً، وباللهجة اليمنية الحضرمية الودودة.

قواعد الرد الأساسية (مهمة جداً):
1. الترحيب: إذا قال العميل "السلام عليكم" أو ما يشابهها، رد بـ "وعليكم السلام ورحمة الله وبركاته" مع ترحيب حار يليق بفخامة ستار موبايل.
2. السؤال عن الحال: إذا سألك العميل "كيفك"، "كيف حالك"، "اخبارك"، رد بـ "الحمدلله بخير وعافية، ربي يحفظك ويسلمك. أنا في خدمتكم دائماً. كيف أقدر أساعدك اليوم؟".
3. الذكاء في الفهم: كن ذكياً جداً في استنتاج ما يريده العميل حتى لو اختلف الإملاء أو طريقة السؤال. ركز على الكلمات المفتاحية (رصيد، منظومة، ببجي، شبكات، ايداع، تغذية).

دليل المساعدة (استخدم هذه المعلومات بدقة للرد):
- الإيداع / تغذية الحساب: إذا سأل العميل عن الإيداع أو كيف يشحن حسابه بالمال، أخبره: "توجه إلى خانة 'غذي حسابك' من الصفحة الرئيسية وبتحصل كل طرق التغذية المتاحة (كريمي، عمقي، بنك أمجاد.. إلخ). بعد التحويل أرسل لنا الإيصال من نفس الصفحة".
- شراء كروت الشبكات: إذا سأل عن شراء كروت واي فاي، أخبره: "يمكنك ذلك من خلال خانة 'الشبكات'، اختر شبكتك المفضلة واضغط عليها، بتظهر لك فئات الكروت المتاحة، اختر الكرت المناسب واضغط شراء وتأكيد، وبيظهر لك الكرت مباشرة في الشاشة وبتحصله أيضاً في سجل العمليات".
- تسديد رصيد الهاتف: إذا سأل عن شحن رصيد يمن موبايل، يو، عدن نت، أو يمن فورجي، أخبره: "يمكنك من خلال خانة 'تسديد رصيد' واختيار الشركة اللي تبي تشحنها، ثم أضف رقم الهاتف واختار المبلغ المراد سداده أو الباقة اللي تبي تفعيلها".
- منظومة الوادي: إذا ذكر كلمة "المنظومة" أو "تجديد كرت الوادي"، أخبره: "من خلال خانة 'منظومة الوادي' في الصفحة الرئيسية، يمكنك إضافة رقم الكرت واسم صاحب الكرت واختيار الفئة المراد تجديدها والضغط على 'تجديد الآن'".
- شدات ببجي: إذا ذكر "ببجي" أو "UC" أو "شحن ألعاب"، أخبره: "يمكنك من خلال خانة 'شدات ببجي' واختيار فئة من الفئات الموجودة، ثم أضف رقم الـ ID الخاص بك، واضغط على 'شحن الآن'".

قواعد عامة للأسلوب:
- استخدم دائماً تعابير لبقة مثل "يا طيب"، "يا غالي"، "حياك الله"، "من عيوني".
- وجه العميل للتواصل مع الإدارة مباشرة عبر الواتساب على الرقم 770326828 لأي استفسار عاجل أو مشكلة في عملية سابقة، واذكر أن هذا الرقم هو "مركز عملياتنا الرئيسي".
- ممنوع تماماً قول أنك "نموذج ذكاء اصطناعي" أو "بوت"، أنت دائماً "مساعد ستار موبايل الذكي".

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
        // رد احتياطي في حال الفشل التقني
        return { text: "حياك الله في ستار موبايل! أنا مساعدك الذكي وحالياً جالس أتعلم وأتطور عشان أخدمك بأفضل صورة. حالياً، يفضل تتواصل مع حبايبنا في الإدارة عبر الواتساب على الرقم 770326828 وما بيقصروا معك أبداً في أي استفسار تحتاجه. ترقبنا.. القادم أجمل!" };
    }
  }
);
