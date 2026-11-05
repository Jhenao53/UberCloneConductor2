import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { DriverContext } from '../context/DriverContext';

export default function PersonalDetails() {

  const { driverData, updateDriverData } = useContext(DriverContext);

  const [showPicker, setShowPicker] = useState(false);
    
  const [date, setDate] = useState(new Date());

  const genderData = [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Femenino', value: 'Femenino' },
    { label: 'Otro', value: 'Otro' },
  ];

  const languageData = [
    { label: 'Español', value: 'Español' },
    { label: 'Inglés', value: 'Inglés' },
  ];

  const onChangeDate = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString('es-ES'); 
      updateDriverData('birthDate', formattedDate);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} 
    >
      <ScrollView 
        style={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>

          <Text style={styles.title}>
            Datos personales
          </Text>

          <Text style={styles.subtitle}>
            Ingresa la información del conductor
          </Text>

          {/* Nombre completo */}
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Juan Pérez"
            value={driverData.fullName}
            onChangeText={(value) => updateDriverData('fullName', value)}
            maxLength={50}
          />

          {/* Documento */}
          <Text style={styles.label}>Documento de identidad</Text>
          <TextInput
            style={styles.input}
            placeholder="Número de documento"
            value={driverData.document}
            onChangeText={(value) => updateDriverData('document', value)}
            keyboardType="numeric"
            maxLength={10}
          />

          {/* Celular */}
          <Text style={styles.label}>Número de celular</Text>
          <TextInput
            style={styles.input}
            placeholder="Número de celular"
            value={driverData.phone}
            onChangeText={(value) => updateDriverData('phone', value)}
            keyboardType="phone-pad"
            maxLength={10}
          />

          {/* Fecha de nacimiento */}
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <TouchableOpacity 
            style={styles.input} 
            onPress={() => setShowPicker(true)}
          >
            <Text style={{ color: driverData.birthDate ? '#000' : '#999' }}>
              {driverData.birthDate || "DD/MM/AAAA"}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={date} // Fecha inicial por defecto
              mode="date"
              display="default"
              maximumDate={new Date()} // Evita seleccionar fechas futuras
              onChange={onChangeDate}
            />
          )}

          {/* Género */}
          <Text style={styles.label}>Género</Text>
          <Dropdown
            style={styles.dropdownInput}
            data={genderData}
            labelField="label"
            valueField="value"
            placeholder="Selecciona una opción..."
            value={driverData.gender}
            onChange={item => {
              updateDriverData('gender', item.value);
            }}
          />

          {/* Correo electrónico */}
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            value={driverData.email}
            onChangeText={(value) => updateDriverData('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Idioma */}
          <Text style={styles.label}>Idioma</Text>
          <Dropdown
            style={styles.dropdownInput}
            data={languageData}
            labelField="label"
            valueField="value"
            placeholder="Selecciona una opción..."
            value={driverData.language}
            onChange={item => {
              updateDriverData('language', item.value);
            }}
          />

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  form: {
    padding: 20,
    paddingBottom: 35,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#174D75',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 25,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DCE5',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
  },
  dropdownInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DCE5',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
  }
});