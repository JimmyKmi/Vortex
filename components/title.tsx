'use client'

import {Button} from "@/components/ui/button"
import {ArrowLeft} from 'lucide-react'
import {useRouter} from 'next/navigation'

interface TitleProps {
  buttonType?: 'back' | 'home' | null
  title?: string
  backPath?: string
}

export function Title({
                        buttonType = null,
                        title = '文件快传',
                        backPath
                      }: TitleProps) {
  const router = useRouter()

  const handleButtonClick = () => {
    if (buttonType === 'back') {
      if (backPath) {
        router.push(backPath)
      } else {
        router.back()
      }
    } else if (buttonType === 'home') {
      router.push('/')
    }
  };

  return (
    <div className="flex justify-between items-center mb-4">
      {buttonType && (
        <Button variant="outline" size="sm" onClick={handleButtonClick}>
          <ArrowLeft className="mr-2 h-4 w-4"/> {buttonType === 'back' ? '返回' : '主页'}
        </Button>
      )}
      <h1 className={`${!buttonType ? "text-3xl" : "text-xl"} font-bold`}>{title}</h1>
    </div>
  );
} 