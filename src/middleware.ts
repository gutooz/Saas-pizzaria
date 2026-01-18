import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 1. Pega o caminho que o usuário está tentando acessar
  const path = request.nextUrl.pathname

  // 2. Define quais caminhos são públicos (não precisam de senha)
  // Adicione aqui suas rotas públicas, como login, cadastro, imagens, etc.
  const isPublicPath = path === '/' || path === '/login' || path === '/cadastro'

  // 3. Tenta pegar o "token" de autenticação nos cookies do navegador
  // (Vamos chamar esse cookie de 'pizzaria_token' por enquanto)
  const token = request.cookies.get('pizzaria_token')?.value || ''

  // 4. LÓGICA DE SEGURANÇA:

  // Se o caminho NÃO for público (ou seja, é o /dashboard) E não tiver token...
  if (!isPublicPath && !token) {
    // ...Redireciona o intruso para a tela de login
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Se o usuário JÁ tem token e tenta acessar o login...
  if (isPublicPath && token && path !== '/dashboard') {
    // ...Joga ele direto pro dashboard (pra não ter que logar de novo)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}

// 5. Configuração: Em quais rotas esse arquivo deve rodar?
export const config = {
  matcher: [
    '/', 
    '/login',
    '/dashboard/:path*', // O :path* significa "qualquer coisa depois de dashboard"
  ]
}