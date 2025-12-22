import { Volume2, VolumeX } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ListenButtonProps {
  text: string;
}

export function ListenButton({ text }: ListenButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }, [text, isSpeaking]);

  return (
    <Button
      onClick={handleSpeak}
      variant="outline"
      size="lg"
      className="gap-2 rounded-xl border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
    >
      {isSpeaking ? (
        <>
          <VolumeX className="w-5 h-5" />
          <span>Parar</span>
        </>
      ) : (
        <>
          <Volume2 className="w-5 h-5" />
          <span>Ouvir Resumo</span>
        </>
      )}
    </Button>
  );
}
