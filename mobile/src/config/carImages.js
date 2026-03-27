// Maps imageId (from carImageStore) to local asset require()
// These match the default images in src/store/carImageStore.js

const localImages = {
  'img-2': require('../../assets/cars/Range.png'),
  'img-3': require('../../assets/cars/Insignia.png'),
  'img-4': require('../../assets/cars/van.png'),
  'img-5': require('../../assets/cars/v-class.png'),
  'img-6': require('../../assets/cars/s-class.png'),
  'upload-1771856217515': require('../../assets/cars/upload-1771856217515.png'),
  'upload-1771861220653': require('../../assets/cars/upload-1771861220653.png'),
  'upload-1771861229403': require('../../assets/cars/upload-1771861229403.png'),
  'upload-1771861237097': require('../../assets/cars/upload-1771861237097.png'),
  'upload-1771861244767': require('../../assets/cars/upload-1771861244767.png'),
  'upload-1771861252322': require('../../assets/cars/upload-1771861252322.png'),
  'upload-1771861806061': require('../../assets/cars/upload-1771861806061.png'),
  'upload-1771861861400': require('../../assets/cars/upload-1771861861400.png'),
  'photo-1771866437760': require('../../assets/cars/photo-1771866437760.png'),
  'photo-1771870767643': require('../../assets/cars/photo-1771870767643.png'),
  'photo-1771875214196': require('../../assets/cars/photo-1771875214196.png'),
  'photo-1771875768816': require('../../assets/cars/photo-1771875768816.png'),
  'photo-1771875781106': require('../../assets/cars/photo-1771875781106.png'),
  'photo-1773858208008': require('../../assets/cars/photo-1773858208008.png'),
};

/**
 * Returns a require() source for use in <Image source={...} />.
 * Returns null if no image found (caller should show Car icon fallback).
 */
export function getCarImage(imageId) {
  if (!imageId) return null;
  return localImages[imageId] || null;
}
