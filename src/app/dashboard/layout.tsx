"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Bike, 
  BarChart3, 
  UtensilsCrossed, 
  Package,
  Settings, 
  LogOut,
  Pizza,
  Menu, 
  X,
  Bot // <--- Ícone do robô adicionado
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- LISTA DE MENUS ATUALIZADA ---
const navigation = [
  { name: 'Cozinha', href: '/dashboard', icon: LayoutDashboard },
  { name: 'PDV', href: '/dashboard/caixa', icon: ShoppingCart },
  { name: 'Cardápio', href: '/dashboard/cardapio', icon: UtensilsCrossed },
  { name: 'Estoque', href: '/dashboard/estoque', icon: Package },
  { name: 'Entregadores', href: '/dashboard/motoboys', icon: Bike },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { name: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3 },
  { name: 'Agente IA', href: '/dashboard/agente-ia', icon: Bot }, // <--- Novo Menu Adicionado
  { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [nomeLoja, setNomeLoja] = useState("Pizza Admin");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

  useEffect(() => {
    const nomeSalvo = localStorage.getItem("usuario_nome"); 
    if (nomeSalvo) setNomeLoja(nomeSalvo);

    async function fetchLoja() {
        const { data } = await supabase.from("loja_config").select("nome_loja").limit(1).single();
        if (data) setNomeLoja(data.nome_loja);
    }
    fetchLoja();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.clear();
    document.cookie = "pizzaria_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/");
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* --- MENU MOBILE (OVERLAY) --- */}
      <div className={`fixed inset-0 z-50 bg-slate-900/50 md:hidden transition-opacity ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:shadow-sm flex flex-col
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        
        {/* Cabeçalho do Sidebar */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center">
            <Pizza className="text-red-600 mr-2" />
            <h1 className="text-lg font-extrabold text-slate-900 truncate w-32" title={nomeLoja}>
              {nomeLoja}
            </h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500">
            <X size={24} />
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)} 
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? "bg-red-50 text-red-600 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon size={20} className={isActive ? "text-red-600" : "text-slate-400"} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer do Sidebar */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 w-full transition-colors"
          >
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Barra de Topo Mobile */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:hidden justify-between shrink-0">
             <div className="flex items-center font-bold text-slate-800 gap-2">
                <Pizza className="text-red-600" size={20}/>
                {nomeLoja}
             </div>
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md">
                <Menu size={24} />
             </button>
        </header>

        {/* Área onde as páginas são renderizadas */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
          {children}
        </main>
      </div>
      
    </div>
  );
}