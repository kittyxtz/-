async function imagePng(file) {
  if (file.unavailable) throw new Error('Image unavailable');
  let blob = file.blob;
  if (!blob) {
    const response = await fetch(file.url || file.href);
    if (!response.ok) throw new Error('Image unavailable');
    blob = await response.blob();
  }
  if (blob.type === 'image/png') return blob;
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image conversion unavailable');
    context.drawImage(image, 0, 0);
    return await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image conversion failed')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export default function copyChatImage(file) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return Promise.reject(new Error('Image clipboard unavailable'));
  // Start the clipboard write during the click, including on browsers that require user activation.
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': imagePng(file) })]);
}
