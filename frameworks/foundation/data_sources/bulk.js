/** @class

  (Document Your Data Source Here)

  @extends SC.DataSource
*/

SC.BulkDataSource = SC.DataSource.extend(
/** @scope SC.BulkDataStore.prototype */ {
  bulkApiUrl: function(store) {
    return store.bulkApiUrl || "/api/bulk";
  },
  pluralResourceName: function(recordType) {
    return recordType.pluralResourceName || recordType.resourceName.pluralize();
  },
  // ..........................................................
  // QUERY SUPPORT
  //
  fetch: function(store, query) {
    var pluralResourceName = this.pluralResourceName(query.get('recordType'));
    SC.Request.getUrl('%@?%@=all'.fmt(this.bulkApiUrl(store), pluralResourceName))
      .json()
      .notify(this, 'fetchDidComplete', store, query)
      .send();

    return YES;
  },

  fetchDidComplete: function(response, store, query) {
    if(SC.ok(response)) {
      var recordType = query.get('recordType'),
          records = response.get('body')[this.pluralResourceName(recordType)] || [],
          primaryKey = recordType.prototype.primaryKey;

      if(primaryKey !== 'id') {
        records.forEach(function(record) {
          record[primaryKey] = record['id'];
          delete(record['id']);
        });
      }

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
          resourceName = this.pluralResourceName(recordType),
          primaryKey = recordType.prototype.primaryKey;

      if(primaryKey !== 'id') {
        delete(data[primaryKey]);
      }

      if(records[resourceName] === undefined) {
        records[resourceName] = [];
      }
      data['id'] = id;
      records[resourceName].push(data);
      if($.inArray(recordType, recordTypes) === -1) {
        recordTypes.push(recordType);
      }
    }

    SC.Request.putUrl(this.bulkApiUrl(store))
              .notify(this, 'updateRecordsDidComplete', store, recordTypes, storeKeys)
              .json().send(records);

    return YES;
  },

  updateRecordsDidComplete: function(response, store, recordTypes, storeKeys) {
    var usedStoreKeys = [];
    if(SC.ok(response) && response.get('status') === 200) {
      var body = response.get('body');
      for(var i = 0; i < recordTypes.length; i++) {
        var recordType = recordTypes[i],
            resourceName = this.pluralResourceName(recordType),
            records = body[resourceName],
            primaryKey = recordType.prototype.primaryKey;

        if(records) {
          for(var j = 0; j < records.length; j++) {
            var storeKey = recordType.storeKeyFor(records[j]["id"]),
                id = records[j]['id'];

            delete(records[j]['id']);
            store.dataSourceDidComplete(storeKey, records[j], id);
            usedStoreKeys.push(storeKey);
          }
        }
        var errors;
        if(body.errors && (errors = body.errors[resourceName])) {
          for (var id in errors) {
            var storeKey = store.storeKeyFor(recordType, id);
            store.dataSourceDidError(storeKey, errors[storeKey]);
            usedStoreKeys.push(storeKey);
          }
        }
      }
      this._subtract(storeKeys, usedStoreKeys);
      for(var j = 0; j < storeKeys.length; j++) {
        store.dataSourceDidError(storeKeys[j], 'No data in response');
      }
    } else {
      for(var i = 0; i < storeKeys.length; i++) {
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
          resourceName = this.pluralResourceName(recordType);

      queryString.push("%@[]=%@".fmt(resourceName, id));
      if($.inArray(recordType, recordTypes) === -1) {
        recordTypes.push(recordType);
      }
    }

    SC.Request.getUrl("%@?%@".fmt(this.bulkApiUrl(store), queryString.join('&')))
              .notify(this, 'retrieveRecordsDidComplete', store, recordTypes, storeKeys)
              .json().send();

    return YES;
  },

  retrieveRecordsDidComplete: function(response, store, recordTypes, storeKeys) {
    var usedStoreKeys = [];
    if(SC.ok(response) && response.get('status') === 200) {
      var body = response.get('body');
      for(var i = 0; i < recordTypes.length; i++) {
        var recordType = recordTypes[i],
            resourceName = this.pluralResourceName(recordType),
            records = body[resourceName];

        if(records) {
          for(var j = 0; j < records.length; j++) {
            var record = records[j],
                id = record['id'],
                storeKey = recordType.storeKeyFor(id);

            delete(record['id']);
            store.dataSourceDidComplete(storeKey, record, id);
            usedStoreKeys.push(storeKey);
          }
        }
      }
      this._subtract(storeKeys, usedStoreKeys);
      for(var j = 0; j < storeKeys.length; j++) {
        store.dataSourceDidError(storeKeys[j], 'No data in response');
      }
    } else {
      for(var i = 0; i < storeKeys.length; i++) {
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
          resourceName = this.pluralResourceName(recordType);

      // need to pass storeKey to not loose track of the object since
      // we do not have an id yet
      data["_local_id"] = storeKeys[i];
      if(records[resourceName] === undefined) {
        records[resourceName] = [];
      }
      records[resourceName].push(data);
      if($.inArray(recordType, recordTypes) === -1) {
        recordTypes.push(recordType);
      }
    }

    SC.Request.postUrl(this.bulkApiUrl(store))
              .notify(this, 'createRecordsDidComplete', store, recordTypes, storeKeys)
              .json().send(records);

    return YES;
  },

  createRecordsDidComplete: function(response, store, recordTypes, storeKeys) {
    var usedStoreKeys = [];
    if(SC.ok(response) && response.get('status') === 200) {
      var body = response.get('body');
      for(var i = 0; i < recordTypes.length; i++) {
        var recordType = recordTypes[i],
            resourceName = this.pluralResourceName(recordType),
            records = body[resourceName],
            primaryKey = recordType.prototype.primaryKey;

        if(records) {
          for(var j = 0; j < records.length; j++) {
            var record = records[j];

            if(record['id'] === null || record['id'] === undefined) {
              store.dataSourceDidError(record["_local_id"], response);
            } else {
              var id = record['id'];
              delete(record['id']);
              store.dataSourceDidComplete(record["_local_id"], record, id);
            }
            usedStoreKeys.push(record['_local_id']);
          }
        }
        var errors;
        if(body.errors && (errors = body.errors[resourceName])) {
          for (var storeKey in errors) {
            store.dataSourceDidError(storeKey, errors[storeKey]);
            usedStoreKeys.push(storeKey);
          }
        }
      }
      this._subtract(storeKeys, usedStoreKeys);
      for(var j = 0; j < storeKeys.length; j++) {
        store.dataSourceDidError(storeKeys[j], 'No data in response');
      }
    } else {
      for(var i = 0; i < storeKeys.length; i++) {
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
          resourceName = this.pluralResourceName(recordType);

      if(records[resourceName] === undefined) {
        records[resourceName] = [];
      }
      records[resourceName].push(id);
      if($.inArray(recordType, recordTypes) === -1) {
        recordTypes.push(recordType);
      }
    }

    SC.Request.deleteUrl(this.bulkApiUrl(store))
              .notify(this, 'destroyRecordsDidComplete', store, recordTypes, storeKeys)
              .json().send(records);

    return YES;
  },

  destroyRecordsDidComplete: function(response, store, recordTypes, storeKeys) {
    var usedStoreKeys = [];
    if(SC.ok(response) && response.get('status') === 200) {
      var body = response.get('body');
      for(var i = 0; i < recordTypes.length; i++) {
        var recordType = recordTypes[i],
            resourceName = this.pluralResourceName(recordType);
            records = body[resourceName];

        if(records) {
          for(var j = 0; j < records.length; j++) {
            var id = records[j],
                storeKey = recordType.storeKeyFor(id);

            store.dataSourceDidDestroy(storeKey);
            usedStoreKeys.push(storeKey);
          }
        }

        var errors;
        if(body.errors && (errors = body.errors[resourceName])) {
          for (var id in errors) {
            var storeKey = store.storeKeyFor(recordType, id);
            store.dataSourceDidError(storeKey, errors[storeKey]);
            usedStoreKeys.push(storeKey);
          }
        }
      }
      this._subtract(storeKeys, usedStoreKeys);
      for(var j = 0; j < storeKeys.length; j++) {
        store.dataSourceDidError(storeKeys[j], 'No data in response');
      }
    } else {
      for(var i = 0; i < storeKeys.length; i++) {
        store.dataSourceDidError(storeKeys[i], response);
      }
    }
  },

  _subtract: function(array1, array2) {
    var index;
    for(var i = 0; i < array2.length; i++) {
      if((index = $.inArray(parseInt(array2[i]), array1)) !== -1) {
        array1.splice(index, 1);
      }
    }
    return array1;
  }

}) ;
