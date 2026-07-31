// hooks/usePurchases.ts
import { useState, useEffect, useCallback } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { ENTITLEMENT_ID } from '../lib/revenuecat';

export function usePurchases() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      // getCustomerInfo returns CustomerInfo DIRECTLY (no destructuring!)
      const info = await Purchases.getCustomerInfo();
      const hasPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);
      setCustomerInfo(info);
      return hasPro;
    } catch (error) {
      console.error('Status check failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const unsubscribe = Purchases.addCustomerInfoUpdateListener((info) => {
      const hasPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);
      setCustomerInfo(info);
    });
    return () => unsubscribe();
  }, [checkStatus]);

  const purchasePro = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) throw new Error('No offerings');
      const monthly = current.availablePackages.find(p => p.identifier === 'monthly');
      if (!monthly) throw new Error('No monthly package');
      // purchasePackage DOES return { customerInfo } — this one was correct
      const { customerInfo } = await Purchases.purchasePackage(monthly);
      const hasPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);
      setCustomerInfo(customerInfo);
      return { success: true, customerInfo };
    } catch (error: any) {
      if (error.userCancelled) return { success: false, cancelled: true };
      return { success: false, error: error.message };
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      // restorePurchases returns CustomerInfo DIRECTLY (no destructuring!)
      const info = await Purchases.restorePurchases();
      const hasPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);
      setCustomerInfo(info);
      return { success: true, isPro: hasPro };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  return { isPro, loading, customerInfo, purchasePro, restore, refresh: checkStatus };
}