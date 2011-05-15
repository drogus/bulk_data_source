FakeServer = {
  setup: function() {
    this.server = FakeServer.Server.create();
    if(this.originalSendFunction === undefined)
      this.startInterceptingRequests();
  },

  teardown: function() {
    if(this.originalSendFunction !== undefined)
      this.stopInterceptingRequests();
    this.server.destroy();
    this.server = undefined;
  },

  isARegisteredUrl: function(url) {
    this._ensureServerIsSetup();
    return this.server.isARegisteredUrl(url);
  },

  registerUrl: function(url, response, status) {
    this._ensureServerIsSetup();
    this.server.registerUrl(url, response, status);
  },

  responseFor: function(url) {
    this._ensureServerIsSetup();
    return this.server.responseFor(url);
  },

  addResourceType: function(type, defaultAttributes) {
    this._ensureServerIsSetup();
    this.server.addResourceType(type, defaultAttributes);
  },

  addResource: function(type, attributes) {
    this._ensureServerIsSetup();
    this.server.addResource(type, attributes);
  },

  startInterceptingRequests: function() {
    var self = this;
    if(FakeServer.originalSendFunction != undefined)
      throw new Error('ERROR: Already intercepting requests');
    FakeServer.originalSendFunction = SC.Request.prototype.send;

    SC.Request.reopen({
      send: function(original, context) {
        this.set('body', context);
        if(FakeServer.isARegisteredUrl(this.get('address'))) {
          var response = FakeServer.responseFor(this.get('address'));
          response.set('request', this);
          self.server.set('lastRequest', this);
          setTimeout(function() {
            response.set("status", response.get("_status"));
            response.notify();
          }, 1);
          return response;
        } else {
          return original(context);
        }
      }.enhance()
    });
  },

  stopInterceptingRequests: function() {
    if(FakeServer.originalSendFunction === undefined)
      throw new Error('ERROR: Not currently intercepting requests');
    SC.Request.reopen({
      send: FakeServer.originalSendFunction
    });
    FakeServer.originalSendFunction = undefined;
  },

  _ensureServerIsSetup: function() {
    if(this.server === undefined)
      throw new Error('ERROR: Server has not yet been setup');
  }
};
