import { useState } from "react";
import { Tag, Search, Plus, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TopicSelectorProps {
  topics: string[];
  suggestedTopics: string[];
  followedTopics: string[];
  onToggle: (topic: string) => void;
  className?: string;
}

export function TopicSelector({
  topics,
  suggestedTopics,
  followedTopics,
  onToggle,
  className,
}: TopicSelectorProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredTopics = topics.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const isFollowed = (topic: string) => followedTopics.includes(topic);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Tag size={16} className="text-primary" />
        Tópicos que você segue
      </label>

      {followedTopics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {followedTopics.map((topic) => (
            <Badge
              key={topic}
              variant="default"
              className="gap-1.5 cursor-pointer hover:bg-primary/80 pr-1.5"
              onClick={() => onToggle(topic)}
            >
              <Check size={12} />
              {topic}
              <X size={12} className="ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {suggestedTopics.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles size={12} />
            Sugestões baseadas no que está acontecendo
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedTopics
              .filter((t) => !isFollowed(t))
              .map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className="gap-1.5 cursor-pointer hover:bg-primary/10 border-dashed"
                  onClick={() => onToggle(topic)}
                >
                  <Plus size={12} />
                  {topic}
                </Badge>
              ))}
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAll(!showAll)}
        className="w-fit text-xs"
      >
        {showAll ? "Esconder lista completa" : "Ver todos os tópicos"}
      </Button>

      {showAll && (
        <div className="space-y-2 border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tópicos..."
              className="h-8"
            />
          </div>

          <ScrollArea className="h-[150px]">
            <div className="flex flex-wrap gap-2 p-1">
              {filteredTopics.map((topic) => {
                const followed = isFollowed(topic);
                return (
                  <Badge
                    key={topic}
                    variant={followed ? "default" : "outline"}
                    className={cn(
                      "gap-1.5 cursor-pointer transition-colors",
                      followed
                        ? "hover:bg-primary/80"
                        : "hover:bg-primary/10"
                    )}
                    onClick={() => onToggle(topic)}
                  >
                    {followed ? <Check size={12} /> : <Plus size={12} />}
                    {topic}
                  </Badge>
                );
              })}

              {filteredTopics.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4 w-full">
                  Nenhum tópico encontrado
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
