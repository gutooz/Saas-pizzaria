import { supabase } from "./supabase"; // <--- Mudamos aqui para usar o SEU arquivo

export async function fazerLogin(email: string, senha: string) {
  try {
    // 1. Busca o usuário na tabela 'usuarios'
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single(); // Traz apenas 1 resultado

    // Se deu erro no banco ou não achou o usuário
    if (error || !data) {
      return { sucesso: false, erro: 'Usuário não encontrado.' };
    }

    // 2. Verifica a senha simples (conforme criamos no banco)
    if (data.senha_hash !== senha) {
      return { sucesso: false, erro: 'Senha incorreta.' };
    }

    // 3. SUCESSO! Retorna os dados para a página salvar
    return {
      sucesso: true,
      usuario: {
        id: data.id,
        nome: data.nome,
        pizzaria_id: data.pizzaria_id,
        perfil: data.perfil
      }
    };

  } catch (err) {
    console.error("Erro no login:", err);
    return { sucesso: false, erro: 'Erro interno do sistema.' };
  }
}