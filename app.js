const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");

require("dotenv").config();

const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");

const app = express();

app.use(cors());

// Configuration de Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "API Books Documentation",
      version: "1.0.0",
      description: "API de gestion des livres",
      contact: {
        name: "Cheik Cissé",
        url: "https://example.com",
        email: "email@example.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Serveur local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Book: {
          type: "object",
          required: ["userId", "title", "author"],
          properties: {
            userId: {
              type: "string",
              description: "ID de l'utilisateur qui a créé le livre",
            },
            title: {
              type: "string",
              description: "Titre du livre",
            },
            author: {
              type: "string",
              description: "Auteur du livre",
            },
            imageUrl: {
              type: "string",
              description: "URL de l'image de couverture",
            },
            year: {
              type: "number",
              description: "Année de publication du livre",
            },
            genre: {
              type: "string",
              description: "Genre du livre",
            },
            ratings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  grade: { type: "number" },
                },
              },
              description: "Notes attribuées au livre",
            },
            averageRating: {
              type: "number",
              description: "Note moyenne du livre",
            },
          },
          example: {
            userId: "603d2149f1b2c824b87b27b9",
            title: "Le Petit Prince",
            author: "Antoine de Saint-Exupéry",
            imageUrl: "/images/1609459200000-lepetitprince.jpg",
            year: 1943,
            genre: "Fiction",
            ratings: [
              {
                userId: "603d2149f1b2c824b87b27b9",
                grade: 5,
              },
              {
                userId: "603d2149f1b2c824b87b27ba",
                grade: 4,
              },
            ],
            averageRating: 4.5,
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // Indique où Swagger doit chercher les définitions d'API (les commentaires dans les fichiers routes)
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Connexion à MongoDB
mongoose
  .connect(process.env.MONGODB_PATH)
  .then(() => console.log("Connecté à MongoDB Atlas"))
  .catch((error) => console.log("Connexion échouée !", error));

app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

module.exports = app;
