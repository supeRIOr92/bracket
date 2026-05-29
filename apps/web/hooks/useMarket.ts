'use client';

import { useQuery } from '@tanstack/react-query';
import { marketsApi } from '@/lib/api';

export function useTodayMarket() {
  return useQuery({
    queryKey: ['market', 'today'],
    queryFn: async () => {
      const res = await marketsApi.getToday();
      return res.data;
    },
    refetchInterval: 30_000, // refresh tiap 30 detik
    retry: false,
  });
}

export function useMarketPools(marketId: string | undefined) {
  return useQuery({
    queryKey: ['market', marketId, 'pools'],
    queryFn: async () => {
      const res = await marketsApi.getPools(marketId!);
      return res.data;
    },
    enabled: !!marketId,
    refetchInterval: 15_000,
  });
}

export function useMarket(marketId: string | undefined) {
  return useQuery({
    queryKey: ['market', marketId],
    queryFn: async () => {
      const res = await marketsApi.getById(marketId!);
      return res.data;
    },
    enabled: !!marketId,
    refetchInterval: 30_000,
  });
}