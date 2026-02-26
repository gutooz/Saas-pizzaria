"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pizza, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

// 1. Criamos um componente interno para o formulário
function FormularioRegistro() {
  const searchParams = useSearchParams();
  const plano = searchParams.get("plano") || "bronze";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Link href="/cadastro" className="mb-4 text-slate-500 hover:text-red-600 flex items-center gap-2">
        <ArrowLeft size={18} /> Escolher outro plano
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Pizza className="mx-auto text-red-600 mb-2" size={40} />
          <CardTitle>Cadastro - Plano {plano.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Delivery</Label>
            <Input placeholder="Ex: Bella Pizza" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="admin@pizzaria.com" />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" />
          </div>
          <Button className="w-full bg-red-600 hover:bg-red-700">Criar minha conta</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 2. O componente principal exporta o formulário dentro de um Suspense
export default function RegistroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">Carregando formulário...</p>
      </div>
    }>
      <FormularioRegistro />
    </Suspense>
  );
}