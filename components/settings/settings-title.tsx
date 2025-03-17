import React from 'react'

interface SettingsTitleProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function SettingsTitle({ title, description, children }: SettingsTitleProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {children && <div className="ml-4">{children}</div>}
      </div>
    </div>
  )
}
