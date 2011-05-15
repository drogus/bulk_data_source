sc_require('debug/fake_server/base');

FakeServer.FakeRequest = SC.Object.create({
  registeredUrls: [],

  registerUrl: function(url, response) {
    this.get('registeredUrls').push(SC.Object.create({url: new RegExp(url), response: response}));
  },

  clearRegistry: function() {
    this.set('registerdUrls', []);
  },

  isARegisteredUrl: function(url) {
    if(!url) return false;
    return url && this._registeredUrlFor(url) !== null;
  },

  responseFor: function(url) {
    var registeredUrl = this._registeredUrlFor(url);
    var rtn = registeredUrl ? SC.Response.create({body: registeredUrl.get('response')}) : undefined;
    return rtn;
  },

  _registeredUrlFor: function(url) {
    return this.get('registeredUrls').find(function(item) { return url.match(item.get('url')) })
  }
});
