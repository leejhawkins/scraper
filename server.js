require("dotenv").config();
var express = require("express");
var exphbs = require("express-handlebars");
var logger = require("morgan");
var { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access')
var Handlebars = require('handlebars');
var mongoose = require("mongoose");


// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make public a static folder
app.use(express.static("public"));
app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main",
        handlebars: allowInsecurePrototypeAccess(Handlebars)
    })
);
app.set("view engine", "handlebars");
// Connect to the Mongo DB
mongoose.Promise = global.Promise;
mongoose.connect(
    process.env.MONGODB_URI ||
    "mongodb://leejhawkins:hotsauce26@ds031995.mlab.com:31995/heroku_q3cw6k5t",
    {
        useNewURLParser: true
    }
);

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.politifact.com/factchecks/list/?speaker=donald-trump").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);

        // Now, we grab every h2 within an article tag, and do the following:
        $("div.m-statement__content").each(function (i, element) {
            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .find("a")
                .text();
            result.link = $(this)
                .find("a")
                .attr("href");
            result.rating = $(this)
                .find("picture")
                .children()
                .attr("src")
            console.log(result.title)
            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function (dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, log it
                    console.log(err);
                });
        });

        // Send a message to the client
        res.send("Scrape Complete");
    });
});

// Route for getting all Articles from the db
app.get("/", function (req, res) {
    db.Article.find({}).then(function (dbArticles) {
        res.render("index", {
            articles: dbArticles
        })
    })
        .catch(function (err) {
            res.json(err)
        })
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        .then(function (dbArticle) {
            axios.get("https://www.politifact.com" + dbArticle.link).then(function (response) {
                // Then, we load that into cheerio and save it to $ for a shorthand selector
                
                var $ = cheerio.load(response.data);
                var summary = [];
               
                // Now, we grab every h2 within an article tag, and do the following:
                $("div.short-on-time li").each(function (i, element) {
                        if (!($(this).find("p").text()==="")) {
                            summary.push($(this).find("p").text())
                            console.log(summary)
                               
                        } else {
                            summary.push($(this).text())
                        }
                                      
                });
                $("div.short-on-time p").each(function (i, element) {
                        var match = false;
                        for (let j=0;j<summary.length;j++) {
                            if ($(this).text()===summary[j]) {
                                match = true
                            }
                        }
                        if(!match) {
                            summary.push($(this).text())
                        }
                });

                 dbArticle = {
                    _id : dbArticle._id,
                    title : dbArticle.title,
                    link : dbArticle.link,
                    note : dbArticle.note,
                    rating : dbArticle.rating,
                    summary:summary
                }
            
                res.json(dbArticle);
            });
            
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { note: dbNote._id } }, { new: true });
        })
        .then(function (dbArticle) {
            console.log(dbArticle)
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
