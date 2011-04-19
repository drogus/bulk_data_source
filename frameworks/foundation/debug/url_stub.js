sc_require('debug/fake_server/response_types/dynamic_response');
sc_require('debug/fake_server/response_types/static_response');
sc_require('debug/fake_server/url_types/string_url');
sc_require('debug/fake_server/url_types/regular_expression_url');

FakeServer.UrlStub = SC.Object.extend({
  init: function(attributes) {
    sc_super();

    this._setupUrl();
    this._setupResponse();
  },

  matchesUrl: function(url) {
    return this.get('url').matches(url);
  },

  getResponse: function(store) {
    return SC.Response.create({
      body: this.get('response').value(store),
      _status: this.get('status') || 200
    });
  },

  _setupUrl: function() {
    var url = this.get('url');
    if(SC.typeOf(url) == 'string')
      this.set('url', FakeServer.StringUrl.create({url: url}));
    else
      this.set('url', FakeServer.RegularExpressionUrl.create({url: url}));
  },

  _setupResponse: function() {
    var response = this.get('response');
    if(SC.typeOf(response) == 'function')
      this.set('response', FakeServer.DynamicResponse.create({response: response}));
    else
      this.set('response', FakeServer.StaticResponse.create({response: response}));
  }

});

