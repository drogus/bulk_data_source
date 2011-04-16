/** @class

  (Document Your Data Source Here)

  @extends SC.DataSource
*/

SC.RailsDataSource = SC.DataSource.extend(
/** @scope SC.RailsDataStore.prototype */ {
  // ..........................................................
  // QUERY SUPPORT
  //
  fetch: function(store, query) {
    SC.Request.getUrl('%@?%@=all'.fmt(store.bulkApiUrl, query.recordType.pluralResourceName))
      .json()
      .notify(this, 'fetchDidComplete', store, query)
      .send();

    return YES;
  },

  fetchDidComplete: function(response, store, query) {
    if(SC.ok(response)) {
      var recordType = query.get('recordType'),
          records = response.get('body')[recordType.pluralResourceName];

      store.loadRecords(recordType, records);
      store.dataSourceDidFetchQuery(query);
    } else {
      store.dataSourceDidErrorQuery(query, response);
    }
  },

  updateRecords: function(store, storeKeys) {
    var records = {},
        recordTypes = [];
    for(var i = 0; i < storeKeys.length; i++) {
      var recordType = store.recordTypeFor(storeKeys[i]),
          data = store.readDataHash(storeKeys[i]),
          id = store.idFor(storeKeys[i]),
          resourceName = recordType.pluralResourceName;

      if(records[resourceName] === undefined) {
        records[resourceName] = [];
      }
      data['id'] = id;
      records[resourceName].push(data);
      if($.inArray(recordType, recordTypes) === -1) {
        recordTypes.push(recordType);
      }
    }

    SC.Request.putUrl(store.bulkApiUrl)
              .notify(this, 'updateRecordsDidComplete', store, recordTypes, storeKeys)
              .json().send(records);

    return YES;
  },

  updateRecordsDidComplete: function(response, store, recordTypes, storeKeys) {
    if(SC.ok(response) && response.get('status') === 200) {
      var body = response.get('body');
      for(var i = 0; i < recordTypes.length; i++) {
        var recordType = recordTypes[i];
        var records = body[recordType.pluralResourceName];
        for(var j = 0; j < records.length; j++) {
          var storeKey = recordType.storeKeyFor(records[j]["id"]);
          store.dataSourceDidComplete(storeKey);
        }
      }
    } else {
      for(var i = 0; i < storeKeys; i++) {
        store.dataSourceDidError(storeKeys[i], response);
      }
    }
  },
  // ..........................................................
  // RECORD SUPPORT
  //
  retrieveRecords: function(store, storeKeys) {
    var records = {},
        recordTypes = [],
        queryString = [];

    for(var i = 0; i < storeKeys.length; i++) {
      var recordType = store.recordTypeFor(storeKeys[i]),
          id = store.idFor(storeKeys[i]),
          resourceName = recordType.pluralResourceName;

      queryString.push("%@[]=%@".fmt(resourceName, id));
      if($.inArray(recordType, recordTypes) === -1) {
        recordTypes.push(recordType);
      }
    }

    SC.Request.getUrl("%@?%@".fmt(store.bulkApiUrl, queryString.join('&')))
              .notify(this, 'retrieveRecordsDidComplete', store, recordTypes, storeKeys)
              .json().send();

    return YES;
  },

  retrieveRecordsDidComplete: function(response, store, recordTypes, storeKeys) {
    if(SC.ok(response) && response.get('status') === 200) {
      var body = response.get('body');
      for(var i = 0; i < recordTypes.length; i++) {
        var recordType = recordTypes[i],
            records = body[recordType.pluralResourceName];

        for(var j = 0; j < records.length; j++) {
          var record = records[j],
              id = record['id'],
              storeKey = recordType.storeKeyFor(id);

          store.dataSourceDidComplete(storeKey, record, id);
        }
      }
    } else {
      for(var i = 0; i < storeKeys; i++) {
        store.dataSourceDidError(storeKeys[i], response);
      }
    }
  },

  createRecords: function(store, storeKeys) {
    var records = {},
        recordTypes = [];

    for(var i = 0; i < storeKeys.length; i++) {
      var recordType = store.recordTypeFor(storeKeys[i]),
          data = store.readDataHash(storeKeys[i]),
          resourceName = recordType.pluralResourceName;

      // need to pass storeKey to not loose track of the object since
      // we do not have an id yet
      data["_storeKey"] = storeKeys[i];
      if(records[resourceName] === undefined) {
        records[resourceName] = [];
      }
      records[resourceName].push(data);
      if($.inArray(recordType, recordTypes) === -1) {
        recordTypes.push(recordType);
      }
    }

    // TODO: where to save that url?
    SC.Request.postUrl(store.bulkApiUrl)
              .notify(this, 'createRecordsDidComplete', store, recordTypes, storeKeys)
              .json().send(records);

    return YES;
  },

  createRecordsDidComplete: function(response, store, recordTypes, storeKeys) {
    if(SC.ok(response) && response.get('status') === 200) {
      var body = response.get('body');
      for(var i = 0; i < recordTypes.length; i++) {
        var recordType = recordTypes[i],
            records = body[recordType.pluralResourceName];

        for(var j = 0; j < records.length; j++) {
          var record = records[j];
          store.dataSourceDidComplete(record["_storeKey"], null, record["id"]);
        }
      }
    } else {
      for(var i = 0; i < storeKeys; i++) {
        store.dataSourceDidError(storeKeys[i], response);
      }
    }
  },

  destroyRecords: function(store, storeKeys) {
    var records = {},
        recordTypes = [];

    for(var i = 0; i < storeKeys.length; i++) {
      var recordType = store.recordTypeFor(storeKeys[i]),
          id = store.idFor(storeKeys[i]),
          resourceName = recordType.pluralResourceName;

      if(records[resourceName] === undefined) {
        records[resourceName] = [];
      }
      records[resourceName].push(id);
      if($.inArray(recordType, recordTypes) === -1) {
        recordTypes.push(recordType);
      }
    }

    SC.Request.deleteUrl(store.bulkApiUrl)
              .notify(this, 'destroyRecordsDidComplete', store, recordTypes, storeKeys)
              .json().send(records);

    return YES;
  },

  destroyRecordsDidComplete: function(response, store, recordTypes, storeKeys) {
    if(SC.ok(response) && response.get('status') === 200) {
      var body = response.get('body');
      for(var i = 0; i < recordTypes.length; i++) {
        var recordType = recordTypes[i],
            records = body[recordType.pluralResourceName];

        for(var j = 0; j < records.length; j++) {
          var id = records[j],
              storeKey = recordType.storeKeyFor(id);

          store.dataSourceDidDestroy(storeKey);
        }
      }
    } else {
      for(var i = 0; i < storeKeys; i++) {
        store.dataSourceDidError(storeKeys[i], response);
      }
    }
  }

}) ;
