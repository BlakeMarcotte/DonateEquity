'use client'

import { ThemedBadge } from '@/components/ui/themed/badge'
import { ThemedAlert, ThemedAlertTitle, ThemedAlertDescription } from '@/components/ui/themed/alert'
import { ThemedButton } from '@/components/ui/themed/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Edit, Trash2, MoreHorizontal, CheckCircle, Sparkles, Palette } from 'lucide-react'
import { useState } from 'react'

type DesignStyle = 'default' | 'glass' | 'modern' | 'elegant'

export default function ComponentTestPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeStyle, setActiveStyle] = useState<DesignStyle>('default')

  const styles = {
    default: {
      container: 'bg-white',
      section: 'bg-white rounded-lg border border-gray-200 p-6',
      title: 'text-gray-900',
      description: 'text-gray-600',
    },
    glass: {
      container: 'bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100',
      section: 'backdrop-blur-xl bg-white/30 rounded-2xl border border-white/50 shadow-xl p-6',
      title: 'text-gray-900 drop-shadow-sm',
      description: 'text-gray-700',
    },
    modern: {
      container: 'bg-gray-50',
      section: 'bg-white rounded-lg border border-gray-200 p-6',
      title: 'text-gray-900',
      description: 'text-gray-600',
    },
    elegant: {
      container: 'bg-slate-50',
      section: 'bg-white rounded-lg border border-gray-200 p-6',
      title: 'text-gray-900',
      description: 'text-gray-600',
    },
  }

  const currentStyle = styles[activeStyle]

  return (
    <div className={`min-h-screen ${currentStyle.container} transition-all duration-500`}>
      <div className="max-w-7xl">
        <div className={`sticky top-0 z-50 backdrop-blur-xl ${activeStyle === 'glass' ? 'bg-white/50' : 'bg-white/90'} border-b border-gray-200 shadow-sm`}>
          <div className="mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${currentStyle.title}`}>Component Library Test</h1>
                <p className={currentStyle.description}>Testing UI components across different design styles for DonateEquity platform</p>
              </div>
              <Palette className="w-8 h-8 text-gray-600" />
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setActiveStyle('default')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeStyle === 'default'
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Default (Current)
              </button>
              <button
                onClick={() => setActiveStyle('glass')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeStyle === 'glass'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                    : 'bg-white/50 backdrop-blur-sm text-gray-700 hover:bg-white/70 border border-white/50'
                }`}
              >
                <Sparkles className="inline w-4 h-4 mr-2" />
                Liquid Glass
              </button>
              <button
                onClick={() => setActiveStyle('modern')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeStyle === 'modern'
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Modern (Placeholder)
              </button>
              <button
                onClick={() => setActiveStyle('elegant')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeStyle === 'elegant'
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Elegant (Placeholder)
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto p-8 space-y-8 mt-4">

          <section className={`space-y-4 ${currentStyle.section}`}>
            <h2 className={`text-2xl font-semibold ${currentStyle.title}`}>Badges</h2>
            <div className="flex flex-wrap gap-3">
              <ThemedBadge theme={activeStyle} variant="default">Default</ThemedBadge>
              <ThemedBadge theme={activeStyle} variant="success">Success</ThemedBadge>
              <ThemedBadge theme={activeStyle} variant="warning">Warning</ThemedBadge>
              <ThemedBadge theme={activeStyle} variant="error">Error</ThemedBadge>
              <ThemedBadge theme={activeStyle} variant="info">Info</ThemedBadge>
              <ThemedBadge theme={activeStyle} variant="primary">Primary</ThemedBadge>
              <ThemedBadge theme={activeStyle} variant="secondary">Secondary</ThemedBadge>
            </div>
            <div className="flex flex-wrap gap-3">
              <ThemedBadge theme={activeStyle} variant="success" size="sm">Small</ThemedBadge>
              <ThemedBadge theme={activeStyle} variant="success" size="md">Medium</ThemedBadge>
              <ThemedBadge theme={activeStyle} variant="success" size="lg">Large</ThemedBadge>
            </div>
            <div className="flex flex-wrap gap-3">
              <ThemedBadge theme={activeStyle} variant="info" icon={<CheckCircle />}>With Icon</ThemedBadge>
            </div>
          </section>

          <Separator />

          <section className={`space-y-4 ${currentStyle.section}`}>
            <h2 className={`text-2xl font-semibold ${currentStyle.title}`}>Alerts</h2>
            <ThemedAlert theme={activeStyle} variant="default">
              <ThemedAlertTitle>Default Alert</ThemedAlertTitle>
              <ThemedAlertDescription>This is a default alert message.</ThemedAlertDescription>
            </ThemedAlert>
            <ThemedAlert theme={activeStyle} variant="success">
              <ThemedAlertTitle>Success</ThemedAlertTitle>
              <ThemedAlertDescription>Your changes have been saved successfully.</ThemedAlertDescription>
            </ThemedAlert>
            <ThemedAlert theme={activeStyle} variant="warning">
              <ThemedAlertTitle>Warning</ThemedAlertTitle>
              <ThemedAlertDescription>Please review your information before proceeding.</ThemedAlertDescription>
            </ThemedAlert>
            <ThemedAlert theme={activeStyle} variant="error">
              <ThemedAlertTitle>Error</ThemedAlertTitle>
              <ThemedAlertDescription>Something went wrong. Please try again.</ThemedAlertDescription>
            </ThemedAlert>
            <ThemedAlert theme={activeStyle} variant="info" dismissible>
              <ThemedAlertTitle>Information</ThemedAlertTitle>
              <ThemedAlertDescription>This alert can be dismissed.</ThemedAlertDescription>
            </ThemedAlert>
          </section>

          <Separator />

          <section className={`space-y-4 ${currentStyle.section}`}>
            <h2 className={`text-2xl font-semibold ${currentStyle.title}`}>Skeletons</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton.Card />
              <Skeleton.List items={3} />
            </div>
          </section>

          <Separator />

          <section className={`space-y-4 ${currentStyle.section}`}>
            <h2 className={`text-2xl font-semibold ${currentStyle.title}`}>Avatars</h2>
            <div className="flex flex-wrap gap-4 items-end">
              <Avatar size="xs" fallback="JD" />
              <Avatar size="sm" fallback="JD" />
              <Avatar size="md" fallback="John Doe" />
              <Avatar size="lg" fallback="Jane Smith" />
              <Avatar size="xl" fallback="AB" />
            </div>
            <div className="flex flex-wrap gap-4">
              <Avatar size="lg" fallback="Online User" status="online" />
              <Avatar size="lg" fallback="Away User" status="away" />
              <Avatar size="lg" fallback="Busy User" status="busy" />
              <Avatar size="lg" fallback="Offline User" status="offline" />
            </div>
            <div className="flex flex-wrap gap-4">
              <Avatar size="lg" fallback="Circle" shape="circle" />
              <Avatar size="lg" fallback="Round" shape="rounded" />
              <Avatar size="lg" fallback="Square" shape="square" />
            </div>
          </section>

          <Separator />

          <section className={`space-y-4 ${currentStyle.section}`}>
            <h2 className={`text-2xl font-semibold ${currentStyle.title}`}>Dialog</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <ThemedButton theme={activeStyle}>Open Dialog</ThemedButton>
              </DialogTrigger>
              <DialogContent size="md">
                <DialogHeader>
                  <DialogTitle>Dialog Title</DialogTitle>
                  <DialogDescription>This is a dialog description explaining what this dialog is for.</DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <p>Dialog body content goes here. You can put forms, information, or any other content.</p>
                </DialogBody>
                <DialogFooter>
                  <ThemedButton theme={activeStyle} variant="outline" onClick={() => setDialogOpen(false)}>Cancel</ThemedButton>
                  <ThemedButton theme={activeStyle} onClick={() => setDialogOpen(false)}>Confirm</ThemedButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          <Separator />

          <section className={`space-y-4 ${currentStyle.section}`}>
            <h2 className={`text-2xl font-semibold ${currentStyle.title}`}>Dropdown Menu</h2>
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <ThemedButton theme={activeStyle} variant="outline">
                  <MoreHorizontal className="h-5 w-5" />
                  Actions
                </ThemedButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                <DropdownMenu.Label>Actions</DropdownMenu.Label>
                <DropdownMenu.Separator />
                <DropdownMenu.Item icon={Edit}>Edit</DropdownMenu.Item>
                <DropdownMenu.Item icon={Trash2} destructive>Delete</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </section>

          <Separator />

          <section className={`space-y-4 ${currentStyle.section}`}>
            <h2 className={`text-2xl font-semibold ${currentStyle.title}`}>Buttons</h2>
            <div className="flex flex-wrap gap-3">
              <ThemedButton theme={activeStyle} variant="default">Default Button</ThemedButton>
              <ThemedButton theme={activeStyle} variant="destructive">Destructive</ThemedButton>
              <ThemedButton theme={activeStyle} variant="outline">Outline</ThemedButton>
              <ThemedButton theme={activeStyle} variant="secondary">Secondary</ThemedButton>
              <ThemedButton theme={activeStyle} variant="ghost">Ghost</ThemedButton>
              <ThemedButton theme={activeStyle} variant="link">Link</ThemedButton>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
