
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import TabNavigator from './src/navigation/TabNavigator';
import { DriverProvider } from './src/context/DriverContext';

export default function App() {
  return (
    <DriverProvider>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </DriverProvider>
  );
}

