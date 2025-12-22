import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { formatMoney } from "@/utils/formatters";
import { Sparkles } from "lucide-react";

interface ScenarioSimulatorProps {
  categoryTotal: number;
  categoryName: string;
  delay?: number;
}

export function ScenarioSimulator({ 
  categoryTotal, 
  categoryName,
  delay = 0 
}: ScenarioSimulatorProps) {
  const [shiftPercent, setShiftPercent] = useState([10]);

  const deltaLocalMoney = (categoryTotal * shiftPercent[0]) / 100;

  return (
    <div 
      className="card-civic bg-accent opacity-0 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">
            Simulador de Cenário
          </h3>
          <p className="text-sm text-muted-foreground">
            E se comprássemos mais localmente?
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              Categoria: {categoryName}
            </span>
            <span className="text-lg font-bold text-primary">
              +{shiftPercent[0]}% local
            </span>
          </div>
          
          <Slider
            value={shiftPercent}
            onValueChange={setShiftPercent}
            max={20}
            min={0}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">0%</span>
            <span className="text-xs text-muted-foreground">20%</span>
          </div>
        </div>

        {/* Result */}
        <div className="p-4 rounded-xl bg-status-green-bg border border-status-green/20">
          <p className="text-sm text-foreground leading-relaxed">
            Se <strong>{shiftPercent[0]}%</strong> das compras de{" "}
            <strong>{categoryName}</strong> fossem de fornecedores locais:
          </p>
          <p className="stat-number text-status-green mt-2">
            +{formatMoney(deltaLocalMoney, true)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ficariam na economia de BH
          </p>
        </div>

        <p className="text-xs text-muted-foreground italic">
          ⚠️ Cálculo ilustrativo e linear, não uma previsão econômica real.
        </p>
      </div>
    </div>
  );
}
