import {Button} from "@/components/ui/button"
import {UserCircle, Sun, Moon, Settings, LogOut} from 'lucide-react'
import Link from 'next/link'
import {useTheme} from '@/contexts/theme-context'
import {signOut} from 'next-auth/react'
import {usePathname} from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DEFAULT_APP_NAME } from '@/lib/env'

interface HeaderProps {
  onLoginClick: () => void;
  isLoggedIn: boolean;
  username?: string;
  bgTransparent?: boolean;
  appName?: string;
}

export function Header({
                         onLoginClick,
                         isLoggedIn,
                         username,
                         bgTransparent = false,
                         appName = DEFAULT_APP_NAME
}: HeaderProps) {
  const {theme, toggleTheme} = useTheme();
  const pathname = usePathname();

  // 检查 pathname 是否为 null，并提供默认值
  const isSettingsPage = pathname ? pathname.startsWith('/settings') : false;

  return (
    <header className={`flex justify-between items-center px-6 py-2 z-50 ${bgTransparent? "" : "bg-background/30 backdrop-blur-lg"}`}>
      <div className="text-xl font-bold text-foreground select-none">{appName}</div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-5 w-5"/> : <Sun className="h-5 w-5"/>}
        </Button>
        {isLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  {username && username[0].toUpperCase()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isSettingsPage && (
                <Link href="/settings">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>设置</span>
                  </DropdownMenuItem>
                </Link>
              )}
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>登出</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon" onClick={onLoginClick}>
            <UserCircle className="h-6 w-6"/>
          </Button>
        )}
      </div>
    </header>
  )
}
