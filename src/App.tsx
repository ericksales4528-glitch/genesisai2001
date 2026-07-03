import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import MeusSites from "./pages/MeusSites.tsx";
import NotFound from "./pages/NotFound.tsx";
import SitePublico from "./pages/SitePublico.tsx";
import CloudflareCode from "./pages/CloudflareCode.tsx";
import { CompanyData } from "@/lib/siteTemplate";

const queryClient = new QueryClient();

function AppNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isGerar = location.pathname === "/" || location.pathname === "/index";
  const isMeus = location.pathname === "/meus-sites";
  const isCode = location.pathname === "/cloudflare-code";

  const handleEdit = (data: CompanyData, siteId: string, projectName: string | null) => {
    navigate("/", { state: { data, siteId, projectName } });
  };

  return (
    <>
      <nav className="sticky top-4 z-50 mx-auto mt-4 flex max-w-[1440px] items-center justify-between rounded-3xl border border-border/60 bg-card/60 p-3 px-4 backdrop-blur-xl md:mt-6 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-plasma)] shadow-[var(--shadow-glow)]">
            <div className="h-4 w-4 rotate-45 rounded-sm bg-background" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold text-foreground">
              GENESIS <span className="text-accent">AI</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">gerador neural</span>
          </div>
        </div>

        <div className="hidden rounded-2xl border border-border/60 bg-background/40 p-1.5 md:flex">
          {[
            { key: "gerar", label: "Gerar Site", active: isGerar, to: "/" },
            { key: "meus", label: "Meus Sites", active: isMeus, to: "/meus-sites" },
            { key: "code", label: "Código Cloudflare", active: isCode, to: "/cloudflare-code" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(t.to)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition-all ${
                t.active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-plasma)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 md:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">beta online</span>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/index" element={<Index />} />
        <Route path="/meus-sites" element={<MeusSites onEdit={handleEdit} />} />
        <Route path="/cloudflare-code" element={<CloudflareCode />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function RootRouter() {
  const location = useLocation();
  if (location.pathname.startsWith("/s/")) {
    return (
      <Routes>
        <Route path="/s/:slug" element={<SitePublico />} />
      </Routes>
    );
  }
  return <AppNav />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RootRouter />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
