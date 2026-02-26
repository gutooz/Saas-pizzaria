"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Pizza, 
  ArrowRight, 
  CheckCircle2, 
  LayoutDashboard, 
  Utensils, 
  ShieldCheck, 
  Zap,
  Star,
  Users,
  MousePointerClick,
  TrendingUp
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-red-100 font-sans">
      
      {/* NAVEGAÇÃO */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4 md:px-8">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-red-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-red-200">
              <Pizza className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">
              GESTOR<span className="text-red-600">PRO</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
            <a href="#funcionalidades" className="hover:text-red-600 transition-colors">Funcionalidades</a>
            <a href="#precos" className="hover:text-red-600 transition-colors">Preços</a>
            <a href="#depoimentos" className="hover:text-red-600 transition-colors">Depoimentos</a>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" className="font-bold text-slate-600 hover:text-red-600" onClick={() => window.location.href='/login'}>
              Entrar
            </Button>
            <Button className="bg-slate-900 hover:bg-red-600 text-white rounded-full px-6 transition-all font-bold shadow-lg" onClick={() => window.location.href='/cadastro'}>
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - FOCO NO PRODUTO */}
      <section className="relative pt-20 pb-28 overflow-hidden bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="text-left space-y-8 animate-in fade-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase">
              <Zap size={14} fill="currentColor" />
              Tecnologia de Gestão 2026
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter">
              Sua pizzaria <br />
              na palma da <br />
              <span className="text-red-600">sua mão.</span>
            </h1>
            
            <p className="text-xl text-slate-500 leading-relaxed max-w-lg font-medium">
              O Gestor Pro automatiza seus pedidos, controla seu estoque e organiza suas entregas em tempo real. Menos correria, mais lucro.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white h-16 px-10 text-xl font-bold rounded-2xl shadow-2xl shadow-red-200 transition-all hover:scale-105 active:scale-95">
                Testar 7 dias grátis <ArrowRight className="ml-2" size={20} />
              </Button>
            </div>
          </div>

          {/* MOCKUP DO SISTEMA (Substitui a foto) */}
          <div className="relative animate-in zoom-in duration-1000">
            <div className="absolute -inset-4 bg-gradient-to-tr from-red-500 to-orange-400 rounded-[3rem] opacity-20 blur-3xl" />
            <div className="relative bg-slate-900 rounded-[2.5rem] p-4 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-slate-800">
              {/* Interface Simulada */}
              <div className="bg-white rounded-2xl overflow-hidden aspect-video shadow-inner">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Dashboard Gestor Pro</div>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="h-4 w-2/3 bg-slate-100 rounded" />
                    <div className="h-20 w-full bg-red-50 rounded-xl border border-red-100 flex items-center justify-center">
                      <TrendingUp className="text-red-600" size={32} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-1/2 bg-slate-100 rounded" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-10 bg-slate-50 rounded-lg" />
                      <div className="h-10 bg-slate-50 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Potência Máxima no seu Delivery</h2>
            <p className="text-slate-500 font-medium">Ferramentas criadas para quem não tem tempo a perder.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: <LayoutDashboard className="text-red-600" />, 
                title: "Painel Financeiro", 
                desc: "Saiba exatamente quanto está lucrando por pizza vendida." 
              },
              { 
                icon: <Users className="text-red-600" />, 
                title: "Base de Clientes", 
                desc: "Fidelize seus clientes com histórico de pedidos e promoções." 
              },
              { 
                icon: <ShieldCheck className="text-red-600" />, 
                title: "Segurança Total", 
                desc: "Seus dados e de seus clientes protegidos com criptografia." 
              }
            ].map((f, i) => (
              <div key={i} className="p-10 rounded-[2rem] bg-slate-50 hover:bg-white hover:shadow-2xl hover:shadow-red-100 border border-transparent hover:border-red-100 transition-all group">
                <div className="mb-6 group-hover:scale-110 transition-transform">{f.icon}</div>
                <h4 className="text-xl font-bold mb-3 uppercase">{f.title}</h4>
                <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO DE PREÇOS */}
      <section id="precos" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black italic tracking-tighter mb-4">O MELHOR CUSTO-BENEFÍCIO</h2>
            <p className="text-slate-400">Escolha o plano que faz sentido para o seu momento.</p>
          </div>

          <div className="max-w-md mx-auto bg-gradient-to-b from-slate-800 to-slate-900 p-10 rounded-[3rem] border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-600 px-6 py-2 rounded-bl-2xl font-black text-[10px] uppercase tracking-widest">Recomendado</div>
            <h3 className="text-2xl font-bold mb-2">Plano Pro</h3>
            <div className="text-5xl font-black mb-8 italic">R$ 147<span className="text-lg text-slate-500 not-italic">/mês</span></div>
            
            <ul className="space-y-4 mb-10 text-sm">
              <li className="flex gap-3 items-center"><CheckCircle2 className="text-red-500" size={18}/> Pedidos Ilimitados</li>
              <li className="flex gap-3 items-center"><CheckCircle2 className="text-red-500" size={18}/> Dashboard Financeiro</li>
              <li className="flex gap-3 items-center"><CheckCircle2 className="text-red-500" size={18}/> Suporte Individual via WhatsApp</li>
              <li className="flex gap-3 items-center"><CheckCircle2 className="text-red-500" size={18}/> Impressão Automática</li>
            </ul>

            <Button className="w-full bg-red-600 hover:bg-red-700 h-14 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-red-900/40">
              Quero este plano
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-8">
          <div className="flex items-center gap-2 grayscale opacity-50">
            <Pizza size={24} />
            <span className="text-xl font-black tracking-tighter">GESTORPRO</span>
          </div>
          <div className="flex gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-red-600 transition-colors">Termos</a>
            <a href="#" className="hover:text-red-600 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-red-600 transition-colors">Contato</a>
          </div>
          <p className="text-slate-400 text-[10px] font-medium">© 2026 Gestor Pro. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}