import { Settings2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NeighborhoodSelector } from "@/components/NeighborhoodSelector";
import { TopicSelector } from "@/components/TopicSelector";
import { cn } from "@/lib/utils";

interface MakeItYoursProps {
  neighborhoods: string[];
  topics: string[];
  suggestedTopics: string[];
  selectedNeighborhood: string | null;
  followedTopics: string[];
  onNeighborhoodChange: (neighborhood: string | null) => void;
  onTopicToggle: (topic: string) => void;
  onReset: () => void;
  className?: string;
}

export function MakeItYours({
  neighborhoods,
  topics,
  suggestedTopics,
  selectedNeighborhood,
  followedTopics,
  onNeighborhoodChange,
  onTopicToggle,
  onReset,
  className,
}: MakeItYoursProps) {
  const hasPreferences = selectedNeighborhood !== null || followedTopics.length > 0;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Settings2 size={24} className="text-primary" />
          Personalize
        </h2>

        {hasPreferences && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-muted-foreground gap-1.5"
          >
            <RotateCcw size={14} />
            Limpar preferências
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Escolha seu bairro e siga tópicos para ver o que é mais relevante para você
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <NeighborhoodSelector
            neighborhoods={neighborhoods}
            selected={selectedNeighborhood}
            onChange={onNeighborhoodChange}
          />

          <TopicSelector
            topics={topics}
            suggestedTopics={suggestedTopics}
            followedTopics={followedTopics}
            onToggle={onTopicToggle}
          />
        </CardContent>
      </Card>
    </section>
  );
}
