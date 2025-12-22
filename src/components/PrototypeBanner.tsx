import { AlertTriangle } from "lucide-react";

export function PrototypeBanner() {
  return (
    <div className="prototype-banner flex items-start gap-3 animate-fade-in">
      <AlertTriangle className="w-5 h-5 text-status-yellow flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold text-sm">Modo Protótipo</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Os valores exibidos são exemplos ilustrativos, não dados reais.
          Este protótipo demonstra como dados públicos oficiais poderiam ser visualizados.
        </p>
      </div>
    </div>
  );
}
