sc_require('debug/fake_server/url_stub');

FakeServer.UrlStubCollection = SC.Object.extend({
  urls: [],

  hasUrl: function(url) {
    return this._findUrlStubByUrl(url) !== null;
  },

  addUrl: function(url, stubValue, status) {
    this.get('urls').unshift(FakeServer.UrlStub.create({url: url, response: stubValue, status: status}));
  },

  responseFor: function(url, resourceStore) {
    var urlStub = this._findUrlStubByUrl(url);
    return urlStub === null ? undefined : urlStub.getResponse(resourceStore);
  },

  empty: function() {
    this.set('urls', []);
  },

  _findUrlStubByUrl: function(url) {
    return this.get('urls').find(function(stub) { return stub.matchesUrl(url) })
  },
});
