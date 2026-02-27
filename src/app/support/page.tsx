'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  Sparkles,
  MessageCircleQuestion,
  Eraser
} from 'lucide-react';
import { supportChat } from '@/ai/flows/support-chat-flow';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

type Message = {
  role: 'user' | 'model';
  content: string;
};

export default function SupportChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInput) = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  useEffect(() => {
    // Welcome message
    if (messages.length === 0) {
        setMessages([
            { role: 'model', content: `مرحباً بك يا ${user?.displayName || 'عزيزنا العميل'}! أنا المساعد الذكي لمُحفظة شبكات. كيف يمكنني مساعدتك اليوم بخصوص خدماتنا؟` }
        ]);
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await supportChat({
        message: userMessage,
        history: messages,
      });
      
      setMessages(prev => [...prev, { role: 'model', content: response.text }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([{ role: 'model', content: `مرحباً بك مجدداً! تم مسح المحادثة السابقة. كيف يمكنني مساعدتك الآن؟` }]);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="الدعم الفني الذكي" />
      
      {/* AI Intro Card */}
      <div className="px-4 pt-2">
        <Card className="bg-mesh-gradient border-none rounded-[28px] shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5 flex items-center gap-4 relative z-10">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
                    <Bot className="h-8 w-8 text-white" />
                </div>
                <div className="text-right">
                    <h2 className="text-white font-black text-base">مساعد شبكات الذكي</h2>
                    <p className="text-white/70 text-[10px] font-bold">اسألني عن الرصيد، الباقات، أو كيفية شحن حسابك</p>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mr-auto text-white/50 hover:text-white hover:bg-white/10 rounded-full"
                    onClick={handleClearChat}
                    title="مسح المحادثة"
                >
                    <Eraser size={18} />
                </Button>
            </CardContent>
        </Card>
      </div>

      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 mt-2"
      >
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={cn(
              "flex w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
              msg.role === 'user' ? "justify-start" : "justify-end"
            )}
          >
            <div className={cn(
              "max-w-[85%] p-4 rounded-[24px] shadow-sm text-sm font-bold leading-relaxed",
              msg.role === 'user' 
                ? "bg-primary text-white rounded-br-none" 
                : "bg-muted text-foreground rounded-bl-none border border-border/50"
            )}>
              <div className="flex items-center gap-2 mb-1 opacity-50">
                {msg.role === 'user' ? (
                    <><UserIcon size={12} /> <span className="text-[10px]">أنت</span></>
                ) : (
                    <><Bot size={12} /> <span className="text-[10px]">مساعد شبكات</span></>
                )}
              </div>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-end w-full animate-pulse">
            <div className="bg-muted p-4 rounded-[24px] rounded-bl-none border border-border/50">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t">
        <div className="relative flex items-center gap-2 max-w-md mx-auto">
          <Input 
            value={inputValue}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="اكتب سؤالك هنا..."
            className="flex-1 h-12 rounded-2xl pr-4 pl-12 bg-muted/50 border-none focus-visible:ring-primary font-bold text-sm"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="absolute left-1.5 h-9 w-9 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rotate-180" />}
          </Button>
        </div>
        <p className="text-[9px] text-center text-muted-foreground mt-3 font-bold opacity-50">المساعد الذكي قد يخطئ أحياناً، نرجو التأكد من المعلومات الرسمية.</p>
      </div>
    </div>
  );
}
