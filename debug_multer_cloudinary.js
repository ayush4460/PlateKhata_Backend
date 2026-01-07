const lib = require('multer-storage-cloudinary');
console.log('Type of lib:', typeof lib);
console.log('Exports:', lib);
try {
  const { CloudinaryStorage } = lib;
  console.log('CloudinaryStorage:', CloudinaryStorage);
  new CloudinaryStorage({});
} catch (e) {
  console.log('Error instantiating CloudinaryStorage:', e.message);
}
