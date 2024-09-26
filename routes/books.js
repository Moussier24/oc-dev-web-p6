const express = require("express");
const multer = require("multer");
const Book = require("../models/book");
const auth = require("../middleware/auth");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const compressImage = require("../utils/imageProcessor");

const router = express.Router();

// Configuration de Multer pour le téléchargement d'images
const upload = multer();

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Récupérer tous les livres
 *     tags:
 *       - Livres
 *     responses:
 *       200:
 *         description: Liste des livres récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       400:
 *         description: Erreur lors de la récupération des livres
 */
router.get("/", (req, res) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
});

/**
 * @swagger
 * /api/books/bestrating:
 *   get:
 *     summary: Récupérer les 3 livres ayant la meilleure note moyenne
 *     tags:
 *       - Livres
 *     responses:
 *       200:
 *         description: Liste des meilleurs livres récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       400:
 *         description: Erreur lors de la récupération des meilleurs livres
 */
router.get("/bestrating", (req, res) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
});

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Créer un nouveau livre
 *     tags:
 *       - Livres
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               book:
 *                 type: string
 *                 description: Détails du livre en tant que chaîne de caractères (JSON)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image de couverture du livre
 *     responses:
 *       201:
 *         description: Livre créé avec succès
 *       400:
 *         description: Erreur lors de la création du livre
 *       401:
 *         description: Non autorisé, token manquant ou invalide
 */
router.post("/", auth, upload.single("image"), async (req, res) => {
  let bookDetails;
  try {
    bookDetails = JSON.parse(req.body.book);
  } catch (err) {
    return res
      .status(400)
      .json({ message: "Les détails du livre doivent être un JSON valide." });
  }

  let imageUrl = "";
  try {
    if (req.file) {
      const filename = `${Date.now()}-${req.file.originalname}`;

      // Appeler la fonction utilitaire pour compresser et sauvegarder l'image
      const imagePath = await compressImage(req.file.buffer, filename);

      // Construire l'URL complète avec l'origine du backend
      imageUrl = `${req.protocol}://${req.get("host")}/${imagePath}`;
    }
  } catch (error) {
    return res.status(400).json({ error });
  }

  const book = new Book({
    userId: req.userData.userId,
    title: bookDetails.title,
    author: bookDetails.author,
    genre: bookDetails.genre,
    year: bookDetails.year,
    imageUrl: imageUrl,
    averageRating: 0,
    ratings: [],
  });

  book
    .save()
    .then(() => res.status(201).json({ message: "Livre créé avec succès !" }))
    .catch((error) => res.status(400).json({ error }));
});

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Récupérer un livre par ID
 *     tags:
 *       - Livres
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du livre
 *     responses:
 *       200:
 *         description: Détails du livre récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Livre non trouvé
 *       400:
 *         description: Erreur lors de la récupération du livre
 */
router.get("/:id", (req, res) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (!book) return res.status(404).json({ message: "Livre non trouvé !" });
      res.status(200).json(book);
    })
    .catch((error) => res.status(400).json({ error }));
});

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Mettre à jour un livre
 *     tags:
 *       - Livres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du livre à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               book:
 *                 type: string
 *                 description: Détails du livre en tant que chaîne de caractères (JSON)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image de couverture du livre (facultatif)
 *     responses:
 *       200:
 *         description: Livre mis à jour avec succès
 *       400:
 *         description: Erreur lors de la mise à jour du livre
 *       403:
 *         description: Requête non autorisée (seul le créateur peut modifier son livre)
 *       401:
 *         description: Non autorisé, token manquant ou invalide
 */
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  const bookId = req.params.id;
  let bookData;

  if (req.file) {
    try {
      const parsedBook = JSON.parse(req.body.book);
      let imageUrl = "";
      const filename = `${Date.now()}-${req.file.originalname}`;
      const imagePath = await compressImage(req.file.buffer, filename);
      imageUrl = `${req.protocol}://${req.get("host")}/${imagePath}`;

      bookData = {
        ...parsedBook,
        imageUrl,
      };
    } catch (err) {
      console.log(err);
      return res
        .status(400)
        .json({ message: "Les détails du livre doivent être un JSON valide." });
    }
  } else {
    try {
      bookData = JSON.parse(req.body.book);
    } catch (err) {
      bookData = req.body;
    }
  }

  Book.updateOne({ _id: bookId, userId: req.userData.userId }, { ...bookData })
    .then((result) => {
      if (result.nModified === 0) {
        return res.status(403).json({
          message: "Requête non autorisée ou aucune modification détectée.",
        });
      }
      res.status(200).json({ message: "Livre mis à jour avec succès !" });
    })
    .catch((error) => res.status(400).json({ error }));
});

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Supprimer un livre
 *     tags:
 *       - Livres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du livre à supprimer
 *     responses:
 *       200:
 *         description: Livre supprimé avec succès
 *       400:
 *         description: Erreur lors de la suppression du livre
 *       403:
 *         description: Requête non autorisée (seul le créateur peut supprimer son livre)
 *       401:
 *         description: Non autorisé, token manquant ou invalide
 */
router.delete("/:id", auth, async (req, res) => {
  const bookId = req.params.id;
  const session = await mongoose.startSession(); // Démarrer une transaction

  try {
    session.startTransaction(); // Commencer la transaction

    // Rechercher le livre à supprimer
    const book = await Book.findOne({
      _id: bookId,
      userId: req.userData.userId,
    }).session(session);

    if (!book) {
      await session.abortTransaction(); // Annuler la transaction si le livre n'est pas trouvé
      return res
        .status(403)
        .json({ message: "Requête non autorisée ou livre non trouvé." });
    }

    // Extraire le nom du fichier à partir de l'URL de l'image
    const filename = book.imageUrl ? book.imageUrl.split("/images/")[1] : null;

    // Si l'image existe, tenter de la supprimer
    if (filename) {
      const imagePath = path.join(__dirname, "..", "images", filename);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Erreur lors de la suppression de l'image :", err);
        }
      });
    }

    // Si la suppression de l'image est réussie, supprimer le livre
    await Book.deleteOne({ _id: bookId }).session(session);

    await session.commitTransaction(); // Valider la transaction
    session.endSession();

    res.status(200).json({ message: "Livre et image supprimés avec succès !" });
  } catch (error) {
    await session.abortTransaction(); // Annuler la transaction en cas d'erreur
    session.endSession();
    console.error("Erreur lors de la suppression du livre :", error);
    res.status(500).json({ error });
  }
});

/**
 * @swagger
 * /api/books/{id}/rating:
 *   post:
 *     summary: Noter un livre
 *     tags:
 *       - Livres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du livre à noter
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 description: Note donnée au livre (entre 0 et 5)
 *                 example: 4
 *     responses:
 *       200:
 *         description: Note ajoutée avec succès, renvoie les détails mis à jour du livre
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Erreur lors de l'ajout de la note
 *       403:
 *         description: Requête non autorisée (un utilisateur ne peut pas noter deux fois le même livre)
 *       401:
 *         description: Non autorisé, token manquant ou invalide
 */
router.post("/:id/rating", auth, (req, res) => {
  const { rating } = req.body;

  if (rating === undefined || rating < 0 || rating > 5) {
    return res
      .status(400)
      .json({ message: "La note doit être comprise entre 0 et 5." });
  }

  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (!book) return res.status(404).json({ message: "Livre non trouvé !" });

      // Vérifier si l'utilisateur a déjà noté ce livre
      const existingRating = book.ratings.find(
        (r) => r.userId === req.userData.userId
      );
      if (existingRating) {
        return res
          .status(403)
          .json({ message: "Vous avez déjà noté ce livre." });
      }

      // Ajouter la note
      book.ratings.push({ userId: req.userData.userId, grade: rating });

      // Mettre à jour la note moyenne
      const totalRatings = book.ratings.length;
      const averageRating =
        book.ratings.reduce((acc, cur) => acc + cur.grade, 0) / totalRatings;
      book.averageRating = averageRating;

      // Sauvegarder les modifications
      book
        .save()
        .then((updatedBook) => res.status(200).json(updatedBook))
        .catch((error) => res.status(400).json({ error }));
    })
    .catch((error) => res.status(400).json({ error }));
});

module.exports = router;
