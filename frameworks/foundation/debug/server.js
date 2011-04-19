sc_require('debug/fake_server/base');
sc_require('debug/fake_server/url_stub_collection');
sc_require('debug/fake_server/resource_store');

FakeServer.Server = SC.Object.extend({
  init: function() {
    sc_super();
    this.set('urlStubs', FakeServer.UrlStubCollection.create());
    this.set('resourceStore', FakeServer.ResourceStore.create());
    return this;
    // FakeServer.FakeRequest.startInterceptingRequests();
    // var json = '{"response": {"ack": "Success","errorMessage": "","timestamp": "2011-02-23T18:42:05.092Z","items": [ { "itemId": 330002374510, "timestamp": "2011-02-23T18:42:05.092Z", "galleryURL":" /something", "superSizeURL":" something", "viewItemURL": "something", "title": "item", "subTitle":" This Would be a great phone waiting for you!", "bestOfferEnabled": false, "buyItNowAvailable": false, "listingType": "FixedPrice", "sellingStatus": { "bidCount": 24, "buyItNowPrice": { "currencyId":"USD", "value": 99.0 }, "convertedBuyItNowPrice" :{ "currencyId": "USD", "value": 99.0 }, "currentPrice": { "currencyId": "USD", "value": 2.08 }, "convertedCurrentPrice": { "currencyId": "USD", "value": 2.08 }, "sellingState": "Active", "timeLeft": "P17DT7H44M28S" }, "itemLocation":{ "cityState": "Sydney, New South Wales", "zipCode": 2000, "countryCode": "AUS" },"paymentInfo":{ "acceptedPaymentMethod": [ "PAYPAL" ] }, "seller": "epwsell07", "shippingInfo": { "shippingServiceCost": { "currencyId": "USD", "value": 0.0 }, "shippingType":"Free", "shipToLocations":"US", "expeditedShipping":false, "oneDayShippingAvailable":false, "handlingTime": 1 } } ], "paginationOutput": { "pageNumber": 1, "entriesPerPage": 20, "totalPages": 27, "totalEntries": 529, "sortOrder": 1 }, "itemSearchURL" : "searchUrl", "sellers": [ { "username": "epwsell07", "feedbackScore": 79, "positiveFeedbackPercent": 100, "feedbackRatingStar": "RedShooting", "topRatedSeller": true } ], "categoryHistogramContainer": [ { "categoryId": 293, "categoryName": "Electronics", "count": 424, "childCategoryHistogram": [ { "categoryId": 73839, "categoryName": "iPod & MP3 Players", "count": 398 } ] }, { "categoryId": 550, "categoryName": "Art", "count": 240, "childCategoryHistogram": [ { "categoryId": 60435, "categoryName": "Direct from the Artist", "count": 240 } ] }, { "categoryId": 11450, "categoryName": "Clothing, Shoes & Accessories", "count": 35, "childCategoryHistogram": [ { "categoryId": 4251, "categoryName": "Women\'s Accessories", "count": 31 }, { "categoryId": 1059, "categoryName": "Men\'s Clothing", "count": 4 } ] } ], "aspectHistogramContainer": [ { "aspect" : "Product Line", "valueHistogram" : [ {"name" : "iPod Classic", "count" : 78 }, { "name" : "iPod Mini", "count" : 34 }, { "name" : "iPod Nano", "count" : 40 } ] }, { "aspect" : "Storage Capacity", "valueHistogram" : [ { "name" : "1 GB", "count" : 65 }, { "name" : "2 GB", "count" : 141 }, { "name" : "4 GB", "count" : 21 } ] } ] } }';
    // FakeServer.FakeRequest.registerUrl('/ebayAPI_SearchService/services/search/FindingService/v1', json);
  },

  isARegisteredUrl: function(url) {
    return this.get('urlStubs').hasUrl(url);
  },

  registerUrl: function(url, stubValue, status) {
    this.get('urlStubs').addUrl(url, stubValue, status);
  },

  responseFor: function(url) {
    return this.get('urlStubs').responseFor(url, this.get('resourceStore'));
  },

  addResource: function(type, attributes) {
    this.get('resourceStore').addResource(type, attributes);
  },

  addResourceType: function(type, defaultAttributes) {
    this.get('resourceStore').addResourceType(type, defaultAttributes);
  }
});
