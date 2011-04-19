sc_require('debug/fake_server/base');

FakeServer.StaticResponse = SC.Object.extend({
  value: function() {
    return this.get('response');
  }
});
