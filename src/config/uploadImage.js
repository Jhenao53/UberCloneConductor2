
import { File, UploadType } from 'expo-file-system';

const CLOUD_NAME = 'hlksw1ic';
const UPLOAD_PRESET = 'uberclone_upload';

export const uploadImage = async (imageUri, folder) => {
  try {
    if (!imageUri) {
      throw new Error('No se recibió la fotografía.');
    }

    // Usa el cargador nativo de Expo; no crea FormData en JavaScript.
    const file = new File(imageUri);
    const response = await file.upload(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'image/jpeg',
        parameters: {
          upload_preset: UPLOAD_PRESET,
          folder: `uberclone/${folder}`,
        },
      }
    );

    let result;
    try {
      result = JSON.parse(response.body);
    } catch {
      throw new Error('Cloudinary devolvió una respuesta inválida.');
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        result.error?.message || 'Error al subir la fotografía.'
      );
    }

    if (!result.secure_url) {
      throw new Error('Cloudinary no devolvió la URL.');
    }

    console.log('FOTOGRAFÍA SUBIDA:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.log('ERROR CLOUDINARY:', error);
    console.log('MENSAJE:', error.message);
    throw error;
  }
};

