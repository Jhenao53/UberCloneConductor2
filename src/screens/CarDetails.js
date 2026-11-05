
import React, { useContext, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import DropDownPicker from 'react-native-dropdown-picker';

import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp, 
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { DriverContext } from '../context/DriverContext';

export default function CarDetails() {
  const {
    driverData,
    updateDriverData,
    resetDriverData,
  } = useContext(DriverContext);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

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

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // VALIDAR Y GUARDAR CONDUCTOR
  const saveDriver = async () => {

    // Revisar que todos los campos estén completos
    const camposVacios = Object.entries(driverData).filter(
      ([campo, valor]) => {
        return (
          campo !== 'updatedAt' &&
          (
            valor === null ||
            valor === undefined ||
            String(valor).trim() === ''
          )
        );
      }
    );

    // Si hay campos vacíos, impedir el guardado
    if (camposVacios.length > 0) {
      Alert.alert(
        'Campos obligatorios',
        'Debes completar todos los campos personales y del vehículo antes de guardar.'
      );
      return;
    }

    try {
      setSaving(true);

      await setDoc(doc(db, 'drivers', 'localDriver'), {
        ...driverData,
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Registro guardado',
        'Los datos del conductor se guardaron correctamente.'
      );

    } catch (error) {
      console.log('Error al guardar:', error);

      Alert.alert(
        'Error',
        `No se pudieron guardar los datos: ${error.message}`
      );

    } finally {
      setSaving(false);
    }
  };

  // SOLICITAR CONFIRMACIÓN PARA ELIMINAR
  const deleteDriver = () => {
    Alert.alert(
      'Eliminar usuario',
      '¿Estás seguro de que deseas eliminar todos los datos del conductor y del vehículo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  // ELIMINAR CONDUCTOR DE FIREBASE
  const confirmDelete = async () => {
    try {
      setDeleting(true);

      await deleteDoc(doc(db, 'drivers', 'localDriver'));

      // Limpiar los datos de ambas pestañas
      resetDriverData();

      Alert.alert(
        'Usuario eliminado',
        'El registro fue eliminado correctamente.'
      );

    } catch (error) {
      console.log('Error al eliminar:', error);

      Alert.alert(
        'Error',
        `No se pudo eliminar el usuario: ${error.message}`
      );

    } finally {
      setDeleting(false);
    }
  };

  // CAMPO DE TEXTO REUTILIZABLE
  const renderInput = (
    label,
    field,
    placeholder,
    keyboardType = 'default'
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={driverData[field] || ''}
        onChangeText={(value) =>
          updateDriverData(field, value)
        }
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >

      <Text style={styles.title}>
        Datos del vehículo
      </Text>

      {/* CATEGORÍA */}
      <View style={[styles.inputContainer, { zIndex: 3000 }]}>
        <Text style={styles.label}>
          Categoría del vehículo
        </Text>

        <DropDownPicker
          open={categoryOpen}
          value={driverData.category || null}
          items={categoryItems}
          setOpen={setCategoryOpen}
          setValue={(callback) => {
            const nextValue =
              typeof callback === 'function'
                ? callback(driverData.category || null)
                : callback;

            updateDriverData('category', nextValue);
          }}
          placeholder="Selecciona una categoría"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownList}
          textStyle={styles.dropdownText}
          zIndex={3000}
          listMode="SCROLLVIEW"
        />
      </View>

      {/* Placa */}
      {renderInput(
        'Placa',
        'plate',
        'Ej: ABC123'
      )}

      {/* Marca */}
      {renderInput(
        'Marca',
        'brand',
        'Ej: Chevrolet'
      )}

      {/* Modelo */}
      {renderInput(
        'Modelo',
        'model',
        'Ej: Onix'
      )}

      {/* Año*/}
      {renderInput(
        'Año',
        'year',
        'Ej: 2022',
        'numeric'
      )}

      {/* Color */}
      <View style={[styles.inputContainer, { zIndex: 2000 }]}>
        <Text style={styles.label}>
          Color del vehículo
        </Text>

        <DropDownPicker
          open={colorOpen}
          value={driverData.color || null}
          items={colorItems}
          setOpen={setColorOpen}
          setValue={(callback) => {
            const nextValue =
              typeof callback === 'function'
                ? callback(driverData.color || null)
                : callback;

            updateDriverData('color', nextValue);
          }}
          placeholder="Selecciona un color"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownList}
          textStyle={styles.dropdownText}
          zIndex={2000}
          listMode="SCROLLVIEW"
        />
      </View>

      {/* Capacidad */}
      {renderInput(
        'Capacidad de pasajeros',
        'capacity',
        'Ej: 4',
        'numeric'
      )}

      {/* Boton Guardar */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          saving && styles.disabledButton,
        ]}
        onPress={saveDriver}
        disabled={saving || deleting}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Guardar conductor
          </Text>
        )}
      </TouchableOpacity>

      {/* Boton Eliminar*/}
      <TouchableOpacity
        style={[
          styles.deleteButton,
          deleting && styles.disabledButton,
        ]}
        onPress={deleteDriver}
        disabled={saving || deleting}
      >
        {deleting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Eliminar usuario
          </Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

// Estiles
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 25,
  },

  inputContainer: {
    marginBottom: 20,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: '#222222',
  },

  dropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDDDDD',
    borderRadius: 10,
    minHeight: 50,
  },

  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDDDDD',
    borderRadius: 10,
  },

  dropdownText: {
    fontSize: 15,
    color: '#333333',
  },

  saveButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },

  deleteButton: {
    backgroundColor: '#D32F2F',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

});
