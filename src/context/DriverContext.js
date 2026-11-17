
import React, { createContext, useState } from 'react';

export const DriverContext = createContext();

const initialDriverData = {
  // DATOS PERSONALES
  fullName: '',
  document: '',
  phone: '',
  birthDate: '',
  gender: '',
  email: '',
  language: '',
  profilePhoto: '',

  // DATOS DEL VEHÍCULO
  category: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  capacity: '',
  vehiclePhoto: '',

  // LICENCIA DE CONDUCCIÓN
  licenseNumber: '',
  licensePhoto: '',
  licenseExpiry: '',

  // SOAT
  soatPhoto: '',
  soatExpiry: '',

  // REVISIÓN TÉCNICO-MECÁNICA
  registrationDate: '',
  technicalReviewPhoto: '',
  technicalReviewExpiry: '',

  // PAGOS Y TÉRMINOS
  mercadoPagoEmail: '',
  termsAccepted: false,
};

export function DriverProvider({ children }) {
  const [driverData, setDriverData] = useState(initialDriverData);
  const [errors, setErrors] = useState({});

  const updateDriverData = (field, value) => {
    setDriverData((previousData) => ({
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
        errors,      
        setErrors,    
      }}
    >
      {children}
    </DriverContext.Provider>
  );
}
