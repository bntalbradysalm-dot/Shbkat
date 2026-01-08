'use client';

import React, { useState, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Gamepad2 } from 'lucide-react';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';

type GameCard = {
  cardName: string;
  cardPrice: string;
  cardId: string;
};

type Game = {
  gameName: string;
  gameId: string;
  gameImg: string;
  cards: GameCard[];
};

type ApiResponse = {
    games: Game[];
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/games');
        const data: ApiResponse = await response.json();
        if (!response.ok) {
          throw new Error((data as any).message || 'Failed to fetch games data');
        }
        setGames(data.games || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGames();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
                <CardHeader className="flex flex-row items-center gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
            </Card>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">حدث خطأ</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      );
    }
    
    if (games.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-64">
            <Gamepad2 className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">لا توجد ألعاب متاحة</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                لا تتوفر أي بطاقات ألعاب في الوقت الحالي.
            </p>
        </div>
      );
    }

    return (
        <Accordion type="single" collapsible className="w-full space-y-3">
            {games.map(game => (
                <AccordionItem value={game.gameId} key={game.gameId} className="border bg-card rounded-lg overflow-hidden">
                    <AccordionTrigger className="p-3 hover:no-underline">
                       <div className="flex items-center gap-4">
                            <Image src={game.gameImg} alt={game.gameName} width={48} height={48} className="rounded-lg object-cover" />
                            <h3 className="text-lg font-bold">{game.gameName}</h3>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t px-3 pb-3">
                        <div className="pt-3 space-y-2">
                           {game.cards.map(card => (
                               <Card key={card.cardId} className="bg-muted/50">
                                   <CardContent className="p-3 flex justify-between items-center">
                                       <span className="font-semibold text-sm">{card.cardName}</span>
                                       <Button size="sm">{card.cardPrice} ريال</Button>
                                   </CardContent>
                               </Card>
                           ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="معرض الألعاب" />
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
