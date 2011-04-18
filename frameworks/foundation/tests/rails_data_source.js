var store, fooId, barId;

SC.TestStore = SC.Store.extend({
});

var Todo = SC.Record.extend({
  primaryKey: 'id',
  title: SC.Record.attr(String),
  isDone: SC.Record.attr(Boolean, { defaultValue: NO, key: "done" })
});

var Project = SC.Record.extend({
  primaryKey: 'id',
  name: SC.Record.attr(String)
});

Project.mixin({
  resourceName: 'project',
  pluralResourceName: 'projects'
});

Todo.mixin({
  resourceName: 'todo',
  pluralResourceName: 'todos'
});

function stubNextResponse(response, callback) {
  var status   = response['status'] || 200,
      body     = SC.json.encode(response['body'] || ""),
      data     = {'body': body, 'status': status};

  SC.Request.postUrl('/_stub')
    .notify(this, callback)
    .json().send(data);
}

function getLastRequest(callback) {
  SC.Request.getUrl('/_stub/last_request').notify(this, function(response) {
    var request = response.get('body');
    callback(request);
  }).json().send();
}

function withDefaultRecords(fn) {
  var data = {
    'todos': [{'title': 'Foo'}, {'title': 'Bar'}]
  };

  SC.Request.postUrl('/api/bulk').notify(this, function(response) {
    fn();
  }).json().send(data);
}

function setupDatabase() {
  stop();
  SC.Request.getUrl('/clear_database').notify(this, function() {
    start();
  }).send();
}

function observeOnce(object, key, method) {
  var callback = function() {
    object.removeObserver(key, callback);
    method();
  };
  object.addObserver(key, callback);
}

module("RailsDataSource", {
  setup: function() {
    store = SC.Store.create().from('SC.RailsDataSource');
    store.bulkApiUrl = "/api/bulk";
    store.commitRecordsAutomatically = true;
  },
  teardown: function() {
    setupDatabase();
    store = null;
  }
});

test("fetching records", function() {
  expect(3);
  stop(5000);
  withDefaultRecords(function() {
    var records = store.find(Todo);

    records.addObserver('status', function() {
      var titles = records.map(function(r) { return r.get('title'); }).sort();
      equals(titles[0], "Bar");
      equals(titles[1], "Foo");
      equals(titles.length, 2);

      start();
    });
  });
});

test("creating records", function() {
  expect(3);
  stop(5000);
  SC.RunLoop.begin();

  var foo = store.createRecord(Todo, {title: "Foo"});
  var bar = store.createRecord(Todo, {title: "Bar"});

  SC.RunLoop.end();

  var records = store.find(Todo);
  records.addObserver('status', function() {
    var titles = records.map(function(r) { return r.get('title'); }).sort();
    equals(titles[0], "Bar");
    equals(titles[1], "Foo");
    equals(titles.length, 2);

    start();
  });
});

test("updating records", function() {
  expect(3);
  stop(5000);
  SC.RunLoop.begin();
  var foo = store.createRecord(Todo, {title: "Foo"});
  var bar = store.createRecord(Todo, {title: "Bar"});
  SC.RunLoop.end();

  observeOnce(foo, 'id', function() {
    SC.RunLoop.begin();
    foo.set('title', "Baz");
    SC.RunLoop.end();

    var records = store.find(Todo);
    records.addObserver('status', function() {
      var titles = records.map(function(r) { return r.get('title'); }).sort();
      equals(titles[0], "Bar");
      equals(titles[1], "Baz");
      equals(titles.length, 2);

      start();
    });
  });
});

test("deleting records", function() {
  expect(2);
  stop(5000);

  SC.RunLoop.begin();
  var foo = store.createRecord(Todo, {title: "Foo"});
  var bar = store.createRecord(Todo, {title: "Bar"});
  SC.RunLoop.end();

  observeOnce(foo, 'id', function() {
    SC.RunLoop.begin();
    foo.destroy();
    SC.RunLoop.end();

    var records = store.find(Todo);
    records.addObserver('status', function() {
      var titles = records.map(function(r) { return r.get('title'); }).sort();
      equals(titles[0], "Bar");
      equals(titles.length, 1);
      start();
    });
  });
});

test("createRecords: pass _storeKey on create (for records identification)", function() {
  expect(5);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true});
  var project = store.createRecord(Project, {name: "Sproutcore todos"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
    ]
  };

  stubNextResponse({body: body}, function() {
    SC.RunLoop.end();

    todo.addObserver('id', function() {
      equals(todo.get('id'), 10);
      equals(project.get('id'), 5);

      getLastRequest(function(request) {
        var body = {
          'todos': [
            {'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
          ], 'projects': [
            {'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
          ]
        };
        equals(SC.json.encode(request['body']), SC.json.encode(body));
        equals(request['url'], '/api/bulk');
        equals(request['method'], 'POST');
        start();
      });
    });
  });

});


test("createRecords: call dataSourceDidError on records without id", function() {
  expect(11);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true}),
      invalidTodo = store.createRecord(Todo, {title: "I'm bad", done: false}),
      project = store.createRecord(Project, {name: "Sproutcore todos"}),
      invalidProject = store.createRecord(Project, {name: "jQuery"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')},
      {'title': 'I\'m bad', done: false, '_storeKey': invalidTodo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') },
      {'name': "jQuery", '_storeKey': invalidProject.get('storeKey') }
    ]
  };

  stubNextResponse({body: body}, function() {
    SC.RunLoop.end();
    equals(store.statusString(invalidTodo.get('storeKey')), 'BUSY_CREATING');
    equals(store.statusString(invalidProject.get('storeKey')), 'BUSY_CREATING');

    todo.addObserver('id', function() {
      equals(todo.get('id'), 10);
      equals(invalidTodo.get('id'), null);
      equals(store.statusString(invalidTodo.get('storeKey')), 'ERROR');
      equals(project.get('id'), 5);
      equals(invalidProject.get('id'), null);
      equals(store.statusString(invalidProject.get('storeKey')), 'ERROR');

      getLastRequest(function(request) {
        var body = {
          'todos': [
            {'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')},
            {'title': 'I\'m bad', done: false, '_storeKey': invalidTodo.get('storeKey')}
          ], 'projects': [
            {'name': "Sproutcore todos", '_storeKey': project.get('storeKey') },
            {'name': "jQuery", '_storeKey': invalidProject.get('storeKey') }
          ]
        };
        equals(SC.json.encode(body), SC.json.encode(request['body']));
        equals(request['url'], '/api/bulk');
        equals(request['method'], 'POST');
        start();
      });
    });
  });

});


test("createRecords: call dataSourceDidError on all records in case of not valid response", function() {
  expect(4);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true}),
      project = store.createRecord(Project, {name: "Sproutcore todos"});

  stubNextResponse({status: 500}, function() {
    SC.RunLoop.end();
    equals(store.statusString(todo.get('storeKey')), 'BUSY_CREATING');
    equals(store.statusString(project.get('storeKey')), 'BUSY_CREATING');

    observeOnce(todo, 'status', function() {
      equals(store.statusString(todo.get('storeKey')), 'ERROR');
    });

    observeOnce(project, 'status', function() {
      equals(store.statusString(project.get('storeKey')), 'ERROR');
      // TODO: start should be run after running both callbacs
      start();
    });
  });

});

test("updateRecords: request & response", function() {
  expect(4);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true});
  var project = store.createRecord(Project, {name: "Sproutcore todos"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
    ]
  };

  stubNextResponse({body: body}, function() {
    SC.RunLoop.end();

    // wait for setting id on both projects and todos
    observeOnce(todo, 'id', function() {
      var body = {
        'todos': [ {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')} ]
      };

      SC.RunLoop.begin();
      todo.set('title', 'Bar');

      stubNextResponse({body: body}, function() {
        SC.RunLoop.end();

        observeOnce(todo, 'status', function() {
          equals(todo.get('title'), "Bar");

          getLastRequest(function(request) {
            var body = {
              'todos': [
                {'title': 'Bar', done: true, '_storeKey': todo.get('storeKey'), 'id': 10}
              ]
            };
            equals(SC.json.encode(request['body']), SC.json.encode(body));
            equals(request['url'], '/api/bulk');
            equals(request['method'], 'PUT');
            start();
          });
        });
      });
    });
  });

});


test("updateRecords: call dataSourceDidError on invalid records", function() {
  expect(2);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true}),
      project = store.createRecord(Project, {name: "Sproutcore todos"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
    ]
  };

  stubNextResponse({body: body}, function() {
    SC.RunLoop.end();

    todo.addObserver('id', function() {
      var body = {};

      SC.RunLoop.begin();
      todo.set('title', "Bar");
      project.set('title', 'jQuery todos');

      stubNextResponse({body: body}, function() {
        SC.RunLoop.end();

        observeOnce(todo, 'status', function() {
          equals(store.statusString(todo.get('storeKey')), 'ERROR');
          equals(store.statusString(project.get('storeKey')), 'ERROR');
        });
      });
    });
  });
});


test("updateRecords: call dataSourceDidError on all records in case of not valid response", function() {
  expect(2);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true}),
      project = store.createRecord(Project, {name: "Sproutcore todos"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
    ]
  };

  stubNextResponse({body: body}, function() {
    SC.RunLoop.end();

    todo.addObserver('id', function() {

      SC.RunLoop.begin();
      todo.set('title', "Bar");
      project.set('title', 'jQuery todos');

      stubNextResponse({status: 500}, function() {
        SC.RunLoop.end();

        observeOnce(todo, 'status', function() {
          equals(store.statusString(todo.get('storeKey')), 'ERROR');
        });

        observeOnce(project, 'status', function() {
          equals(store.statusString(project.get('storeKey')), 'ERROR');
          start();
        });
      });
    });
  });
});

test("destroyRecords: request & response", function() {
  expect(4);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true});
  var project = store.createRecord(Project, {name: "Sproutcore todos"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
    ]
  };

  stubNextResponse({body: body}, function() {
    SC.RunLoop.end();

    // wait for setting id on both projects and todos
    observeOnce(todo, 'id', function() {
      var body = {
        'todos': [10]
      };

      stubNextResponse({body: body}, function() {
        SC.RunLoop.begin();
        todo.destroy();
        SC.RunLoop.end();

        observeOnce(todo, 'status', function() {
          equals(store.statusString(todo.get('storeKey')), 'DESTROYED_CLEAN');

          getLastRequest(function(request) {
            var body = {
              'todos': [10]
            };
            equals(SC.json.encode(request['body']), SC.json.encode(body));
            equals(request['url'], '/api/bulk');
            equals(request['method'], 'DELETE');
            start();
          });
        });
      });
    });
  });

});


test("destroyRecords: call dataSourceDidError on invalid records", function() {
  expect(2);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true}),
      project = store.createRecord(Project, {name: "Sproutcore todos"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
    ]
  };

  stubNextResponse({body: body}, function() {
    SC.RunLoop.end();

    todo.addObserver('id', function() {
      var body = {};

      SC.RunLoop.begin();
      todo.destroy();
      project.destroy();

      stubNextResponse({body: body}, function() {
        SC.RunLoop.end();

        observeOnce(todo, 'status', function() {
          equals(store.statusString(todo.get('storeKey')), 'ERROR');
          equals(store.statusString(project.get('storeKey')), 'ERROR');
        });
      });
    });
  });
});


test("destroyRecords: call dataSourceDidError on all records in case of not valid response", function() {
  expect(2);
  stop(5000);
  store.bulkApiUrl = "/_stubs/api/bulk";

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true}),
      project = store.createRecord(Project, {name: "Sproutcore todos"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
    ]
  };

  stubNextResponse({body: body}, function() {
    SC.RunLoop.end();

    todo.addObserver('id', function() {

      SC.RunLoop.begin();
      todo.destroy();
      project.destroy();

      stubNextResponse({status: 500}, function() {
        SC.RunLoop.end();

        observeOnce(todo, 'status', function() {
          equals(store.statusString(todo.get('storeKey')), 'ERROR');
        });

        observeOnce(project, 'status', function() {
          equals(store.statusString(project.get('storeKey')), 'ERROR');
          start();
        });
      });
    });
  });
});
