// components/UpgradeButton.tsx
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { usePurchases } from '../hooks/usePurchases';
import { getOfferings } from '../lib/revenuecat';

export function UpgradeButton() {
  const { isPro, purchasePro, restore } = usePurchases();
  const [purchasing, setPurchasing] = useState(false);

  if (isPro) {
    return <Text style={styles.proBadge}>✓ Pro Member</Text>;
  }

  const handleUpgrade = async () => {
    setPurchasing(true);
    
    // DEBUG: Check if offerings load first
    try {
      const offerings = await getOfferings();
      console.log('Offerings:', JSON.stringify(offerings, null, 2));
      
      if (!offerings || !offerings.current) {
        setPurchasing(false);
        Alert.alert(
          'Not Ready Yet',
          'Google Play is still syncing the product. Wait 10 minutes and try again, or check your RevenueCat dashboard.'
        );
        return;
      }
    } catch (err: any) {
      setPurchasing(false);
      Alert.alert('RevenueCat Error', err.message || 'Failed to load offerings');
      return;
    }

    // Now try purchase
    const result = await purchasePro();
    setPurchasing(false);

    if (result.success) {
      Alert.alert('Welcome to Pro!', 'You now have unlimited clients and all Pro features.');
    } else if (result.cancelled) {
      // no alert
    } else {
      Alert.alert('Purchase Failed', result.error || 'Something went wrong. Try again.');
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

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={handleUpgrade} disabled={purchasing} activeOpacity={0.8}>
        {purchasing ? (
          <ActivityIndicator color="#0A0A0A" />
        ) : (
          <Text style={styles.buttonText}>Upgrade to Pro — $49/month</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={handleRestore} style={styles.restoreLink}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#C9A227',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#0A0A0A',
    fontWeight: '700',
    fontSize: 16,
  },
  proBadge: {
    color: '#C9A227',
    fontWeight: '700',
    fontSize: 14,
    marginVertical: 8,
  },
  restoreLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  restoreText: {
    color: '#666',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});