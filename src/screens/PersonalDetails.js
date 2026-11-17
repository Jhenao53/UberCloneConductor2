import React, { useContext, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView, Image, Alert, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from 'expo-image-picker';
import { DriverContext } from '../context/DriverContext';
import { uploadImage } from '../config/uploadImage';

export default function PersonalDetails() {
  const { driverData, updateDriverData, errors, setErrors } = useContext(DriverContext);
  
  const [showPicker, setShowPicker] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // LÓGICA DE 18 AÑOS 
  // Calculamos la fecha de hace 18 años
  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);
  
  // Iniciamos el calendario en esa fecha límite
  const [date, setDate] = useState(maxBirthDate);

  const genderData = [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Femenino', value: 'Femenino' },
    { label: 'Otro', value: 'Otro' },
  ];

  const languageData = [
    { label: 'Español', value: 'Español' },
    { label: 'Inglés', value: 'Inglés' },
  ];

  const uploadProfilePhoto = async (imageUri) => {
    try {
      if (!imageUri) throw new Error('No se recibió la ruta de la fotografía.');
      setUploadingPhoto(true);
      const downloadURL = await uploadImage(imageUri, 'profilePhoto');
      updateDriverData('profilePhoto', downloadURL);
      setErrors(prev => ({ ...prev, profilePhoto: null }));
    } catch (error) {
      Alert.alert('Error al subir fotografía', error.message || 'No se pudo subir la fotografía.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const choosePhoto = async (useCamera = false) => {
    try {
      let permission = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync() 
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permiso necesario', 'Debes permitir el acceso a la cámara o galería.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });

      if (!result.canceled && result.assets?.length > 0) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la fotografía.');
    }
  };

  const selectPhoto = () => {
    if (uploadingPhoto) return;
    Alert.alert('Fotografía de perfil', 'Selecciona cómo deseas agregar tu fotografía.', [
      { text: 'Tomar foto', onPress: () => choosePhoto(true) },
      { text: 'Elegir de galería', onPress: () => choosePhoto(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      
      // Formateo para evitar errores de timezone o motor JS
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      
      updateDriverData('birthDate', formattedDate);
      setErrors(prev => ({ ...prev, birthDate: null }));
    }
  };

  const renderInput = (label, field, placeholder, keyboardType = 'default', maxLength) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && { borderColor: 'red', borderWidth: 2 }]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={driverData[field] || ''}
        onChangeText={(value) => {
          updateDriverData(field, value);
          setErrors(prev => ({ ...prev, [field]: null }));
        }}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.title}>Datos personales</Text>
          <Text style={styles.subtitle}>Ingresa la información del conductor</Text>

          {/* FOTOGRAFÍA DE PERFIL */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fotografía de perfil *</Text>
            <View style={[styles.photoContainer, errors.profilePhoto && { borderColor: 'red', borderWidth: 2 }]}>
              {uploadingPhoto ? (
                <View style={styles.photoPlaceholder}><ActivityIndicator size="large" color="#174D75" /><Text style={styles.photoPlaceholderText}>Subiendo...</Text></View>
              ) : driverData.profilePhoto ? (
                <Image source={{ uri: driverData.profilePhoto }} style={styles.profileImage} />
              ) : (
                <View style={styles.photoPlaceholder}><Text style={styles.photoIcon}>👤</Text><Text style={styles.photoPlaceholderText}>Sin fotografía</Text></View>
              )}
              <TouchableOpacity style={[styles.photoButton, uploadingPhoto && styles.disabledButton]} onPress={selectPhoto} disabled={uploadingPhoto}>
                <Text style={styles.photoButtonText}>{driverData.profilePhoto ? 'Cambiar fotografía' : 'Agregar fotografía'}</Text>
              </TouchableOpacity>
            </View>
            {errors.profilePhoto && <Text style={[styles.errorText, {textAlign: 'center'}]}>{errors.profilePhoto}</Text>}
          </View>

          {renderInput('Nombre completo *', 'fullName', 'Ej: Juan Pérez', 'default', 50)}
          {renderInput('Documento de identidad *', 'document', 'Número de documento', 'numeric', 10)}
          {renderInput('Número de celular *', 'phone', 'Número de celular', 'phone-pad', 10)}

          {/* FECHA DE NACIMIENTO */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fecha de nacimiento *</Text>
            <TouchableOpacity activeOpacity={1} onPress={() => setShowPicker(true)}>
              <View pointerEvents="none">
                <TextInput
                  style={[styles.input, errors.birthDate && { borderColor: 'red', borderWidth: 2 }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#999"
                  value={driverData.birthDate || ''}
                  editable={false}
                />
              </View>
            </TouchableOpacity>
            {errors.birthDate && <Text style={styles.errorText}>{errors.birthDate}</Text>}
            
            {/* CONTENEDOR DEL CALENDARIO */}
            {showPicker && (
              <View style={styles.pickerContainer}>
                {Platform.OS === 'ios' && (
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text style={styles.pickerButton}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker 
                  value={date} 
                  mode="date" 
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                  maximumDate={maxBirthDate} // Límite de 18 años
                  onChange={onChangeDate} 
                />
              </View>
            )}
          </View>

          {/* GÉNERO */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Género *</Text>
            <Dropdown
              style={[styles.dropdownInput, errors.gender && { borderColor: 'red', borderWidth: 2 }]}
              data={genderData} labelField="label" valueField="value" placeholder="Selecciona una opción..."
              value={driverData.gender}
              onChange={(item) => { updateDriverData('gender', item.value); setErrors(prev => ({ ...prev, gender: null })); }}
            />
            {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
          </View>

          {renderInput('Correo electrónico *', 'email', 'correo@ejemplo.com', 'email-address')}

          {/* IDIOMA */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Idioma *</Text>
            <Dropdown
              style={[styles.dropdownInput, errors.language && { borderColor: 'red', borderWidth: 2 }]}
              data={languageData} labelField="label" valueField="value" placeholder="Selecciona una opción..."
              value={driverData.language}
              onChange={(item) => { updateDriverData('language', item.value); setErrors(prev => ({ ...prev, language: null })); }}
            />
            {errors.language && <Text style={styles.errorText}>{errors.language}</Text>}
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  form: { padding: 20, paddingBottom: 35 },
  title: { fontSize: 25, fontWeight: 'bold', color: '#174D75', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666666', marginBottom: 25 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333333', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5DCE5', borderRadius: 10, padding: 13, fontSize: 15, color: '#222' },
  dropdownInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5DCE5', borderRadius: 10, padding: 13, fontSize: 15 },
  errorText: { color: 'red', fontSize: 12, marginTop: 4, marginLeft: 4 },
  photoContainer: { alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5DCE5', borderRadius: 12, padding: 20 },
  profileImage: { width: 130, height: 130, borderRadius: 65, marginBottom: 15 },
  photoPlaceholder: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#E8EDF2', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  photoIcon: { fontSize: 40 },
  photoPlaceholderText: { fontSize: 12, color: '#777777', marginTop: 5, textAlign: 'center' },
  photoButton: { backgroundColor: '#174D75', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  disabledButton: { opacity: 0.5 },
  photoButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  pickerContainer: { backgroundColor: '#fff', borderRadius: 10, marginTop: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#D5DCE5' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderColor: '#ccc' },
  pickerButton: { color: '#174D75', fontWeight: 'bold', fontSize: 16 }
});