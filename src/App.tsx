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
      <nav className="bg-card border-b border-border">
        <div className="mx-auto max-w-[1440px] flex items-center gap-1 px-4 md:px-8">
          <span className="font-display text-sm font-bold text-foreground mr-4 py-3">Nexus</span>
          <button
            onClick={() => navigate("/")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isGerar ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🛠 Gerar Site
          </button>
          <button
            onClick={() => navigate("/meus-sites")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isMeus ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📁 Meus Sites
          </button>
          <button
            onClick={() => navigate("/cloudflare-code")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isCode ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            ☁️ Código Cloudflare
          </button>
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
