'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Store,
  ArrowRight,
  ArrowLeft,
  Key,
  Globe,
  Check,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StoreType = 'shopify' | 'woocommerce';

const STORES: {
  type: StoreType;
  name: string;
  logo: string;
  color: string;
  description: string;
}[] = [
  {
    type: 'shopify',
    name: 'Shopify',
    logo: '/shopify-logo.svg',
    color: 'bg-[#95BF47]/15 border-[#95BF47]/30 hover:border-[#95BF47]',
    description: 'Connect your Shopify store',
  },
  {
    type: 'woocommerce',
    name: 'WooCommerce',
    logo: '/woocommerce-logo.svg',
    color: 'bg-[#96588A]/15 border-[#96588A]/30 hover:border-[#96588A]',
    description: 'Connect your WooCommerce store',
  },
];

interface ConnectStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreConnected?: (storeType: StoreType, storeUrl: string) => void;
}

type Step = 'select' | 'connect';

export function ConnectStoreModal({ isOpen, onClose, onStoreConnected }: ConnectStoreModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleClose = () => {
    setStep('select');
    setSelectedStore(null);
    setStoreUrl('');
    setApiKey('');
    setApiSecret('');
    onClose();
  };

  const handleSelectStore = (type: StoreType) => {
    setSelectedStore(type);
    setStep('connect');
  };

  const handleConnect = async () => {
    if (!selectedStore || !storeUrl) return;

    setIsConnecting(true);
    
    try {
      // TODO: Implement actual store connection logic
      // This would call an API endpoint that validates the credentials
      // and sets up webhooks for product sync
      
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulated delay
      
      toast.success(`Connected to ${selectedStore === 'shopify' ? 'Shopify' : 'WooCommerce'} successfully!`);
      onStoreConnected?.(selectedStore, storeUrl);
      handleClose();
    } catch {
      toast.error('Failed to connect store. Please check your credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  const selectedStoreInfo = STORES.find((s) => s.type === selectedStore);

  const canConnect =
    selectedStore &&
    storeUrl.trim() &&
    (selectedStore === 'shopify' || (apiKey.trim() && apiSecret.trim()));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div className="p-6">
          {step === 'select' ? (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Connect Your Store
                </DialogTitle>
                <DialogDescription>
                  Import products directly from your e-commerce platform
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                {STORES.map((store) => (
                  <Card
                    key={store.type}
                    hover
                    className={cn(
                      'cursor-pointer border-2 p-4 transition-all',
                      store.color
                    )}
                    onClick={() => handleSelectStore(store.type)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white p-2 shadow-sm">
                        {/* Placeholder for logos - in production you'd have actual SVGs */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-lg font-bold text-primary">
                          {store.type === 'shopify' ? 'S' : 'W'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{store.name}</h3>
                        <p className="text-sm text-muted-foreground">{store.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                  </Card>
                ))}
              </div>

              <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Secure Connection</p>
                    <p className="text-xs text-muted-foreground">
                      Your credentials are encrypted and we only request read-only access to your products.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-sm font-bold text-primary">
                    {selectedStore === 'shopify' ? 'S' : 'W'}
                  </div>
                  Connect {selectedStoreInfo?.name}
                </DialogTitle>
                <DialogDescription>
                  Enter your store credentials to import products
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Store URL
                  </label>
                  <Input
                    placeholder={
                      selectedStore === 'shopify'
                        ? 'your-store.myshopify.com'
                        : 'https://your-store.com'
                    }
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    autoFocus
                  />
                </div>

                {selectedStore === 'shopify' ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm">
                      <strong>Shopify</strong> uses OAuth for secure authentication.
                      You&apos;ll be redirected to Shopify to authorize access.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        Consumer Key
                      </label>
                      <Input
                        placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        Consumer Secret
                      </label>
                      <Input
                        type="password"
                        placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                      />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <a
                        href="https://woocommerce.com/document/woocommerce-rest-api/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        How to generate API keys
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </>
                )}

                <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">What we import:</strong> Product names, 
                    descriptions, images, categories, and pricing. We never modify your store data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-6 py-4">
          {step === 'select' ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <div className="text-xs text-muted-foreground">
                More platforms coming soon
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('select')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="glow"
                onClick={handleConnect}
                disabled={!canConnect || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : selectedStore === 'shopify' ? (
                  <>
                    Continue with Shopify
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Connect Store
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

