const WIDTH = 380;
const HEIGHT = 480; // proporção 19:24, a do espaço da fotografia no cartão

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
  image.src = url;
});

/** Recorta ao centro na proporção do cartão e reduz, para a fotografia ficar leve (JPEG). */
export async function preparePhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um ficheiro de imagem.');
  if (file.size > 10 * 1024 * 1024) throw new Error('A imagem é demasiado grande (máximo de 10 MB).');
  const image = await loadImage(file);
  const ratio = WIDTH / HEIGHT;
  let sw = image.width;
  let sh = image.height;
  if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, WIDTH, HEIGHT);
  return canvas.toDataURL('image/jpeg', 0.85);
}
