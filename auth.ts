import NextAuth, { CredentialsSignin } from 'next-auth'
import type { User } from 'next-auth'
import Credentials from '@auth/core/providers/credentials'
import Zitadel from '@auth/core/providers/zitadel'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { signInSchema } from '@/lib/zod'
import { UserRole } from '@/lib/roles'
import { comparePassword } from '@/lib/utils/password'
import { getSystemSetting } from '@/lib/config/system-settings'
import { AUTH_ZITADEL_CLIENT_ID, AUTH_ZITADEL_ISSUER, NODE_ENV, AUTH_SECRET, AUTH_TRUST_HOST } from '@/lib/env'

/**
 * 自定义认证错误类
 * 遵循RESTful规范，包含code字段
 */
class ErrorUserNotFound extends CredentialsSignin {
  code = 'UserNotFound'
}

class ErrorIncorrectPassword extends CredentialsSignin {
  code = 'IncorrectPassword'
}

class ErrorMissingCredentials extends CredentialsSignin {
  code = 'MissingCredentials'
}

class ErrorInvalidInputFormat extends CredentialsSignin {
  code = 'InvalidInputFormat'
}

class ErrorAccountUnused extends CredentialsSignin {
  code = 'AccountUnused'
}

class ErrorEmailUnverified extends CredentialsSignin {
  code = 'EmailUnverified'
}

export const { handlers, auth, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  secret: AUTH_SECRET,
  trustHost: AUTH_TRUST_HOST,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email' },
        password: { label: 'Password', type: 'password' }
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          throw new ErrorMissingCredentials()
        }

        const parsedCredentials = await signInSchema.safeParseAsync(credentials)
        if (!parsedCredentials.success) {
          throw new ErrorInvalidInputFormat()
        }

        const { email, password } = parsedCredentials.data
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) throw new ErrorUserNotFound()

        if (!user.enabled) throw new ErrorAccountUnused()

        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: 'credentials'
          }
        })

        if (!account?.password) {
          throw new ErrorIncorrectPassword()
        }

        const isValidPassword = comparePassword(password, account.password)
        if (!isValidPassword) throw new ErrorIncorrectPassword()

        return {
          id: user.id,
          name: user.name || null,
          email: user.email,
          image: user.image || null,
          emailVerified: user.emailVerified,
          role: user.role,
          enabled: user.enabled
        } as User
      }
    }),
    ...(AUTH_ZITADEL_CLIENT_ID && AUTH_ZITADEL_ISSUER
      ? [
          Zitadel({
            clientId: AUTH_ZITADEL_CLIENT_ID,
            issuer: AUTH_ZITADEL_ISSUER,
            profile(profile) {
              const defaultEnabled = true // 这里先硬编码为 true，因为异步获取系统设置会比较复杂
              // 检查 Zitadel 权限
              let role = UserRole.USER // 默认角色
              // 从 Zitadel 项目角色中获取权限信息
              const projectRoles = profile['urn:zitadel:iam:org:project:roles'] || {}
              const roles = Object.keys(projectRoles)
              // 检查是否有管理员权限
              if (roles.some((r) => r?.toLowerCase().includes('admin'))) role = UserRole.ADMIN
              return {
                id: profile.sub,
                name: profile.name || `${profile.given_name} ${profile.family_name}`.trim(),
                email: profile.email,
                image: profile.picture,
                enabled: defaultEnabled,
                role: role
              }
            }
          })
        ]
      : [])
  ],
  session: {
    strategy: 'jwt'
    // maxAge: 30 * 24 * 60 * 60, // 30 days
    // updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      // Zitadel 登录时检查邮箱验证状态
      if (account?.provider === 'zitadel') {
        if (!profile?.email_verified) {
          throw new ErrorEmailUnverified()
        }

        // 检查账号是否启用
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email || '' }
        })

        if (existingUser && !existingUser.enabled) {
          throw new ErrorAccountUnused()
        }

        // 如果用户存在，根据 Zitadel 权限更新角色
        if (existingUser) {
          // 从 Zitadel 项目角色中获取权限信息
          const projectRoles = profile['urn:zitadel:iam:org:project:roles'] || {}
          const roles = Object.keys(projectRoles)

          // 检查是否有管理员权限
          if (roles.some((r) => r?.toLowerCase().includes('admin'))) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { role: UserRole.ADMIN }
            })
          }
        }

        return true
      }

      // 检查账号是否启用（针对 credentials 登录）
      if (!user?.enabled) {
        throw new ErrorAccountUnused()
      }

      return true
    },
    jwt({ token, user }: { token: any; user?: User }) {
      if (user) {
        token.user = user
        token.role = user.role
        token.enabled = user.enabled
      }
      return token
    },
    session({ session, token }: { session: any; token: any; user?: User }) {
      session.user = {
        ...session.user,
        id: token.user?.id || null,
        role: token.role,
        enabled: token.enabled
      }
      return session
    }
  },
  pages: {
    signIn: '/signin',
    newUser: '/signup',
    error: '/signin'
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: NODE_ENV === 'production'
      }
    }
  },
  debug: NODE_ENV === 'development',
  events: {
    async createUser({ user }) {
      // 获取默认启用状态
      const defaultEnabled = await getSystemSetting<boolean>('DEFAULT_USER_ENABLED')

      // 更新用户状态
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: UserRole.USER,
          enabled: defaultEnabled
        }
      })
    },
    async linkAccount(message) {
      console.log('1')
    },
    // createUser: (message) => {
    //   console.log("1")
    //   console.log("user", message.user)
    //   return;
    // },
    // linkAccount: (message) => {
    //   console.log("2")
    //   console.log("user", message.user)
    // }
    // session: (message) => Awaitable<void>;
    async signIn(message) {
      console.log('1')
    }
    // signOut: (message) => Awaitable<void>;
    // updateUser: (message) => Awaitable<void>;
  },
  logger: {
    error(code, ...message) {
      console.error(code, message)
    },
    warn(code, ...message) {
      console.warn(code, message)
    },
    debug(code, ...message) {
      console.log(code, message)
    }
  }
})
