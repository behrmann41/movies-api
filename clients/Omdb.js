const request = require('request');
const _ = require('lodash');

class Omdb {
  constructor() {
    this._apiKey = 'ceb9bf8c';
    this.url = `http://www.omdbapi.com/?apikey=${this._apiKey}`;
  }

  fetchMovie(id, callback) {
    request(`${this.url}&i=${id}`, (err, response, body) => {
      let result;

      try {
        result = JSON.parse(body);
      } catch (error) {
        return callback(error);
      }

      let props = _.pick(result, ['Plot', 'Language', 'BoxOffice', 'Production', 'Website', 'Metascore', 'imdbRating']);

      // lets remap props to match
      // props['language'] = props.Language;
      // delete props.Language;
      // props[]

      return callback(null, props);
      // parse body into json


      // pull out Metascore & imdbRating
    });
  }
}

module.exports = Omdb;