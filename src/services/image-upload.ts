import type { ImagePickerAsset } from 'expo-image-picker';

export async function imageUploadForm(asset: ImagePickerAsset) {
  const form = new FormData();
  form.append('file', { uri: asset.uri, name: asset.fileName || 'support.jpg', type: asset.mimeType || 'image/jpeg' } as any);
  return form;
}
