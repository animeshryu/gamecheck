const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

dotenv.config();

const app = express();
const port = 3001;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const gameSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: {
    data: Buffer,
    contentType: String,
  },
  downloadLink: String,
  createdAt: { type: Date, default: Date.now },
});

const Game = mongoose.model("games", gameSchema);

const storage = multer.memoryStorage(); // Store images in memory
const upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(express.static("public"));

// Set up the uploads folder
const uploadsFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder);
}

// Middleware to handle file upload and renaming
const uploadMiddleware = upload.single("image");

app.post("/add-games", async (req, res) => {
  try {
    // Use uploadMiddleware before processing the form data
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error("Error uploading file:", err);
        return res.status(500).json({ error: "Error uploading file" });
      }

      const { title, content, downloadLink } = req.body;

      const newGame = new Game({
        title,
        content,
        image: {
          data: req.file.buffer.toString("base64"),
          contentType: req.file.mimetype,
        },
        downloadLink,
      });

      const savedGame = await newGame.save();

      res.json(savedGame);
    });
  } catch (error) {
    console.error("Error adding game:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/get-games", async (req, res) => {
  try {
    const allGames = await Game.find();
    res.json(allGames);
  } catch (error) {
    console.error("Error fetching game data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/search-games", async (req, res) => {
  try {
    const keyword = req.body.keyword;
    const searchResults = await Game.find({
      title: { $regex: keyword, $options: "i" },
    });
    res.json(searchResults);
  } catch (error) {
    console.error("Error searching game data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/game", async (req, res) => {
  try {
    const gameName = req.query.name;
    const game = await Game.findOne({ title: gameName });

    if (!game) {
      return res.status(404).send("Game not found");
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${game.title}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
  
            h2 {
              text-align: center;
              margin-top: 20px;
              color: #333;
            }
  
            .gameDetails {
              max-width: 600px;
              margin: 20px auto;
              background-color: #fff;
              border-radius: 5px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              padding: 20px;
            }
  
            .gameImage {
              max-width: 100%;
              height: auto;
              border-radius: 5px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <h2>${game.title}</h2>
          <div class="gameDetails">
            <p>${game.content}</p>
            ${
              game.image
                ? `<img src="data:${
                    game.image.contentType
                  };base64,${game.image.data.toString(
                    "base64"
                  )}" class="gameImage" alt="${game.title}">`
                : ""
            }
            <p>Download Link: <a href="${game.downloadLink}" target="_blank">${
      game.downloadLink
    }</a></p>
          </div>
        </body>
        </html>
      `);
  } catch (error) {
    console.error("Error fetching game details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/g", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "addGames.html"));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
