import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export default function ProfileScreen({ navigation }) {
  const [driverData, setDriverData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'drivers', 'localDriver'));
        if (docSnap.exists()) {
          setDriverData(docSnap.data());
        }
        
        // RECUPERAR DATOS LOCALES (AsyncStorage)
        const localSettings = await AsyncStorage.getItem('@driver_settings');
        if (localSettings) {
          const parsedSettings = JSON.parse(localSettings);
          console.log('Ajustes locales recuperados:', parsedSettings);
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo cargar el perfil.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateField = (field, value) => {
    setDriverData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'drivers', 'localDriver'), {
        fullName: driverData.fullName,
        phone: driverData.phone,
        language: driverData.language,
        brand: driverData.brand,
        model: driverData.model,
        plate: driverData.plate,
        licenseNumber: driverData.licenseNumber,
        mercadoPagoEmail: driverData.mercadoPagoEmail,
        updatedAt: new Date(),
      });

      // GUARDAR DATOS LOCALES CON JSON.stringify (AsyncStorage)
      const settingsToSave = { language: driverData.language, theme: 'light', lastUpdate: new Date().toISOString() };
      await AsyncStorage.setItem('@driver_settings', JSON.stringify(settingsToSave));

      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Sesión cerrada', 'Para volver a entrar en esta demo, reinicia la aplicación.');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Borrar Cuenta',
      'Esta acción es irreversible. Perderás todos tus datos y el historial de viajes. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Borrar todo', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDoc(doc(db, 'drivers', 'localDriver'));
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la cuenta.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#174D75" />
      </View>
    );
  }

  const renderInput = (label, field, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={driverData[field] || ''}
        onChangeText={(text) => handleUpdateField(field, text)}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Datos Personales</Text>
        {renderInput('Nombre completo', 'fullName')}
        {renderInput('Celular', 'phone', 'phone-pad')}
        {renderInput('Idioma preferido', 'language')}

        <Text style={styles.sectionTitle}>Vehículo</Text>
        {renderInput('Marca', 'brand')}
        {renderInput('Modelo', 'model')}
        {renderInput('Placa', 'plate')}

        <Text style={styles.sectionTitle}>Documentos y Pagos</Text>
        {renderInput('Número de Licencia', 'licenseNumber', 'numeric')}
        {renderInput('Correo Mercado Pago', 'mercadoPagoEmail', 'email-address')}

        {/* BOTONES DE ACCIÓN */}
        <TouchableOpacity 
          style={[styles.button, styles.saveButton, saving && styles.disabled]} 
          onPress={handleSaveChanges} 
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar Cambios</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteAccount}>
          <Text style={styles.buttonText}>Borrar Cuenta</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#174D75', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 5 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DCE5', borderRadius: 8, padding: 12, fontSize: 15, color: '#222' },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  saveButton: { backgroundColor: '#28A745' },
  logoutButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#174D75' },
  deleteButton: { backgroundColor: '#ff4d4d' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  logoutText: { color: '#174D75', fontWeight: 'bold', fontSize: 16 },
  disabled: { opacity: 0.6 }
});