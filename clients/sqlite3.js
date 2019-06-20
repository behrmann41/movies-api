const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const _ = require('lodash');
const Async = require('async');
const moment = require('moment');
const Omdb = require('./Omdb');
const OmdbClient = new Omdb();

class SqlClient {
  constructor() {
    this.movies;
    this.ratings;
    this._projection = ['imdbId', 'title', 'genres', 'releaseDate', 'budget'];
    this._limit = 50;
  }

  init() {
    this.movies = new sqlite3.Database(path.join(__dirname, '..', 'db', 'movies.db'), (err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Connected to the movies database.');
    });

    this.ratings = new sqlite3.Database(path.join(__dirname, '..', 'db', 'ratings.db'), (err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Connected to the ratings database.');
    });
  }

  getAllMovies(options, callback) {
    let { page, proj } = options;

    if (!proj) proj = this._projection;

    page = this._validatePage(page);
    const start = this._limit * page;
    const offset = page == 0 ? 0 : start - this._limit;

    let sql = `SELECT ${proj.join(', ')} FROM movies LIMIT ${this._limit} OFFSET ${offset}`;

    this.movies.all(sql, [], (err, movies) => {
      if (err) return callback(err);
      const results = this._mapResults(movies);
      return callback(null, results);
    });
  }

  getOneMovie(id, projection, callback) {
    const proj = projection || this._projection;
    const movieQuery = `SELECT ${proj.join(', ')} FROM movies WHERE movieId = ${id}`;
    const ratingsQuery = `SELECT rating FROM ratings WHERE movieId = ${id}`

    Async.parallel({
      movie: (cb) => this.movies.get(movieQuery, [], cb),
      ratings: (cb) => this.ratings.all(ratingsQuery, [], cb)
    }, (err, results = {}) => {
      if (err) return callback(err);


      const { movie, ratings } = results;

      if (!movie) {
        return callback(new Error(`Unable to find movie for id: ${id}`), 404);
      }

      OmdbClient.fetchMovie(movie.imdbId, (err, resp) => {
        if (err) return callback(err);

        const omdbValues = resp;

        const result = this._mapMovieProps(movie, _.map(ratings, 'rating'), omdbValues);

        return callback(null, result);
      });

    });
  }

  getMoviesByYear(options, callback) {
    let { year, sort, page, proj } = options;
    let sql;

    sort = this._validateSort(sort);
    page = this._validatePage(page);
    const start = this._limit * page;
    const offset = page == 0 ? 0 : start - this._limit;

    if (!proj) proj = this._projection;

    if (year) {
      sql = `SELECT ${proj.join(', ')} FROM movies WHERE releaseDate LIKE '%${year}%' LIMIT ${this._limit} OFFSET ${offset}`;
    } else {
      return callback(null, []);
    }

    this.movies.all(sql, [], (err, movies) => {
      if (err) return callback(err);
      const results = this._mapResults(movies);

      const sorted = results.sort((a, b) => {
        const yearA = moment(a.releaseDate);
        const yearB = moment(b.releaseDate);
        if (sort === 'DESC') return yearB - yearA;
        return yearA - yearB;
      })
      // need to sort based on sort;
      return callback(null, sorted);
    });
  }

  getMoviesByGenre(options, callback) {
    let { genre, page, proj } = options;
    let sql;

    page = this._validatePage(page);

    const start = this._limit * page;
    const offset = page == 0 ? 0 : start - this._limit;

    if (!proj) proj = this._projection;

    if (genre) {
      sql = `SELECT ${proj.join(', ')} FROM movies WHERE genres LIKE '%${genre}%' LIMIT ${this._limit} OFFSET ${offset}`;
    } else {
      return callback(null, []);
    }

    this.movies.all(sql, [], (err, movies) => {
      if (err) return callback(err);
      const results = this._mapResults(movies);
      return callback(null, results);
    });
  }

  _mapResults(movies) {
    return _.map(movies, (movie = {}) => {
      movie.budget = this._formatBudget(movie.budget);
      return movie;
    });
  }

  // Question - do we want to cut off avg at 2 decimals?
  _getAvg(ratings) {
    const total = ratings.reduce((acc, c) => acc + c, 0);
    return (total / ratings.length).toFixed(2);
  }

  _formatBudget(budget = 0) {
    return `$${(parseFloat(budget).toFixed(2))}`;
  }

  _mapMovieProps(movie, ratings, omdb) {
    movie.budget = this._formatBudget(movie.budget);

    let genres;


    movie.description = movie.overview;
    delete movie.overview;

    movie = _.merge(movie, omdb);
    movie.ratings = {
      db: this._getAvg(ratings),
      idmb: omdb.imdbRating,
      metascore: omdb.Metascore
    };

    const lowerObj = _.transform(movie, function (result, val, key) {
      result[key.toLowerCase()] = val;
    });

    delete lowerObj.imdbrating;
    delete lowerObj.metascore;

    try {
      genres = JSON.parse(lowerObj.genres);
    } catch (err) {
      throw new Error('Error parsing')
    }

    lowerObj.genres = genres;

    return lowerObj;
  }

  _validatePage(page) {
    if (page == 0 || page == 1) page = 0;
    return page;
  }

  _validateSort(sort = '') {
    let val = sort.toUpperCase();
    if (val === 'ASC' || val === 'DESC')  return val;
    return 'ASC';
  }

}

module.exports = SqlClient;