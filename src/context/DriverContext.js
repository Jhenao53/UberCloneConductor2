import React, { createContext, useState } from 'react';

export const DriverContext = createContext();

const initialDriverData = {
  fullName: '',
  document: '',
  phone: '',
  birthDate: '',
  gender: '',
  email: '',
  language: '',
  category: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  capacity: '',
};

export function DriverProvider({ children }) {
  const [driverData, setDriverData] = useState(initialDriverData);

  const updateDriverData = (field, value) => {
    setDriverData(previousData => ({
      ...previousData,
      [field]: value,
    }));
  };

  const resetDriverData = () => {
    setDriverData(initialDriverData);
  };

  return (
    <DriverContext.Provider
      value={{
        driverData,
        updateDriverData,
        resetDriverData,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
}