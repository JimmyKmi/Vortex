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
  DialogTitle
} from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import axios from 'axios'
import { format } from 'date-fns'
import type { TransferCode } from '@/components/settings/transfer-code-list'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// 定义客户端可用的常量，避免从服务器路由导入
const SPEED_LIMIT_OPTIONS: number[] = [
  3072, // 3Mbps
  5120, // 5Mbps
  10240, // 10Mbps
  15360, // 15Mbps
  30720, // 30Mbps
  51200, // 50Mbps
  102400 // 100Mbps
]

const formSchema = z.object({
  comment: z.string().max(100, '描述最多100个字符').optional(),
  // TODO: 这些功能尚未完成开发
  expires: z.string().optional(),
  speedLimit: z.string(),
  usageLimit: z.string().optional()
})

interface EditDialogProps {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  data: TransferCode
  onSuccessAction?: () => void
}

export function EditDialog({ open, onOpenChangeAction, data, onSuccessAction }: EditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: data.comment || '',
      expires: data.expires ? format(new Date(data.expires), "yyyy-MM-dd'T'HH:mm") : '',
      speedLimit: data.speedLimit?.toString() ?? '0',
      usageLimit: data.usageLimit?.toString() || ''
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true)
      await axios.patch(`/api/transfer-codes/${data.id}`, {
        comment: values.comment || null,
        // TODO: 这些功能尚未完成开发，暂时统一设置为null
        expires: null, // values.expires || null
        speedLimit: null, // values.speedLimit === '0' ? null : parseInt(values.speedLimit)
        usageLimit: null // values.usageLimit ? parseInt(values.usageLimit) : null
      })

      toast.success('保存成功')
      onOpenChangeAction(false)
      form.reset()
      onSuccessAction?.()
    } catch (error: any) {
      toast.error('保存失败', {
        description: error.response?.data?.message || '请重试'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑快传码</DialogTitle>
          <DialogDescription>修改快传码的设置</DialogDescription>
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
                    <Textarea placeholder="例如：项目演示文件（选填）" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>简短描述此快传码的用途</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* TODO: 这些功能尚未完成开发，暂时隐藏
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
            */}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '更新中...' : '更新'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
