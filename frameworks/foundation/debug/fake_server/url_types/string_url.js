sc_require('debug/fake_server/url_types/base');

FakeServer.StringUrl = FakeServer.Url.extend({
  matches: function(url) {
    return this.get('url') == url;
  }
});
