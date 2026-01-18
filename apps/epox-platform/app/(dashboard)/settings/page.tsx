'use client';

import { useState } from 'react';
import { User, Bell, Sliders, CreditCard, Key, Trash2, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/layout';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="max-w-4xl p-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="defaults">
              <Sliders className="mr-2 h-4 w-4" />
              Defaults
            </TabsTrigger>
            <TabsTrigger value="account">
              <CreditCard className="mr-2 h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your personal information and profile picture.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input defaultValue="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" defaultValue="john@example.com" disabled />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Input defaultValue="Acme Furniture Co." disabled />
                  <p className="text-xs text-muted-foreground">
                    Managed by your organization admin.
                  </p>
                </div>
                <Button onClick={handleSave} isLoading={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Email Notifications</h4>
                  <NotificationOption
                    label="Generation completed"
                    description="Get notified when your images are ready"
                    defaultChecked
                  />
                  <NotificationOption
                    label="Generation failed"
                    description="Get notified if there are any errors"
                    defaultChecked
                  />
                  <NotificationOption
                    label="Weekly summary"
                    description="Receive a weekly overview of your activity"
                  />
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Browser Notifications</h4>
                  <NotificationOption
                    label="Generation updates"
                    description="Show browser notifications for progress"
                    defaultChecked
                  />
                </div>
                <Button onClick={handleSave} isLoading={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Defaults Tab */}
          <TabsContent value="defaults">
            <Card>
              <CardHeader>
                <CardTitle>Default Generation Settings</CardTitle>
                <CardDescription>
                  These settings will be pre-filled when creating new collections.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Style</label>
                  <Input defaultValue="Modern Minimalist" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Lighting</label>
                  <Input defaultValue="Natural" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aspect Ratio</label>
                  <Input defaultValue="1:1 (Square)" />
                </div>
                <Button onClick={handleSave} isLoading={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Defaults
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <div className="space-y-6">
              {/* Usage Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage & Credits</CardTitle>
                  <CardDescription>Your current plan and usage statistics.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Pro Plan</p>
                      <p className="text-sm text-muted-foreground">1,000 credits per month</p>
                    </div>
                    <Button variant="outline">Upgrade Plan</Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Credits Used</span>
                      <span>847 / 1,000</span>
                    </div>
                    <Progress value={84.7} />
                    <p className="text-xs text-muted-foreground">Resets on February 1, 2026</p>
                  </div>
                </CardContent>
              </Card>

              {/* Password Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Change your password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Password</label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input type="password" />
                  </div>
                  <Button onClick={handleSave} isLoading={isSaving}>
                    <Key className="mr-2 h-4 w-4" />
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions that affect your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function NotificationOption({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
