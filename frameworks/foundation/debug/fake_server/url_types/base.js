sc_require('debug/fake_server/base');

FakeServer.Url = SC.Object.extend({
  matches: function(url) {
    throw new Error('ERROR: Did not implement matches');
  }
});

