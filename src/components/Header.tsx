import { Link, useLocation } from "react-router-dom";
import { Landmark, Radio, Wallet, HardHat, Building2, Calendar } from "lucide-react";

export function Header() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Agora", icon: Radio },
    { path: "/local-spend", label: "Dinheiro", icon: Wallet },
    { path: "/projects", label: "Obras", icon: HardHat },
    { path: "/services", label: "Serviços", icon: Building2 },
    { path: "/hearings", label: "Audiências", icon: Calendar },
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <Landmark className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-base md:text-lg text-foreground leading-tight">
                BH Transparente
              </h1>
              <p className="text-xs text-muted-foreground">Protótipo</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
