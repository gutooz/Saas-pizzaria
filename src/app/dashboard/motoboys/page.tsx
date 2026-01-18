"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Bike, User, DollarSign } from "lucide-react";

export default function MotoboysPage() {
  const [motoboys, setMotoboys] = useState<any[]>([]);
  // Correção: daily_fee começa como string "0" para facilitar a digitação
  const [novoMoto, setNovoMoto] = useState({ name: "", phone: "", plate: "", daily_fee: "0" });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Buscar Motoboys
  async function carregarMotoboys() {
    const { data } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    setMotoboys(data || []);
  }

  // Salvar Novo Motoboy
  async function salvarMotoboy() {
    if (!novoMoto.name) return alert("Nome é obrigatório!");
    setLoading(true);

    // --- CORREÇÃO AQUI ---
    // Antes estava errado (novoMoto.novoMoto). Agora está certo.
    const valorDiaria = parseFloat(novoMoto.daily_fee || "0");

    const { error } = await supabase.from("drivers").insert([{
        name: novoMoto.name,
        phone: novoMoto.phone,
        plate: novoMoto.plate,
        status: "Ativo",
        daily_fee: valorDiaria
    }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
        console.error(error);
    } else {
        setModalOpen(false);
        setNovoMoto({ name: "", phone: "", plate: "", daily_fee: "0" });
        carregarMotoboys();
    }
    setLoading(false);
  }

  async function excluir(id: number) {
    if (confirm("Tem certeza que deseja excluir este entregador?")) {
        await supabase.from("drivers").delete().eq("id", id);
        carregarMotoboys();
    }
  }

  useEffect(() => {
    carregarMotoboys();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Entregadores</h1>
            <p className="text-slate-500">Gerencie sua equipe e valores</p>
        </div>
        
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
                <Bike size={20}/> Novo Entregador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Motoboy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Nome Completo</label>
                <Input value={novoMoto.name} onChange={(e) => setNovoMoto({...novoMoto, name: e.target.value})} placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input value={novoMoto.phone} onChange={(e) => setNovoMoto({...novoMoto, phone: e.target.value})} placeholder="(11) 99999-9999" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Placa</label>
                    <Input value={novoMoto.plate} onChange={(e) => setNovoMoto({...novoMoto, plate: e.target.value})} placeholder="ABC-1234" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-700">Valor da Diária Fixa</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400">R$</span>
                        <Input 
                            type="number" 
                            className="pl-8 font-bold text-green-700" 
                            value={novoMoto.daily_fee} 
                            onChange={(e) => setNovoMoto({...novoMoto, daily_fee: e.target.value})} 
                            placeholder="0.00" 
                        />
                    </div>
                  </div>
              </div>
              <Button onClick={salvarMotoboy} disabled={loading} className="w-full bg-slate-900 text-white mt-4">
                {loading ? "Salvando..." : "Salvar Cadastro"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {motoboys.map((moto) => (
          <Card key={moto.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={20}/>
                    </div>
                    <div>
                        <CardTitle className="text-lg">{moto.name}</CardTitle>
                        <p className="text-sm text-slate-500">{moto.plate || "Sem placa"}</p>
                    </div>
                </div>
                <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                    Ativo
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg flex justify-between items-center mb-4">
                    <span className="text-sm text-slate-500 font-medium">Diária Fixa:</span>
                    <span className="font-bold text-green-700 flex items-center gap-1">
                        <DollarSign size={14}/> R$ {moto.daily_fee ? Number(moto.daily_fee).toFixed(2) : "0.00"}
                    </span>
                </div>
                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => excluir(moto.id)}>
                    <Trash2 size={16} className="mr-2"/> Excluir
                </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}