import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  '[Reanimated] Dependencies should only be used on the web',
]);

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import RootNavigator from './src/navigation/RootNavigator';
import { DriverProvider } from './src/context/DriverContext';

export default function App() {
  return (
    <DriverProvider>
      <NavigationContainer>
        {/* RootNavigator decide qué pantalla mostrar */}
        <RootNavigator />
      </NavigationContainer>
    </DriverProvider>
  );
}