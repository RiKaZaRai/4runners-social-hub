'use client';

import { Link2, FileText, Star, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WikiHome } from './wiki-data';

interface WikiHomeViewProps {
  home: WikiHome;
  onOpen: (id: string) => void;
}

export function WikiHomeView({ home, onOpen }: WikiHomeViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{home.title}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {home.description}
        </p>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {home.quickLinks.map((link) => (
          <Button
            key={link.to}
            variant="outline"
            onClick={() => onOpen(link.to)}
          >
            <Link2 className="mr-2 h-4 w-4" />
            {link.label}
          </Button>
        ))}
      </div>

      {/* Popular & Recent */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Popular */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">Populaires</CardTitle>
            <Badge variant="default">
              <Star className="mr-1 h-3 w-3" />
              Top consultés
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {home.popular.map((item) => (
              <button
                key={item.to}
                onClick={() => onOpen(item.to)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Recent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">Récents</CardTitle>
            <Badge variant="default">
              <Clock className="mr-1 h-3 w-3" />
              Dernières lectures
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {home.recent.map((item) => (
              <button
                key={item.to}
                onClick={() => onOpen(item.to)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{item.title}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
