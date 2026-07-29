// lib/revenuecat.ts
import Purchases from 'react-native-purchases';

const REVENUECAT_API_KEY = 'test_mzGYMiNeJLOpPIXhvBiWLfsuWxT'; // Test key
// const REVENUECAT_API_KEY = 'goog_xxxxxxxxxxxx'; // Production key (swap when live)

export const OFFERING_ID = 'default';
export const ENTITLEMENT_ID = 'pro';
export const PRODUCT_ID = 'ivoryos_pro_monthly';

export async function initRevenueCat() {
  try {
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: undefined,
    });
    if (__DEV__) {
      await Purchases.setDebugLogsEnabled(true);
    }
    console.log('RevenueCat initialized');
  } catch (error) {
    console.error('RevenueCat init failed:', error);
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('Get offerings failed:', error);
    return null;
  }
}

export async function purchasePro() {
  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;
    if (!currentOffering) throw new Error('No offerings available');
    const monthlyPackage = currentOffering.availablePackages.find(
      pkg => pkg.identifier === 'monthly'
    );
    if (!monthlyPackage) throw new Error('Monthly package not found');
    const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
    return customerInfo;
  } catch (error) {
    if ((error).userCancelled) {
      console.log('User cancelled purchase');
      return null;
    }
    console.error('Purchase failed:', error);
    throw error;
  }
}

export async function restorePurchases() {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
}

export async function checkProStatus() {
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return isPro;
  } catch (error) {
    console.error('Check status failed:', error);
    return false;
  }
}
