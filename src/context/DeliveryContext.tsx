import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { deliveryApi } from '../services/api';
import type { AvailableDelivery, Delivery, DeliveryStats } from '../types/api';

type DeliveryContextValue = {
  deliveries: Delivery[];
  available: AvailableDelivery[];
  stats: DeliveryStats | null;
  loading: boolean;
  refreshMine: () => Promise<Delivery[]>;
  refreshAvailable: () => Promise<AvailableDelivery[]>;
  refreshStats: () => Promise<DeliveryStats>;
  getDelivery: (id: string) => Promise<Delivery>;
  updateCached: (delivery: Delivery) => void;
  clear: () => void;
};

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

export function DeliveryProvider({ children }: React.PropsWithChildren) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [available, setAvailable] = useState<AvailableDelivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(false);

  const updateCached = useCallback((delivery: Delivery) => {
    setDeliveries((items) => {
      const exists = items.some((item) => item.id === delivery.id);
      return exists
        ? items.map((item) => (item.id === delivery.id ? delivery : item))
        : [delivery, ...items];
    });
  }, []);

  const refreshMine = useCallback(async () => {
    setLoading(true);
    try {
      const items = await deliveryApi.list();
      setDeliveries(items);
      return items;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAvailable = useCallback(async () => {
    setLoading(true);
    try {
      const items = await deliveryApi.available();
      setAvailable(items);
      return items;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    const value = await deliveryApi.stats();
    setStats(value);
    return value;
  }, []);

  const getDelivery = useCallback(
    async (id: string) => {
      const delivery = await deliveryApi.get(id);
      updateCached(delivery);
      return delivery;
    },
    [updateCached],
  );

  const clear = useCallback(() => {
    setDeliveries([]);
    setAvailable([]);
    setStats(null);
  }, []);

  const value = useMemo(
    () => ({
      deliveries,
      available,
      stats,
      loading,
      refreshMine,
      refreshAvailable,
      refreshStats,
      getDelivery,
      updateCached,
      clear,
    }),
    [
      deliveries,
      available,
      stats,
      loading,
      refreshMine,
      refreshAvailable,
      refreshStats,
      getDelivery,
      updateCached,
      clear,
    ],
  );
  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDeliveries() {
  const value = useContext(DeliveryContext);
  if (!value) throw new Error('useDeliveries doit être utilisé dans DeliveryProvider.');
  return value;
}

