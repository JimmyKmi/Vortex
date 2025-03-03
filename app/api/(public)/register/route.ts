import {NextRequest} from 'next/server';
import {getSystemSetting} from '@/lib/config/system-settings';
import {saltAndHashPassword} from '@/lib/utils/password';
import {UserRole} from '@/lib/roles';
import {registerSchema} from '@/lib/zod';
import {ZodError} from 'zod';
import {PrismaAdapter} from "@auth/prisma-adapter"
import {prisma} from '@/lib/prisma';
import {ResponseSuccess, ResponseThrow} from "@/lib/utils/response"

export async function POST(request: NextRequest) {
  try {
    // 检查是否允许普通注册
    const allowRegistration = await getSystemSetting('ALLOW_REGISTRATION');
    if (!allowRegistration) return ResponseThrow('RegistrationClosed', 423);
    const data = await request.json();

    // 使用 zod 验证输入
    try {
      const {email, password, name} = await registerSchema.parseAsync(data);

      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: {email}
      });

      if (existingUser) return ResponseThrow('UserAlreadyExists', 409);

      // 获取 adapter
      const adapter = PrismaAdapter(prisma);
      if (!adapter?.createUser || !adapter?.linkAccount) return ResponseThrow('DatabaseError')

      // 检查是否存在任何通过 credentials 注册的用户
      const existingCredentialsUser = await prisma.account.findFirst();

      // 获取默认启用状态
      const defaultEnabled = await getSystemSetting<boolean>('DEFAULT_USER_ENABLED');

      // 创建用户
      const user = await prisma.user.create({
        data: {
          email,
          name,
          emailVerified: null,
          enabled: defaultEnabled,
          // 如果是第一个 credentials 用户，设置为管理员
          role: existingCredentialsUser ? UserRole.USER : UserRole.ADMIN,
        }
      });

      // 创建账户并关联
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "credentials",
          providerAccountId: user.id,
          password: saltAndHashPassword(password),
        }
      });

      return ResponseSuccess({userId: user.id});

    } catch (error) {
      if (error instanceof ZodError) return ResponseThrow('InvalidParams');
    }

  } catch (error) {
    console.error('注册错误:', error);
    return ResponseThrow('InternalServerError');
  }
}
