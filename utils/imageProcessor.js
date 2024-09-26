const sharp = require("sharp");
const path = require("path");

/**
 * Fonction utilitaire pour compresser une image.
 * @param {Buffer} fileBuffer - Le fichier en mémoire (buffer) à partir de Multer.
 * @param {string} filename - Le nom du fichier de destination.
 * @param {number} [width=800] - Largeur maximale de l'image (par défaut : 800px).
 * @param {number} [quality=80] - Qualité de compression JPEG (par défaut : 80%).
 * @returns {string} - Le chemin complet où l'image optimisée a été sauvegardée.
 */
const compressImage = async (
  fileBuffer,
  filename,
  width = 800,
  quality = 80
) => {
  const outputFilePath = path.join("images", filename);

  try {
    // Utiliser Sharp pour redimensionner et compresser l'image
    await sharp(fileBuffer)
      .resize({ width }) // Redimensionner à une largeur maximale donnée
      .jpeg({ quality }) // Compresser l'image avec une qualité donnée
      .toFile(outputFilePath); // Sauvegarder l'image optimisée

    return outputFilePath; // Retourner le chemin de sortie de l'image
  } catch (error) {
    console.error("Erreur lors de la compression de l'image :", error);
    throw error; // Lever l'erreur si quelque chose ne va pas
  }
};

module.exports = compressImage;
