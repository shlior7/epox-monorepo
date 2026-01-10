import { useMemo } from 'react';
import { useData } from '@/lib/contexts/DataContext';
import type { Client, Session, ClientSession } from '@/lib/types/app-types';

export interface DataService {
  clients: Client[];
  addSession: (clientId: string, productId: string) => Promise<Session>;
  deleteSession: (clientId: string, productId: string, sessionId: string) => Promise<void>;
  addClientSession: (clientId: string, productIds: string[]) => Promise<ClientSession>;
  deleteClientSession: (clientId: string, sessionId: string) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  deleteProduct: (clientId: string, productId: string) => Promise<void>;
}

export function useDataService(): DataService {
  const { clients, addSession, deleteSession, addClientSession, deleteClientSession, deleteClient, deleteProduct } = useData();

  return useMemo(
    () => ({
      clients,
      addSession,
      deleteSession,
      addClientSession,
      deleteClientSession,
      deleteClient,
      deleteProduct,
    }),
    [clients, addSession, deleteSession, addClientSession, deleteClientSession, deleteClient, deleteProduct]
  );
}
