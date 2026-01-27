'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ArrowRight, ArrowLeft, Globe, Loader2, ShieldCheck, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { buildTestId } from '@/lib/testing/testid';

type StoreType = 'woocommerce' | 'shopify' | 'bigcommerce';

const STORES: {
  type: StoreType;
  name: string;
  description: string;
  color: string;
  available: boolean;
}[] = [
  {
    type: 'woocommerce',
    name: 'WooCommerce',
    description: 'Connect your WooCommerce store',
    color: 'bg-[#96588A]/15 border-[#96588A]/30 hover:border-[#96588A]',
    available: true,
  },
  {
    type: 'shopify',
    name: 'Shopify',
    description: 'Coming soon',
    color: 'bg-muted/50 border-muted',
    available: false,
  },
  {
    type: 'bigcommerce',
    name: 'BigCommerce',
    description: 'Coming soon',
    color: 'bg-muted/50 border-muted',
    available: false,
  },
];

type Step = 'select' | 'connect';

export function ConnectStoreWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSelectStore = (type: StoreType) => {
    const store = STORES.find((s) => s.type === type);
    if (!store?.available) {
      toast.info(`${store?.name} integration coming soon`);
      return;
    }
    setSelectedStore(type);
    setStep('connect');
  };

  const handleConnect = async () => {
    if (!selectedStore || !storeUrl) return;

    setIsConnecting(true);

    try {
      const trimmedUrl = storeUrl.trim();
      const response = await fetch(`/api/store-connection/${selectedStore}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: trimmedUrl,
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? 'Failed to initiate connection');
      }

      const { authUrl } = await response.json();

      // Store info for callback handling
      sessionStorage.setItem(
        'pendingStoreConnection',
        JSON.stringify({ storeType: selectedStore, storeUrl: trimmedUrl })
      );

      // Redirect to provider's authorization page
      window.location.href = authUrl;
    } catch (error) {
      console.error('Store connection error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect store');
      setIsConnecting(false);
    }
  };

  const selectedStoreInfo = STORES.find((s) => s.type === selectedStore);
  const canConnect: boolean = Boolean(selectedStore && storeUrl.trim());

  return (
    <div className="flex h-full flex-col" data-testid="connect-store-wizard">
      {/* Header */}
      <div
        className="border-b border-border/50 bg-background px-8 py-6"
        data-testid={buildTestId('connect-store-wizard', 'header')}
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {step === 'select' ? 'Connect Your Store' : `Connect ${selectedStoreInfo?.name}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {step === 'select'
                  ? 'Choose your e-commerce platform to get started'
                  : 'Enter your store URL to start the secure connection'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-auto px-8 py-8"
        data-testid={buildTestId('connect-store-wizard', 'content')}
      >
        <div className="mx-auto max-w-2xl">
          {step === 'select' ? (
            <div className="space-y-6" data-testid={buildTestId('connect-store-wizard', 'step-select')}>
              <div className="grid gap-4">
                {STORES.map((store) => (
                  <Card
                    key={store.type}
                    hover={store.available}
                    className={cn(
                      'border-2 p-6 transition-all',
                      store.color,
                      store.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    )}
                    onClick={() => handleSelectStore(store.type)}
                    data-testid={buildTestId('connect-store-wizard', 'store-option', store.type)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/80 p-2 shadow-sm">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-xl font-bold text-primary">
                          {store.type[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{store.name}</h3>
                        <p className="text-sm text-muted-foreground">{store.description}</p>
                      </div>
                      {store.available && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="rounded-xl border border-border/50 bg-secondary/30 p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="font-medium">Secure Connection</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your credentials are encrypted and we only request read-only access to your
                      products. We never modify your store data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6" data-testid={buildTestId('connect-store-wizard', 'step-connect')}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    className="flex items-center gap-2 text-sm font-medium"
                    htmlFor="store-url-input"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Store URL
                  </label>
                  <Input
                    id="store-url-input"
                    placeholder={
                      selectedStore === 'shopify'
                        ? 'your-store.myshopify.com'
                        : 'https://your-store.com'
                    }
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    autoFocus
                    data-testid={buildTestId('connect-store-wizard', 'store-url-input')}
                  />
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">One-Click Authorization</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        You&apos;ll be redirected to {selectedStoreInfo?.name} to securely authorize
                        access. No need to manually create API keys!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-secondary/30 p-6">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">What we access:</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Product names, descriptions, images, categories, and pricing. We never modify
                        your store data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="border-t border-border/50 bg-background px-8 py-6"
        data-testid={buildTestId('connect-store-wizard', 'footer')}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          {step === 'select' ? (
            <>
              <div className="text-sm text-muted-foreground">
                More platforms coming soon
              </div>
              <div />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep('select')}
                data-testid={buildTestId('connect-store-wizard', 'back-button')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="glow"
                onClick={handleConnect}
                disabled={!canConnect || isConnecting}
                data-testid={buildTestId('connect-store-wizard', 'connect-button')}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Continue to {selectedStoreInfo?.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
