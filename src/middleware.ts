import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const token = request.cookies.get('pizzaria_token')?.value || ''

  // 1. Rotas que NUNCA devem ser bloqueadas
  const isPublicPath = path === '/' || path === '/login' || path.startsWith('/cadastro')

  // 2. Se o cara NÃO tem token e tenta entrar no dashboard, manda pro LOGIN (não pra home)
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Se o cara JÁ TEM token e tenta ir pro login ou home, manda pro DASHBOARD
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// O Matcher precisa ignorar arquivos internos do Next.js para não dar loop no CSS/JS
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
}