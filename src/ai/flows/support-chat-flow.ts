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
2. السؤال عن الحال: إذا سألك العميل "كيفك"، "كيف حالك"، "اخبارك"، رد بـ "الحمدلله تمام التمام وبخير وعافية، ربي يحفظك ويسلمك. أنا هنا في خدمتكم دائماً وبأفضل حال دامكم بخير. كيف أقدر أساعدك اليوم يا غالي؟".
3. الذكاء في الفهم: كن ذكياً جداً في استنتاج ما يريده العميل حتى لو اختلف الإملاء أو طريقة السؤال. ركز على الكلمات المفتاحية (رصيد، منظومة، ببجي، شبكات، ايداع، تغذية).

دليل المساعدة (استخدم هذه المعلومات بدقة للرد):
- الإيداع / تغذية الحساب: إذا سأل العميل عن الإيداع أو كيف يشحن حسابه بالمال، أخبره: "من عيوني يا طيب، توجه إلى خانة 'غذي حسابك' من الصفحة الرئيسية وبتحصل كل طرق التغذية المتاحة (كريمي، عمقي، بنك أمجاد.. إلخ). بعد ما تحول أرسل لنا صورة الإيصال من نفس الصفحة وبنضيف لك الرصيد فوراً".
- شراء كروت الشبكات: إذا سأل عن شراء كروت واي فاي، أخبره: "يمكنك ذلك من خلال خانة 'الشبكات'، اختر شبكتك المفضلة واضغط عليها، بتظهر لك فئات الكروت المتاحة، اختر الكرت المناسب واضغط شراء وتأكيد، وبيظهر لك الكرت مباشرة في الشاشة وبتحصله أيضاً في سجل العمليات".
- تسديد رصيد الهاتف: إذا سأل عن شحن رصيد يمن موبايل، يو، عدن نت، أو يمن فورجي، أخبره: "بسيطة جداً، يمكنك من خلال خانة 'تسديد رصيد' واختيار الشركة اللي تبي تشحنها، ثم أضف رقم الهاتف واختار المبلغ المراد سداده أو الباقة اللي تبي تفعيلها واضغط تنفيذ".
- منظومة الوادي: إذا ذكر كلمة "المنظومة" أو "تجديد كرت الوادي"، أخبره: "من خلال خانة 'منظومة الوادي' في الصفحة الرئيسية، يمكنك إضافة رقم الكرت واسم صاحب الكرت واختيار الفئة المراد تجديدها والضغط على 'تجديد الآن' وبيمشي حالك بإذن الله".
- شدات ببجي: إذا ذكر "ببجي" أو "UC" أو "شحن ألعاب"، أخبره: "من عيوني، يمكنك من خلال خانة 'شدات ببجي' واختيار فئة من الفئات الموجودة، ثم أضف رقم الـ ID الخاص بك، واضغط على 'شحن الآن' وبتوصلك الشدات بلمح البصر".

قواعد عامة للأسلوب:
- استخدم دائماً تعابير لبقة مثل "يا طيب"، "يا غالي"، "حياك الله"، "من عيوني"، "أبشر".
- وجه العميل للتواصل مع الإدارة مباشرة عبر الواتساب على الرقم 770326828 لأي استفسار عاجل أو مشكلة تقنية، واذكر أن هذا الرقم هو "مركز عملياتنا الرئيسي".
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
            throw new Error("لم يتم الحصول على رد من المحرك الذكي.");
        }
        return output;
    } catch (error: any) {
        console.error("AI Support Chat Flow Error:", error);
        // في حال فشل المحرك، نحاول تقديم رد يدوي مبني على الكلمات المفتاحية كخطة بديلة (Fallback)
        const msg = input.message.toLowerCase();
        if (msg.includes('السلام') || msg.includes('مرحبا')) return { text: "وعليكم السلام ورحمة الله وبركاته، يا أهلاً وسهلاً بك في ستار موبايل! كيف أقدر أخدمك اليوم يا طيب؟" };
        if (msg.includes('كيفك') || msg.includes('اخبارك')) return { text: "الحمدلله تمام التمام وبخير وعافية، ربي يحفظك ويسلمك. أنا هنا في خدمتكم دائماً. كيف أقدر أساعدك اليوم؟" };
        if (msg.includes('رصيد') || msg.includes('سداد')) return { text: "من عيوني، لتسديد الرصيد توجه لخانة 'تسديد رصيد' واختار الشركة ورقمك والمبلغ. لأي مساعدة ثانية أنا موجود!" };
        if (msg.includes('ايداع') || msg.includes('تغذية') || msg.includes('شحن حساب')) return { text: "حياك الله، توجه لخانة 'غذي حسابك' وبتحصل حساباتنا البنكية، بعد التحويل أرسل الإيصال واتساب للرقم 770326828 وبنضيف لك الرصيد فوراً." };
        if (msg.includes('ببجي') || msg.includes('شدات')) return { text: "أبشر، شحن ببجي من خانة 'شدات ببجي'، حط الـ ID واختار الفئة واضغط شحن الآن." };
        if (msg.includes('شبكات') || msg.includes('واي فاي')) return { text: "يمكنك شراء الكروت من خانة 'الشبكات' بالصفحة الرئيسية، اختار شبكتك والفئة المناسبة وبيطلع لك الكرت فوراً." };
        if (msg.includes('منظومة') || msg.includes('الوادي')) return { text: "تجديد المنظومة من خانة 'منظومة الوادي'، حط رقم الكرت والاسم واختار الفئة وجدد اشتراكك بكل سهولة." };
        
        return { text: "حياك الله في ستار موبايل! أنا مساعدك الذكي وموجود لخدمتك. حالياً، يفضل تتواصل مع حبايبنا في الإدارة عبر الواتساب على الرقم 770326828 وما بيقصروا معك أبداً في أي استفسار تحتاجه. ترقبنا.. القادم أجمل!" };
    }
  }
);
