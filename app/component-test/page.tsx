'use client'

import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, MoreHorizontal, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export default function ComponentTestPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Component Library Test</h1>
        <p className="text-gray-600">Testing new UI components to verify they work correctly</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge variant="success" size="sm">Small</Badge>
          <Badge variant="success" size="md">Medium</Badge>
          <Badge variant="success" size="lg">Large</Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge variant="info" icon={<CheckCircle />}>With Icon</Badge>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Alerts</h2>
        <Alert variant="default">
          <AlertTitle>Default Alert</AlertTitle>
          <AlertDescription>This is a default alert message.</AlertDescription>
        </Alert>
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your changes have been saved successfully.</AlertDescription>
        </Alert>
        <Alert variant="warning">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>Please review your information before proceeding.</AlertDescription>
        </Alert>
        <Alert variant="error">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong. Please try again.</AlertDescription>
        </Alert>
        <Alert variant="info" dismissible>
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>This alert can be dismissed.</AlertDescription>
        </Alert>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Skeletons</h2>
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

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Avatars</h2>
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

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dialog</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dropdown Menu</h2>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="h-5 w-5" />
              Actions
            </Button>
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

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Existing Buttons (Should Still Work)</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="default">Default Button</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>
    </div>
  )
}
