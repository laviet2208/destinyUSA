import type { ImagePickerAsset } from 'expo-image-picker';

export async function imageUploadForm(asset: ImagePickerAsset) {
  const image = asset.file ?? await (await fetch(asset.uri)).blob();
  const form = new FormData();
  form.append('file', image, asset.fileName || 'support.jpg');
  return form;
}
