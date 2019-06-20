const express = require('express');
const router  = express.Router();
const db = require('../clients/sqlite3');
const SqlClient = new db();

SqlClient.init();

router.get('/movies', (req, res, next) => {
  const page = req.query.page || 1;
  SqlClient.getAllMovies({ page }, (err, results) => {
    if (err) return res.send(err);
    res.send(results);
  });

});

router.get('/movie/:id', (req, res) => {
  const movieId = req.params.id;
  const fields = ['imdbId', 'title', 'overview', 'releaseDate', 'budget', 'runtime', 'genres', 'language', 'productionCompanies'];
  SqlClient.getOneMovie(movieId, fields, (err, results) => {
    if (err) return res.send(err);
    res.send(results);
  });
});

router.get('/movies/year/:year', (req, res) => {
  const year = req.params.year;
  const page = req.query.page || 1;
  const sort = req.query.sort || 'ASC';
  SqlClient.getMoviesByYear({ year, page, sort }, (err, results) => {
    if (err) return res.send(err);
    res.send(results);
  })
});

router.get('/movies/genre/:genre', (req, res) => {
  const genre = req.params.genre;
  const page = req.query.page || 1;
  SqlClient.getMoviesByGenre({ genre, page }, (err, results) => {
    if (err) return res.send(err);
    res.send(results);
  });
});


module.exports = router;