const fs = require('fs');
const _ = require('lodash');
const providers = require('./lib/providers');

class TorrentSearchApi {
  enableProvider(providerName, ...args) {
    return this._getProvider(providerName).enableProvider(...args);
  }

  enablePublicProviders() {
    let publicProviders = this.getProviders()
      .filter(p => p.public)
      .map(p => p.name);
    publicProviders.map(p => this.enableProvider(p));
  }

  disableProvider(providerName) {
    this._getProvider(providerName).disableProvider();
  }

  getProviders() {
    return providers.map(p => p.getInfos());
  }

  getActiveProviders() {
    return this._getActiveProviders().map(p => p.getInfos());
  }

  isProviderActive(name) {
    let provider = this._getProvider(name, false);
    if (provider && provider.isActive) {
      return true;
    }
    return false;
  }

  /*
    [providers[]], query, category, limit, filter
  */
  search(...args) {
    var args = Array.prototype.slice.call(arguments);
    var params = {};

    if (args[0] instanceof Array)
      params.providers = this._getActiveProvidersByName(args.shift());
    else if (typeof args[0] === 'string')
      params.providers = this._getActiveProviders();
    else
      return Promise.reject(
        'First param must be a query or an array of providers.'
      );

    for (let param of ['query', 'category', 'limit', 'filter']) {
      params[param] = args.shift();
      if (params[param] === '') params[param] = undefined;
    }

    return Promise.all(
      params.providers.map(p =>
        p.search(params.query, params.category, params.limit, params.filter)
      )
    )
      .then(results => _.flatten(results))
      .then(results => results.filter(r => typeof r !== 'undefined'))
      .then(results => _.orderBy(results, ['seeds'], ['desc']));
  }

  /*
    [providers[]], category, limit, filter
  */
  last(...args) {
    var args = Array.prototype.slice.call(arguments);
    var params = {};

    params.providers =
      args[0] instanceof Array
        ? this._getActiveProvidersByName(args.shift())
        : this._getActiveProviders();

    for (let param of ['category', 'limit', 'filter']) {
      params[param] = args.shift();
      if (params[param] === '') params[param] = undefined;
    }

    return Promise.all(
      params.providers.map(p =>
        p.last(params.category, params.limit, params.filter)
      )
    )
      .then(results => _.flatten(results))
      .then(results => results.filter(r => typeof r !== 'undefined'));
  }

  getTorrentDetails(torrent) {
    return this._getProvider(torrent.provider).getTorrentDetails(torrent);
  }

  downloadTorrent(torrent, filenamePath) {
    return this._getProvider(torrent.provider).downloadTorrent(
      torrent,
      filenamePath
    );
  }

  getMagnet(torrent) {
    return this._getProvider(torrent.provider).getMagnet(torrent);
  }

  _getActiveProviders() {
    return _.filter(providers, 'isActive');
  }

  _getProvider(name, throwOnError = true) {
    let provider = _.find(
      providers,
      p => p.getName().toUpperCase() === name.toUpperCase()
    );
    if (provider) {
      return provider;
    }

    if (throwOnError) {
      throw new Error(`Couldn't find '${name}' provider`);
    }

    return null;
  }

  _getActiveProvidersByName(providerNames) {
    return this._getActiveProviders().filter(p =>
      providerNames
        .map(m => m.toUpperCase())
        .includes(p.getName().toUpperCase())
    );
  }
}

module.exports = TorrentSearchApi;
