sc_require('debug/fake_server/url_types/base');

FakeServer.RegularExpressionUrl = FakeServer.Url.extend({
  matches: function(url) {
    return url.match(this.get('url')) !== null;
  }
});
