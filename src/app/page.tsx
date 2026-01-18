"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fazerLogin } from "@/lib/auth"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pizza, Lock, Mail, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); 
    setLoading(true);
    setErro("");

   
    const resultado = await fazerLogin(email, senha);

    if (resultado.sucesso) {
      
      if (resultado.usuario) {
        localStorage.setItem("pizzaria_id", resultado.usuario.pizzaria_id.toString());
        localStorage.setItem("usuario_id", resultado.usuario.id.toString()); 
        localStorage.setItem("usuario_nome", resultado.usuario.nome);
        localStorage.setItem("usuario_perfil", resultado.usuario.perfil);
      }

     
      document.cookie = "pizzaria_token=logado; path=/; max-age=86400; SameSite=Lax";
      
      
      router.push("/dashboard");
    } else {
      setErro(resultado.erro || "Ocorreu um erro inesperado.");
    }
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-500">
        
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto bg-red-50 p-4 rounded-full w-fit mb-2 ring-1 ring-red-100">
            <Pizza size={40} className="text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">Pizza SaaS</CardTitle>
          <CardDescription>Gerencie sua pizzaria com inteligência</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="email">Email de Acesso</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <Input 
                  id="email"
                  type="email" 
                  className="pl-10"
                  placeholder="admin@suapizzaria.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <Input 
                  id="senha"
                  type="password" 
                  className="pl-10"
                  placeholder="••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100 flex items-center gap-2 animate-pulse">
                ⚠️ {erro}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                <><span className="mr-2">Acessar Sistema</span> <ArrowRight size={16} /></>
              )}
            </Button>

          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t p-4 bg-slate-50 rounded-b-xl">
          <p className="text-xs text-slate-500">
            Esqueceu a senha? Contate o suporte do sistema.
          </p>
        </CardFooter>

      </Card>
    </div>
  );
}