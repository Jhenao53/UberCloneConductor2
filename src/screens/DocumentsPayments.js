import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { DriverContext } from '../context/DriverContext';
import { uploadImage } from '../config/uploadImage';

export default function DocumentsPayments() {
  const { driverData, updateDriverData, resetDriverData, errors, setErrors } = useContext(DriverContext);
  const [uploadingField, setUploadingField] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [activeDateField, setActiveDateField] = useState(null);

  const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getValidDate = (dateString) => {
    if (!dateString) return new Date();
    const d = new Date(`${dateString}T12:00:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const uploadDocumentPhoto = async (imageUri, field, folder) => {
    try {
      if (!imageUri) throw new Error('No se recibió la fotografía.');
      setUploadingField(field);
      const url = await uploadImage(imageUri, folder);
      updateDriverData(field, url);
      setErrors(prev => ({ ...prev, [field]: null }));
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo subir la fotografía.');
    } finally {
      setUploadingField('');
    }
  };

  const choosePhoto = async (field, folder, useCamera = false) => {
    try {
      let permission = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync() 
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permiso necesario', 'Debes permitir el acceso a la cámara o galería.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });

      if (!result.canceled) await uploadDocumentPhoto(result.assets[0].uri, field, folder);
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la fotografía.');
    }
  };

  const showPhotoOptions = (field, folder) => {
    if (uploadingField || saving || deleting) return;
    Alert.alert('Agregar fotografía', 'Selecciona cómo deseas agregar el documento.', [
      { text: 'Tomar foto', onPress: () => choosePhoto(field, folder, true) },
      { text: 'Elegir de galería', onPress: () => choosePhoto(field, folder, false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleDateChange = (event, selectedDate, field) => {
    if (Platform.OS === 'android') setActiveDateField(null); 
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().slice(0, 10);
      updateDriverData(field, formattedDate);
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const renderInput = (label, field, placeholder, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && { borderColor: 'red', borderWidth: 2 }]}
        value={driverData[field] || ''}
        placeholder={placeholder}
        placeholderTextColor="#999"
        onChangeText={(value) => {
          updateDriverData(field, value);
          setErrors(prev => ({ ...prev, [field]: null }));
        }}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderDateInput = (label, field) => {
    const isActive = activeDateField === field;
    const isFutureAllowed = field !== 'registrationDate';

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity activeOpacity={1} onPress={() => setActiveDateField(isActive ? null : field)}>
          <View pointerEvents="none">
            <TextInput
              style={[styles.input, errors[field] && { borderColor: 'red', borderWidth: 2 }]}
              value={driverData[field] || ''}
              placeholder="Toca para seleccionar fecha"
              placeholderTextColor="#999"
              editable={false}
            />
          </View>
        </TouchableOpacity>
        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}

        {isActive && (
          <View style={styles.pickerContainer}>
            {Platform.OS === 'ios' && (
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setActiveDateField(null)}>
                  <Text style={styles.pickerButton}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}
            <DateTimePicker
              value={getValidDate(driverData[field])}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={isFutureAllowed ? new Date() : undefined} 
              maximumDate={!isFutureAllowed ? new Date() : undefined}
              onChange={(event, selectedDate) => handleDateChange(event, selectedDate, field)}
            />
          </View>
        )}
      </View>
    );
  };

  const renderPhoto = (label, field, folder) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.photoContainer, errors[field] && { borderColor: 'red', borderWidth: 2 }]}>
        {driverData[field] ? (
          <Image source={{ uri: driverData[field] }} style={styles.documentImage} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>📄</Text>
            <Text style={styles.photoPlaceholderText}>Documento sin fotografía</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.photoButton, uploadingField === field && styles.disabledButton]}
          onPress={() => showPhotoOptions(field, folder)}
          disabled={!!uploadingField || saving || deleting}
        >
          {uploadingField === field ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.photoButtonText}>{driverData[field] ? 'Cambiar fotografía' : 'Agregar fotografía'}</Text>
          )}
        </TouchableOpacity>
      </View>
      {errors[field] && <Text style={[styles.errorText, {textAlign: 'center'}]}>{errors[field]}</Text>}
    </View>
  );

  const validateAndSubmit = async () => {
    let newErrors = {};
    const requiredFields = [
      'fullName', 'document', 'phone', 'birthDate', 'gender', 'email', 'language',
      'category', 'plate', 'brand', 'model', 'year', 'color', 'capacity',
      'licenseNumber', 'licenseExpiry', 'soatExpiry', 'registrationDate', 'technicalReviewExpiry', 'mercadoPagoEmail'
    ];

    requiredFields.forEach(field => {
      if (!driverData[field]) newErrors[field] = 'Este campo es obligatorio';
    });

    if (!driverData.profilePhoto) newErrors.profilePhoto = 'Falta foto de perfil';
    if (!driverData.vehiclePhoto) newErrors.vehiclePhoto = 'Falta foto del vehículo';
    if (!driverData.licensePhoto) newErrors.licensePhoto = 'Falta foto de licencia';
    if (!driverData.soatPhoto) newErrors.soatPhoto = 'Falta foto del SOAT';
    if (!driverData.technicalReviewPhoto) newErrors.technicalReviewPhoto = 'Falta foto de revisión';
    if (!driverData.termsAccepted) newErrors.termsAccepted = 'Debes aceptar los términos y condiciones';

    if (driverData.year && parseInt(driverData.year) > 2027) {
      newErrors.year = 'El año no puede ser mayor a 2027';
    }

    // --- VALIDACIÓN ESTRICTA DE MAYORÍA DE EDAD (18 AÑOS) ---
    if (driverData.birthDate) {
      const parts = driverData.birthDate.split('/');
      if (parts.length === 3) {
        const dob = new Date(parts[2], parts[1] - 1, parts[0]);
        const todayObj = new Date();
        let age = todayObj.getFullYear() - dob.getFullYear();
        if (todayObj.getMonth() < dob.getMonth() || (todayObj.getMonth() === dob.getMonth() && todayObj.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 18) {
          newErrors.birthDate = 'El conductor debe ser mayor de 18 años';
        }
      }
    }

    const current = today();
    
    if (driverData.licenseExpiry && driverData.licenseExpiry <= current) newErrors.licenseExpiry = 'Debe ser posterior a la fecha actual';
    if (driverData.soatExpiry && driverData.soatExpiry <= current) newErrors.soatExpiry = 'Debe ser posterior a la fecha actual';
    if (driverData.technicalReviewExpiry && driverData.technicalReviewExpiry <= current) newErrors.technicalReviewExpiry = 'Debe ser posterior a la fecha actual';
    if (driverData.registrationDate && driverData.registrationDate > current) newErrors.registrationDate = 'No puede ser una fecha futura';

    if (driverData.mercadoPagoEmail && !/^\S+@\S+\.\S+$/.test(driverData.mercadoPagoEmail)) {
      newErrors.mercadoPagoEmail = 'Formato de correo inválido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Alert.alert('Campos incompletos', 'Revisa las pestañas anteriores, hay campos obligatorios marcados en rojo.');
      return;
    }

    try {
      setSaving(true);
      await setDoc(
        doc(db, 'drivers', 'localDriver'),
        {
          ...driverData,
          status: 'pending', 
          isAvailable: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      Alert.alert('Registro enviado', 'Tu cuenta está "Pendiente de aprobación".');
    } catch (error) {
      Alert.alert('Error', `No se pudo guardar el registro: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'drivers', 'localDriver'));
      resetDriverData();
      Alert.alert('Usuario eliminado', 'El registro fue eliminado.');
    } catch (error) {
      Alert.alert('Error', `No se pudo eliminar el usuario: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Documentos y Pagos</Text>
      
      {renderInput('Número de licencia *', 'licenseNumber', 'Ej: 12345678', 'numeric')}
      {renderPhoto('Fotografía de licencia *', 'licensePhoto', 'documents')}
      {renderDateInput('Vencimiento de licencia *', 'licenseExpiry')}
      
      {renderPhoto('Fotografía del SOAT *', 'soatPhoto', 'documents')}
      {renderDateInput('Vencimiento del SOAT *', 'soatExpiry')}

      {renderDateInput('Fecha de matrícula *', 'registrationDate')}

      {renderPhoto('Fotografía Tecnomecánica *', 'technicalReviewPhoto', 'documents')}
      {renderDateInput('Vencimiento Tecnomecánica *', 'technicalReviewExpiry')}

      {renderInput('Correo de Mercado Pago *', 'mercadoPagoEmail', 'correo@mercadopago.com', 'email-address')}

      {/* Checkbox de términos */}
      <TouchableOpacity 
         style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
         onPress={() => {
           updateDriverData('termsAccepted', !driverData.termsAccepted);
           setErrors(prev => ({ ...prev, termsAccepted: null }));
         }}
      >
         <View style={[styles.checkbox, driverData.termsAccepted && styles.checkboxChecked, errors.termsAccepted && { borderColor: 'red', borderWidth: 2 }]}>
            {driverData.termsAccepted && <Text style={{color: 'white', fontWeight: 'bold'}}>✓</Text>}
         </View>
         <Text style={{flex: 1, marginLeft: 10, fontSize: 13, color: errors.termsAccepted ? 'red' : '#333'}}>
            Acepto los términos y condiciones y el cobro de la comisión de plataforma del 20% por viaje.
         </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={validateAndSubmit}
        disabled={saving || deleting}
      >
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Enviar Registro</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, deleting && styles.disabledButton]}
        onPress={() => Alert.alert('Eliminar usuario', '¿Seguro?', [{text: 'Cancelar', style: 'cancel'}, {text: 'Eliminar', style: 'destructive', onPress: confirmDelete}])}
        disabled={saving || deleting}
      >
        <Text style={styles.deleteButtonText}>Eliminar usuario de prueba</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#222222', marginBottom: 25 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333333', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, color: '#222' },
  errorText: { color: 'red', fontSize: 12, marginTop: 4, marginLeft: 4 },
  photoContainer: { alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5DCE5', borderRadius: 12, padding: 20 },
  documentImage: { width: '100%', height: 190, borderRadius: 10, marginBottom: 15, resizeMode: 'cover' },
  photoPlaceholder: { width: '100%', height: 190, backgroundColor: '#E8EDF2', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  photoIcon: { fontSize: 45 },
  photoPlaceholderText: { fontSize: 13, color: '#777777', marginTop: 8 },
  photoButton: { backgroundColor: '#174D75', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  photoButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
  saveButton: { backgroundColor: '#28A745', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  deleteButton: { backgroundColor: 'transparent', padding: 15, alignItems: 'center', borderWidth: 1, borderColor: 'red', borderRadius: 10 },
  deleteButtonText: { color: 'red', fontWeight: 'bold', fontSize: 15 },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: '#174D75', borderColor: '#174D75' },
  pickerContainer: { backgroundColor: '#fff', borderRadius: 10, marginTop: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#DDDDDD' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderColor: '#ccc' },
  pickerButton: { color: '#174D75', fontWeight: 'bold', fontSize: 16 }
});