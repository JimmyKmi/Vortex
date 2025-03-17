import { DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      enabled: boolean
    }
  }

  interface User extends DefaultUser {
    id: string
    name?: string | null
    email?: string | null
    role: string
    enabled: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    name?: string | null
    email?: string | null
    role: string
    enabled: boolean
  }
}

declare module 'next-auth/providers/oauth' {
  interface OAuthConfig<P> {
    signIn?: (params: { user: User; account: any; profile: P; email: any; credentials: any }) => Promise<boolean>
  }
}
