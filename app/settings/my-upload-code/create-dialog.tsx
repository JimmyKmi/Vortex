'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { SPEED_LIMIT_OPTIONS } from '@/app/api/(user)/transfer-codes/[id]/route'

const formSchema = z.object({
  comment: z.string().max(100, '描述最多100个字符').optional().nullable(),
  expires: z.string().optional(),
  speedLimit: z.string(),
  usageLimit: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

interface CreateDialogProps {
  onSuccess?: () => void
}

export function CreateDialog({ onSuccess }: CreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [createdCode, setCreatedCode] = useState('')
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
      expires: '',
      speedLimit: '0',
      usageLimit: ''
    }
  })

  async function onSubmit(data: FormValues) {
    try {
      const response = await axios.post('/api/transfer-codes', {
        ...data,
        type: 'UPLOAD' as const,
        expires: data.expires || null,
        speedLimit: data.speedLimit === '0' ? null : parseInt(data.speedLimit),
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null
      })

      setCreatedCode(response.data.data.code)
      setOpen(false)
      setSuccessDialogOpen(true)
      form.reset()
      onSuccess?.()
    } catch (error: any) {
      toast.error('创建失败', {
        description: error.response?.data?.message || '请重试'
      })
    }
  }

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(createdCode)
    toast.success('已复制到剪贴板')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            创建上传码
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>创建传输码</DialogTitle>
            <DialogDescription>创建一个新的传输码，用于文件快传</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea placeholder="例如：项目文档收集（选填）" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>简短描述此传输码的用途</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expires"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>过期时间</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>可选，留空表示永不过期</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="speedLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>速度限制</FormLabel>
                    <Select
                      value={field.value?.toString() ?? '0'}
                      onValueChange={(value) => field.onChange(value === '0' ? null : parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="不限制" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">不限制</SelectItem>
                        {SPEED_LIMIT_OPTIONS.map((speed) => (
                          <SelectItem key={speed} value={speed.toString()}>
                            {speed / 1024} Mbps
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="usageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>使用次数</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="不限制"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || '')}
                      />
                    </FormControl>
                    <FormDescription>可选，限制使用次数</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>创建成功</DialogTitle>
            <DialogDescription>传输码已创建，您可以复制并分享给他人使用</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 my-4">
            <Input value={createdCode} readOnly className="font-mono text-lg" />
            <Button variant="outline" size="icon" onClick={handleCopyCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSuccessDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
