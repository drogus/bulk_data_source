sc_require('debug/fake_server/resource_type');

FakeServer.ResourceStore = SC.Object.extend({
  resourceTypes: [],

  addResourceType: function(type, defaultAttributes) {
    this.get('resourceTypes').push(FakeServer.ResourceType.create({ type: type, defaultAttributes: defaultAttributes }));
  },

  addResource: function(type, attributes) {
    var resourceType = this._resourceTypeFor(type);
    if(resourceType == null)
      throw new Error('ERROR: The type requested is not registered in the resource store');
    resourceType.addResource(attributes);
  },

  allOfType: function(type) {
    var resourceType = this._resourceTypeFor(type);
    if(! resourceType)
      throw new Error('ERROR: The type requested is not registered in the resource store');
    return this._resourceTypeFor(type).all();
  },

  empty: function() {
    this.set('resourceTypes', []);
  },

  _resourceTypeFor: function(type) {
    return this.get('resourceTypes').find(function(resourceType) { return resourceType.ofType(type) })
  }
});
