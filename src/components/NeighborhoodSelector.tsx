import { useState } from "react";
import { MapPin, Search, X, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NeighborhoodSelectorProps {
  neighborhoods: string[];
  selected: string | null;
  onChange: (neighborhood: string | null) => void;
  className?: string;
}

export function NeighborhoodSelector({
  neighborhoods,
  selected,
  onChange,
  className,
}: NeighborhoodSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredNeighborhoods = neighborhoods.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (neighborhood: string | null) => {
    onChange(neighborhood);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-sm font-medium flex items-center gap-2">
        <MapPin size={16} className="text-primary" />
        Seu bairro
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between h-10 px-3"
          >
            <span className="flex items-center gap-2 truncate">
              {selected ? (
                <>
                  <MapPin size={14} />
                  {selected}
                </>
              ) : (
                <>
                  <Globe size={14} />
                  Toda a cidade
                </>
              )}
            </span>
            {selected && (
              <X
                size={14}
                className="ml-2 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(null);
                }}
              />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2">
              <Search size={16} className="text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar bairro..."
                className="border-0 h-8 p-0 focus-visible:ring-0"
              />
            </div>
          </div>

          <ScrollArea className="h-[200px]">
            <div className="p-1">
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                  selected === null && "bg-primary/10 text-primary"
                )}
              >
                <Globe size={14} />
                <span className="flex-1 text-left">Toda a cidade</span>
                {selected === null && <Check size={14} />}
              </button>

              {filteredNeighborhoods.map((neighborhood) => (
                <button
                  key={neighborhood}
                  onClick={() => handleSelect(neighborhood)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                    selected === neighborhood && "bg-primary/10 text-primary"
                  )}
                >
                  <MapPin size={14} />
                  <span className="flex-1 text-left">{neighborhood}</span>
                  {selected === neighborhood && <Check size={14} />}
                </button>
              ))}

              {filteredNeighborhoods.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhum bairro encontrado
                </p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
