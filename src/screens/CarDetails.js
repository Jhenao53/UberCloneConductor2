import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DriverContext } from '../context/DriverContext';
import { uploadImage } from '../config/uploadImage';

export default function CarDetails() {
  const { driverData, updateDriverData, errors, setErrors } = useContext(DriverContext);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [yearDate, setYearDate] = useState(new Date());

  const [categoryItems] = useState([
    { label: 'Económico', value: 'economy' },
    { label: 'XL', value: 'xl' },
    { label: 'Premium', value: 'premium' },
  ]);

  const [colorItems] = useState([
    { label: 'Blanco', value: 'Blanco' },
    { label: 'Negro', value: 'Negro' },
    { label: 'Gris', value: 'Gris' },
    { label: 'Rojo', value: 'Rojo' },
    { label: 'Azul', value: 'Azul' },
    { label: 'Verde', value: 'Verde' },
    { label: 'Plateado', value: 'Plateado' },
  ]);

  const uploadVehiclePhoto = async (imageUri) => {
    try {
      if (!imageUri) throw new Error('No se recibió la fotografía.');
      setUploadingPhoto(true);
      const downloadURL = await uploadImage(imageUri, 'vehiclePhoto');
      updateDriverData('vehiclePhoto', downloadURL);
      setErrors(prev => ({ ...prev, vehiclePhoto: null }));
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo subir la fotografía.');
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
        Alert.alert('Permiso necesario', 'Debes permitir el acceso.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });

      if (!result.canceled) await uploadVehiclePhoto(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la fotografía.');
    }
  };

  const selectVehiclePhoto = () => {
    if (uploadingPhoto) return;
    Alert.alert('Fotografía del vehículo', 'Asegúrate de que la placa sea visible.', [
      { text: 'Tomar foto', onPress: () => choosePhoto(true) },
      { text: 'Elegir de galería', onPress: () => choosePhoto(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const onChangeYear = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowYearPicker(false);
    if (selectedDate) {
      setYearDate(selectedDate);
      const selectedYear = selectedDate.getFullYear().toString();
      updateDriverData('year', selectedYear);
      
      if (parseInt(selectedYear) > 2027) {
        setErrors(prev => ({ ...prev, year: 'El año no puede ser mayor a 2027' }));
      } else {
        setErrors(prev => ({ ...prev, year: null }));
      }
    }
  };

  const renderInput = (label, field, placeholder, keyboardType = 'default') => (
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
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Datos del vehículo</Text>

      {/* FOTOGRAFÍA DEL VEHÍCULO */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Fotografía del vehículo *</Text>
        <View style={[styles.photoContainer, errors.vehiclePhoto && { borderColor: 'red', borderWidth: 2 }]}>
          {driverData.vehiclePhoto ? (
            <Image source={{ uri: driverData.vehiclePhoto }} style={styles.vehicleImage} />
          ) : (
            <View style={styles.photoPlaceholder}><Text style={styles.photoIcon}>🚗</Text><Text style={styles.photoPlaceholderText}>Sin fotografía</Text></View>
          )}
          <TouchableOpacity style={[styles.photoButton, uploadingPhoto && styles.disabledButton]} onPress={selectVehiclePhoto} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <View style={styles.loadingContainer}><ActivityIndicator color="#FFFFFF" /><Text style={styles.photoButtonText}>Subiendo...</Text></View>
            ) : (
              <Text style={styles.photoButtonText}>{driverData.vehiclePhoto ? 'Cambiar fotografía' : 'Agregar fotografía'}</Text>
            )}
          </TouchableOpacity>
        </View>
        {errors.vehiclePhoto && <Text style={[styles.errorText, {textAlign: 'center'}]}>{errors.vehiclePhoto}</Text>}
      </View>

      {/* CATEGORÍA */}
      <View style={[styles.inputContainer, { zIndex: 3000 }]}>
        <Text style={styles.label}>Categoría del vehículo *</Text>
        <DropDownPicker
          open={categoryOpen} value={driverData.category || null} items={categoryItems} setOpen={setCategoryOpen}
          setValue={(callback) => {
            const nextValue = typeof callback === 'function' ? callback(driverData.category || null) : callback;
            updateDriverData('category', nextValue);
            setErrors(prev => ({ ...prev, category: null }));
          }}
          placeholder="Selecciona una categoría"
          style={[styles.dropdown, errors.category && { borderColor: 'red', borderWidth: 2 }]}
          dropDownContainerStyle={styles.dropdownList} zIndex={3000} listMode="SCROLLVIEW"
        />
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
      </View>

      {renderInput('Placa *', 'plate', 'Ej: ABC123')}
      {renderInput('Marca *', 'brand', 'Ej: Chevrolet')}
      {renderInput('Modelo *', 'model', 'Ej: Onix')}

      {/* AÑO */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Año *</Text>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowYearPicker(true)}>
          <View pointerEvents="none">
            <TextInput
              style={[styles.input, errors.year && { borderColor: 'red', borderWidth: 2 }]}
              placeholder="Toca para seleccionar el año"
              placeholderTextColor="#999"
              value={driverData.year || ''}
              editable={false}
            />
          </View>
        </TouchableOpacity>
        {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
        
        {/* CONTENEDOR DEL CALENDARIO CON BOTÓN "LISTO" */}
        {showYearPicker && (
          <View style={styles.pickerContainer}>
            {Platform.OS === 'ios' && (
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                  <Text style={styles.pickerButton}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}
            <DateTimePicker 
              value={yearDate} 
              mode="date" 
              display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
              onChange={onChangeYear} 
            />
          </View>
        )}
      </View>

      {/* COLOR */}
      <View style={[styles.inputContainer, { zIndex: 2000 }]}>
        <Text style={styles.label}>Color del vehículo *</Text>
        <DropDownPicker
          open={colorOpen} value={driverData.color || null} items={colorItems} setOpen={setColorOpen}
          setValue={(callback) => {
            const nextValue = typeof callback === 'function' ? callback(driverData.color || null) : callback;
            updateDriverData('color', nextValue);
            setErrors(prev => ({ ...prev, color: null }));
          }}
          placeholder="Selecciona un color"
          style={[styles.dropdown, errors.color && { borderColor: 'red', borderWidth: 2 }]}
          dropDownContainerStyle={styles.dropdownList} zIndex={2000} listMode="SCROLLVIEW"
        />
        {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
      </View>

      {renderInput('Capacidad de pasajeros *', 'capacity', 'Ej: 4', 'numeric')}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#222222', marginBottom: 25 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333333', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, color: '#222222' },
  dropdown: { backgroundColor: '#FFFFFF', borderColor: '#DDDDDD', borderRadius: 10, minHeight: 50 },
  dropdownList: { backgroundColor: '#FFFFFF', borderColor: '#DDDDDD', borderRadius: 10 },
  errorText: { color: 'red', fontSize: 12, marginTop: 4, marginLeft: 4 },
  photoContainer: { alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5DCE5', borderRadius: 12, padding: 20 },
  vehicleImage: { width: '100%', height: 190, borderRadius: 10, marginBottom: 15, resizeMode: 'cover' },
  photoPlaceholder: { width: '100%', height: 190, backgroundColor: '#E8EDF2', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  photoIcon: { fontSize: 45 },
  photoPlaceholderText: { fontSize: 13, color: '#777777', marginTop: 8 },
  photoButton: { backgroundColor: '#174D75', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  photoButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disabledButton: { opacity: 0.6 },
  pickerContainer: { backgroundColor: '#fff', borderRadius: 10, marginTop: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#DDDDDD' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderColor: '#ccc' },
  pickerButton: { color: '#174D75', fontWeight: 'bold', fontSize: 16 }
});