// components/UpgradeButton.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Purchases, { PACKAGE_TYPE } from 'react-native-purchases';
import { usePurchases } from '../hooks/usePurchases';

const PLAN_DETAILS: Record<string, any> = {
  [PACKAGE_TYPE.ANNUAL]: {
    title: 'Yearly',
    period: 'year',
    badge: 'BEST VALUE',
  },
  [PACKAGE_TYPE.MONTHLY]: {
    title: 'Monthly',
    period: 'month',
    badge: null,
  },
};

export function UpgradeButton() {
  const { isPro, restore, refresh } = usePurchases();
  const [packages, setPackages] = useState<any[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (current?.availablePackages && current.availablePackages.length > 0) {
          const pkgs = current.availablePackages;
          setPackages(pkgs);
          // Default to annual if available
          const annual = pkgs.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
          setSelectedPkg(annual || pkgs[0]);
        } else {
          console.log('No packages found in current offering');
        }
      } catch (error) {
        console.log('Error fetching offerings:', error);
      }
    })();
  }, []);

  if (isPro) {
    return <Text style={styles.proBadge}>✓ Pro Member</Text>;
  }

  // Google Play is the source of truth. Never substitute a hardcoded price.
  const getPrice = (pkg: any) => {
    if (!pkg) return '';
    return pkg.storeProduct?.priceString || '';
  };

  const getPeriod = (pkg: any) => {
    if (!pkg) return 'month';
    return PLAN_DETAILS[pkg.packageType]?.period || 'month';
  };

  const getTitle = (pkg: any) => {
    if (!pkg) return '';
    return PLAN_DETAILS[pkg.packageType]?.title || pkg.packageType;
  };

  const getSavings = (pkg: any) => {
    if (!pkg || pkg.packageType !== PACKAGE_TYPE.ANNUAL) return null;

    const monthlyPkg = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
    const annualPrice = pkg.storeProduct?.price;
    const monthlyPrice = monthlyPkg?.storeProduct?.price;
    const currencyCode = pkg.storeProduct?.currencyCode || monthlyPkg?.storeProduct?.currencyCode;

    if (
      typeof annualPrice !== 'number' ||
      typeof monthlyPrice !== 'number' ||
      monthlyPrice <= 0 ||
      !currencyCode
    ) {
      return null;
    }

    const savings = monthlyPrice * 12 - annualPrice;
    if (savings <= 0) return null;

    try {
      const formattedSavings = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
      }).format(savings);
      return `Save ${formattedSavings}`;
    } catch {
      return null;
    }
  };

  const getBadge = (pkg: any) => {
    if (!pkg) return null;
    return PLAN_DETAILS[pkg.packageType]?.badge;
  };

  const handleUpgrade = async () => {
    if (!selectedPkg || !getPrice(selectedPkg)) {
      Alert.alert('Error', 'The store price is unavailable. Please try again later.');
      return;
    }
    setPurchasing(true);
    try {
      await Purchases.purchasePackage(selectedPkg);
      Alert.alert('Welcome to Pro!', 'You now have unlimited clients and all Pro features.');
      await refresh();
    } catch (error: any) {
      if (error.code !== '1') { // 1 = user cancelled
        Alert.alert('Purchase Failed', error.message || 'Something went wrong. Try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const result = await restore();
    setPurchasing(false);
    if (result.success && result.isPro) {
      Alert.alert('Restored', 'Your Pro subscription has been restored.');
    } else if (result.success && !result.isPro) {
      Alert.alert('No Purchase Found', 'No active Pro subscription found on this account.');
    } else {
      Alert.alert('Restore Failed', result.error || 'Could not restore purchases.');
    }
  };

  const renderOption = (pkg: any) => {
    const isSelected = selectedPkg?.identifier === pkg.identifier;
    const price = getPrice(pkg);
    const title = getTitle(pkg);
    const savings = getSavings(pkg);
    const badge = getBadge(pkg);

    return (
      <TouchableOpacity
        key={pkg.identifier}
        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
        onPress={() => setSelectedPkg(pkg)}
        activeOpacity={0.8}
      >
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}

        <View style={styles.optionContent}>
          <Text style={styles.planTitle}>{title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{price || 'Price unavailable'}</Text>
            {price && <Text style={styles.periodText}>/{getPeriod(pkg)}</Text>}
          </View>
          {savings && <Text style={styles.savingsText}>{savings}</Text>}
        </View>

        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
          {isSelected && <View style={styles.radioDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const canPurchase = !!selectedPkg && !!getPrice(selectedPkg);

  return (
    <View style={styles.container}>
      {packages.length > 0 ? (
        packages.map(renderOption)
      ) : (
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      )}

      <TouchableOpacity
        style={[styles.subscribeButton, (purchasing || !canPurchase) && styles.buttonDisabled]}
        onPress={handleUpgrade}
        disabled={purchasing || !canPurchase}
      >
        {purchasing ? (
          <ActivityIndicator color="#0A0A0A" />
        ) : (
          <Text style={styles.subscribeButtonText}>
            {canPurchase
              ? `Subscribe — ${getPrice(selectedPkg)}/${getPeriod(selectedPkg)}`
              : packages.length > 0
                ? 'Price unavailable'
                : 'Subscribe'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore} style={styles.restoreLink}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#C9A227',
    backgroundColor: '#FDFBF5',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#C9A227',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#0A0A0A',
    fontSize: 11,
    fontWeight: '700',
  },
  optionContent: { flex: 1 },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A0A0A',
  },
  periodText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 2,
  },
  savingsText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    marginTop: 4,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioCircleSelected: {
    borderColor: '#C9A227',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C9A227',
  },
  subscribeButton: {
    backgroundColor: '#C9A227',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  subscribeButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '700',
  },
  proBadge: {
    color: '#C9A227',
    fontWeight: '700',
    fontSize: 14,
    marginVertical: 8,
  },
  restoreLink: { alignItems: 'center' },
  restoreText: {
    color: '#666',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
