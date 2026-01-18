"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, Pizza } from 'lucide-react';

interface PizzaBuilderProps {
  pizzasDisponiveis: any[];
  tamanhoNome: string;
  maxSabores: number;
  onAddToCart: (item: any) => void;
  onClose: () => void;
}

export default function PizzaBuilder({ 
  pizzasDisponiveis, 
  tamanhoNome, 
  maxSabores, 
  onAddToCart, 
  onClose 
}: PizzaBuilderProps) {
  
  const [divisao, setDivisao] = useState(1); 
  const [saboresSelecionados, setSaboresSelecionados] = useState<any[]>([]);
  const [precoFinal, setPrecoFinal] = useState(0);

  // Calcula Preço (Média)
  useEffect(() => {
    if (saboresSelecionados.length === 0) {
      setPrecoFinal(0); return;
    }
    
    const precos = saboresSelecionados.map(s => {
      // Tenta pegar preco OU price
      const valor = s.preco ?? s.price;

      if (!valor) return 0;
      if (typeof valor === 'number') return valor;
      
      // Limpeza de string para number
      return parseFloat(valor.toString().replace("R$", "").replace(".", "").replace(",", "."));
    });

    const somaTotal = precos.reduce((acc, curr) => acc + curr, 0);
    setPrecoFinal(somaTotal / divisao);
  }, [saboresSelecionados, divisao]);

  const handleSelectFlavor = (pizza: any) => {
    if (saboresSelecionados.length >= divisao) return;
    setSaboresSelecionados([...saboresSelecionados, pizza]);
  };

  const handleRemoveFlavor = (index: number) => {
    setSaboresSelecionados(saboresSelecionados.filter((_, i) => i !== index));
  };

  const changeDivisao = (n: number) => {
    setDivisao(n);
    setSaboresSelecionados([]);
  };

  const handleFinish = () => {
    if (saboresSelecionados.length < divisao) return alert(`Escolha ${divisao} sabores!`);

    // Helper para pegar o nome correto
    const getNomes = (lista: any[]) => lista.map(s => s.nome || s.name || "Sem Nome");

    const itemPronto = {
      tamanho: divisao === 1 ? tamanhoNome : `${tamanhoNome} (${divisao} Sabores)`,
      sabores: getNomes(saboresSelecionados),
      preco: precoFinal,
      obs: `Montada: ${getNomes(saboresSelecionados).join(' + ')}`
    };

    onAddToCart(itemPronto);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Pizza className="text-green-400" /> Montar {tamanhoNome}
            </h2>
            <p className="text-slate-400 text-sm">Valor final: média dos sabores.</p>
          </div>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ESQUERDA - LISTA DE PIZZAS */}
          <div className="w-2/3 bg-slate-50 p-6 flex flex-col border-r border-slate-200 overflow-hidden">
            
            {/* Botões de Divisão */}
            <div className="flex gap-3 mb-6 shrink-0">
              {Array.from({ length: maxSabores }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => changeDivisao(num)}
                  className={`flex-1 py-4 rounded-xl font-bold text-sm uppercase border-2 transition-all ${
                    divisao === num ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white'
                  }`}
                >
                  {num === 1 ? 'Inteira' : `${num} Sabores (1/${num})`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                {pizzasDisponiveis.map((pizza) => {
                  const isFull = saboresSelecionados.length >= divisao;
                  
                  // --- CORREÇÃO DE CAMPOS (PORTUGUÊS OU INGLÊS) ---
                  const nomePizza = pizza.nome || pizza.name || "Pizza Sem Nome";
                  const descPizza = pizza.descricao || pizza.description || pizza.ingredientes || "...";
                  const precoPizza = pizza.preco ?? pizza.price; // ?? permite que seja 0
                  
                  return (
                    <button
                      key={pizza.id}
                      onClick={() => handleSelectFlavor(pizza)}
                      disabled={isFull}
                      className="p-4 bg-white border rounded-xl hover:border-green-400 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="font-bold text-slate-800">{nomePizza}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {descPizza}
                      </div>
                      <div className="mt-2 font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded text-xs w-fit">
                        {typeof precoPizza === 'number' 
                            ? `R$ ${precoPizza.toFixed(2).replace('.', ',')}` 
                            : precoPizza || 'R$ 0,00'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DIREITA - RESUMO */}
          <div className="w-1/3 bg-white p-6 flex flex-col z-10">
            <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b">Sua {tamanhoNome}</h3>
            
            <div className="flex-1 space-y-4 overflow-y-auto">
              {Array.from({ length: divisao }).map((_, index) => {
                 const sabor = saboresSelecionados[index];
                 // Verifica nome também aqui no resumo
                 const nomeSabor = sabor ? (sabor.nome || sabor.name) : null;

                 return (
                    <div key={index} className="border-2 border-dashed rounded-xl p-4 min-h-[80px] flex items-center justify-center relative">
                    {nomeSabor ? (
                        <div className="w-full">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold uppercase text-slate-400">{index+1}ª Parte</span> 
                            <button onClick={() => handleRemoveFlavor(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="font-bold text-green-700 text-lg leading-tight">{nomeSabor}</div>
                        </div>
                    ) : <span className="text-slate-300 font-bold text-xl">{index+1}</span>}
                    </div>
                 );
              })}
            </div>

            <div className="mt-auto pt-6 border-t">
              <div className="flex justify-between items-end mb-4">
                <span className="text-slate-500">Total</span>
                <span className="text-3xl font-bold">R$ {precoFinal.toFixed(2).replace('.', ',')}</span>
              </div>
              <button 
                onClick={handleFinish} 
                disabled={saboresSelecionados.length < divisao} 
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
              >
                <Check className="inline mr-2"/> Adicionar ao Pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}