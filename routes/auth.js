const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Créer un nouvel utilisateur
 *     tags:
 *       - Authentification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *                 description: L'adresse e-mail de l'utilisateur
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: Le mot de passe de l'utilisateur (doit être sécurisé)
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User created!"
 *       400:
 *         description: Erreur lors de la création de l'utilisateur (e.g., e-mail déjà utilisé ou mot de passe trop court)
 *       500:
 *         description: Erreur serveur lors de l'enregistrement de l'utilisateur
 */
router.post("/signup", (req, res) => {
  bcrypt.hash(req.body.password, 10).then((hash) => {
    const user = new User({
      email: req.body.email,
      password: hash,
    });
    user
      .save()
      .then(() => res.status(201).json({ message: "User created!" }))
      .catch((error) => res.status(400).json({ error }));
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connecter un utilisateur
 *     tags:
 *       - Authentification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *                 description: L'adresse e-mail de l'utilisateur
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: Le mot de passe de l'utilisateur
 *     responses:
 *       200:
 *         description: Connexion réussie, retourne l'ID utilisateur et un token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   example: "603d2149f1b2c824b87b27b9"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MDNkMjE0OWYxYjJjODI0Yjg3YjI3YjkiLCJpYXQiOjE2MTQ5MDIwMDAsImV4cCI6MTYxNTAwMjAwMH0.zVg2Nc-sJYDlA"
 *       400:
 *         description: Erreur lors de la connexion, e-mail ou mot de passe invalide
 *       401:
 *         description: Non autorisé, mot de passe incorrect ou utilisateur non trouvé
 */
router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }).then((user) => {
    if (!user) {
      return res.status(401).json({ message: "User not found!" });
    }
    bcrypt.compare(req.body.password, user.password).then((valid) => {
      if (!valid) {
        return res.status(401).json({ message: "Incorrect password!" });
      }
      const token = jwt.sign({ userId: user._id }, "RANDOM_TOKEN_SECRET", {
        expiresIn: "24h",
      });
      res.status(200).json({ userId: user._id, token });
    });
  });
});

module.exports = router;
