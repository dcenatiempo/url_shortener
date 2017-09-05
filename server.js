'use strict'

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const urlMDB = process.env.MONGOLAB_URI     

const url = require('url');
const path = require('path');
const express = require('express');
const app = express();

app.engine('html', require('ejs').renderFile);  // engine to render html
app.set( 'view engine', 'html');                // set html view engine
app.use( express.static( path.join( __dirname, 'public' ) ) ); // location of static resources (css, js, etc.)
app.set( 'views', path.join( __dirname, 'views' ) ); // location of html views

function getNextURL (index){
    return index.toString(16);
}

function shortenURL (req, res) {
  let longURL = url.parse(req.params[0]);
  // TODO: Determine if longURL is a valid address
  console.log(longURL)
  // if long URL IS valid, return a json with long and short urls
  if ( (longURL.protocol == 'http:' || longURL.protocol == 'https:') && longURL.host) {
    console.log("valid url")
    MongoClient.connect(urlMDB, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      }
      else {
        console.log('Connection established! shortenURL');
        var collection = db.collection('urls');
        let count;
        collection.count((err, c) => count = c);
        collection.findOne({'original_url': longURL.href},{fields: {_id: 0}})
          .then( (result) => {
            if (result) {
              res.json(result)
            }
            else {
              console.log('No results found');
              let newURL = {
                "original_url": longURL.href,
                "short_url": "https://dbc-fcc-url-shortener.glitch.me/"+getNextURL(count+16)
              }
              collection.insertOne(newURL, {forceServerObjectId: true})
                .then((result) => {
                  console.log("added doc!", newURL);
                  res.json(newURL);
                })
            }
          })
          .then( () => {
            //Close connection
            db.close();
            console.log("Closing database connection")
          });
      }
    });
  }
  // if short URL is NOT valid, return an error
  else {
    console.log('invalid url');
    res.json({ error: "Wrong url format, make sure you have a valid protocol and real site."});
  }
}

function gotoURL (req, res) {
  let shortURL = "https://dbc-fcc-url-shortener.glitch.me/"+ req.params.shortURL;
  console.log(shortURL)
  // TODO: Determine if shortURL is in the database
  MongoClient.connect(urlMDB, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    }
    else {
      console.log('Connection established! gotoURL');
      let collection = db.collection('urls');
      collection.findOne({'short_url': shortURL})
        .then( result => {
          console.log("here is the result: ", result);
          // if shortURL IS in the database, lookup long url and go there  
          if (result) {
            console.log("found short url in database, going there now");
            // go to external page
            res.redirect(result.original_url);
          }
          // if shortURL is NOT in the database, send error
          else {
            console.log('invalid url');
            res.json({ error: "Short URL not found, please enter valid short url."});
          }
      })
      .then( () => {
        //Close connection
        db.close();
        console.log("Closing database connection. gotoURL")
      });
    }
  });
}

//renders home page
app.get('/', (req, res) => {
  res.render('index');
} );

app.get('/new/*', shortenURL);

app.get('/:shortURL', gotoURL);

app.listen(3000);