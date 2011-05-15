sc_require('debug/fake_server/resource');

FakeServer.ResourceType = SC.Object.extend({
  resources: [],

  ofType: function(type) {
    return this.get('type') === type;
  },

  all: function() {
    return this.get('resources');
  },

  addResource: function(attributes) {
    var newResource = this._attributeHashFor(attributes);
    this.get('resources').push(newResource);
    return newResource;
  },

  _attributeHashFor: function(attributes) {
    var defaultAttributes = this.get('defaultAttributes');
    for( var key in attributes) {
      defaultAttributes[key] = attributes[key];
    }
    return defaultAttributes;
  }
});
