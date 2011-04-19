var store, fooId, barId;

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

// this can be changed when sproutcore updates to jquery 1.5
function when() {
  var triggers = [];
  for(i = 0; i < arguments.length; i++) {
    triggers.push(arguments[i]);
  }

  return {
    then: function(fn) {
      var interval = setInterval(function() {
        var all = true;
        for(i = 0; i < triggers.length; i++) {
          if(!triggers[i].fired) {
            all = false;
          }
        }
        if(all) {
          clearInterval(interval);
          fn();
        }
      }, 50);
    }
  };
}

function observeUntilStatus(object, s, method) {
  return observeUntil(object, 'status', function() { return object.get('status') & s; }, method);
}

function observeUntil(object, key, until, method) {
  var trigger = {};
  var callback = function() {
    if(until()) {
      object.removeObserver(key, callback);
      method();
      trigger.fired = true;
    }
  };

  object.addObserver(key, callback);
  return trigger;
}

function observeOnce(object, key, method) {
  var trigger = {};
  var callback = function() {
    object.removeObserver(key, callback);
    method();
    trigger.fired = true;
  };
  object.addObserver(key, callback);
  return trigger;
}

module("RailsDataSource", {
  setup: function() {
    FakeServer.setup();
    store = SC.Store.create().from('SC.RailsDataSource');
    store.bulkApiUrl = "/api/bulk";
    store.commitRecordsAutomatically = true;
  },

  teardown: function() {
    FakeServer.teardown();
    store = null;
  }
});

test("fetching records", function() {
  expect(3);
  stop(5000);

  SC.RunLoop.begin();
  var todo1 = store.createRecord(Todo, {title: "Foo"});
  var todo2 = store.createRecord(Todo, {title: "Bar"});

  var body = {
    todos: [
      {id: 10, title: "Foo", done: false, _storeKey: todo1.get('storeKey')},
      {id: 11, title: "Bar", done: true, _storeKey: todo2.get('storeKey')}
    ]
  };

  FakeServer.registerUrl(/\/api\/bulk/, body);
  SC.RunLoop.end();

  observeOnce(todo1, 'id', function() {
    var body = {
      todos: [
        {id: 10, title: "Foo", done: false},
        {id: 11, title: "Bar", done: true}
      ]
    };
    FakeServer.registerUrl(/\/api\/bulk/, body);

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


test("createRecords: pass _storeKey on create (for records identification)", function() {
  expect(5);
  stop(5000);

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

  FakeServer.registerUrl(/\/api\/bulk/, body);

  SC.RunLoop.end();

  observeOnce(todo, 'id', function() {
    start();

    equals(todo.get('id'), 10);
    equals(project.get('id'), 5);

    var request = FakeServer.server.get('lastRequest');
    var body = {
      'todos': [
        {'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
      ], 'projects': [
        {'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
      ]
    };
    equals(SC.json.encode(request.get('body')), SC.json.encode(body));
    equals(request.get('address'), '/api/bulk');
    equals(request.get('type'), 'POST');
  });
});


test("createRecords: call dataSourceDidError on invalid records", function() {
  expect(14);
  stop(5000);

  SC.RunLoop.begin();
  var todo           = store.createRecord(Todo, {title: "Foo", done: true}),
      invalidTodo    = store.createRecord(Todo, {title: "I'm bad", done: false}),
      invalidTodo2   = store.createRecord(Todo, {title: "Lame"}),
      project        = store.createRecord(Project, {name: "Sproutcore todos"}),
      invalidProject = store.createRecord(Project, {name: "jQuery"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')},
      {'title': 'I\'m bad', done: false, '_storeKey': invalidTodo.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') },
      {'name': "jQuery", '_storeKey': invalidProject.get('storeKey') }
    ],
    'errors': {
      'todos': {}
    }
  };
  body['errors']['todos'][invalidTodo2.get('storeKey')] = {title: ["can't be lame"]};

  FakeServer.registerUrl(/\/api\/bulk/, body);
  SC.RunLoop.end();

  equals(store.statusString(invalidTodo.get('storeKey')), 'BUSY_CREATING');
  equals(store.statusString(invalidTodo2.get('storeKey')), 'BUSY_CREATING');
  equals(store.statusString(invalidProject.get('storeKey')), 'BUSY_CREATING');

  todo.addObserver('id', function() {
    equals(todo.get('id'), 10);
    equals(invalidTodo.get('id'), null);
    equals(store.statusString(invalidTodo.get('storeKey')), 'ERROR');
    equals(invalidTodo2.get('id'), null);
    equals(store.statusString(invalidTodo2.get('storeKey')), 'ERROR');
    equals(project.get('id'), 5);
    equals(invalidProject.get('id'), null);
    equals(store.statusString(invalidProject.get('storeKey')), 'ERROR');

    var request = FakeServer.server.get('lastRequest');

    var body = {
      'todos': [
        {'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')},
        {'title': 'I\'m bad', done: false, '_storeKey': invalidTodo.get('storeKey')},
        {'title': 'Lame', '_storeKey': invalidTodo2.get('storeKey')}
      ], 'projects': [
        {'name': "Sproutcore todos", '_storeKey': project.get('storeKey') },
        {'name': "jQuery", '_storeKey': invalidProject.get('storeKey') }
      ]
    };
    console.log(SC.json.encode(body));
    console.log(SC.json.encode(request.get('body')));
    equals(SC.json.encode(body), SC.json.encode(request.get('body')));
    equals(request.get('address'), '/api/bulk');
    equals(request.get('type'), 'POST');
    start();
  });
});

test("createRecords: call dataSourceDidError on all records in case of not valid response", function() {
  expect(4);
  stop(5000);

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true}),
      project = store.createRecord(Project, {name: "Sproutcore todos"});

  FakeServer.registerUrl(/\/api\/bulk/, {}, 500);
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

test("updating records", function() {
  expect(4);
  stop(5000);

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
  FakeServer.registerUrl(/\/api\/bulk/, body);

  SC.RunLoop.end();

  // wait for setting id on both projects and todos
  observeOnce(todo, 'id', function() {
    var body = {
      'todos': [ {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')} ]
    };
    FakeServer.registerUrl(/\/api\/bulk/, body);

    SC.RunLoop.begin();
    todo.set('title', 'Bar');
    SC.RunLoop.end();

    observeOnce(todo, 'status', function() {
      equals(todo.get('title'), "Bar");

      var request = FakeServer.server.get('lastRequest');
      var body = {
        'todos': [
          {'title': 'Bar', done: true, '_storeKey': todo.get('storeKey'), 'id': 10}
        ]
      };
      equals(SC.json.encode(body), SC.json.encode(request.get('body')));
      equals(request.get('address'), '/api/bulk');
      equals(request.get('type'), 'PUT');
      start();
    });
  });
});


test("updateRecords: call dataSourceDidError on invalid records", function() {
  expect(3);
  stop(5000);

  SC.RunLoop.begin();
  var todo = store.createRecord(Todo, {title: "Foo", done: true}),
      todo2 = store.createRecord(Todo, {title: "Bar", done: true}),
      project = store.createRecord(Project, {name: "Sproutcore todos"});

  var body = {
    'todos': [
      {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')},
      {'id': 11, 'title': 'Bar', done: true, '_storeKey': todo2.get('storeKey')}
    ], 'projects': [
      {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
    ]
  };
  FakeServer.registerUrl(/\/api\/bulk/, body);

  SC.RunLoop.end();

  observeOnce(todo, 'id', function() {
    var body = {
      'todos': [
        {'id': 10, 'title': 'Bar', done: true, '_storeKey': todo.get('storeKey')}
      ], 'projects': [
        {'id': 5, 'name': "jQuery todos", '_storeKey': project.get('storeKey') }
      ],
      'errors': { 'todos': {} }
    };
    body['errors']['todos'][todo2.get('storeKey')] = {'title': ["can't be lame"]};
    FakeServer.registerUrl(/\/api\/bulk/, body);

    SC.RunLoop.begin();
    todo.set('title', "Bar");
    todo2.set('title', "Lame");
    project.set('title', 'jQuery todos');
    SC.RunLoop.end();

    when(
      observeUntilStatus(todo, SC.Record.READY, function() {
         equals(store.statusString(todo.get('storeKey')), 'READY_CLEAN');
      }),
      observeUntilStatus(todo2, SC.Record.ERROR, function() {
         equals(store.statusString(todo2.get('storeKey')), 'ERROR');
      }),
      observeUntilStatus(project, SC.Record.READY, function() {
         equals(store.statusString(project.get('storeKey')), 'READY_CLEAN');
      })
    ).then(function() {
      start();
    });
  });
});

test("updateRecords: call dataSourceDidError on all records in case of not valid response", function() {
  expect(2);
  stop(5000);

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
  FakeServer.registerUrl(/\/api\/bulk/, body);

  SC.RunLoop.end();

  observeOnce(todo, 'id', function() {
    FakeServer.registerUrl(/\/api\/bulk/, {}, 500);

    SC.RunLoop.begin();
    todo.set('title', "Bar");
    project.set('title', 'jQuery todos');
    SC.RunLoop.end();

    when(
      observeUntilStatus(todo, SC.Record.ERROR, function() {
        equals(store.statusString(todo.get('storeKey')), 'ERROR');
      }),
      observeUntilStatus(project, SC.Record.ERROR, function() {
        equals(store.statusString(project.get('storeKey')), 'ERROR');
      })
    ).then(function() {
      start();
    });
  });
});

test("destroying records", function() {
  expect(5);
  stop(5000);

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
  FakeServer.registerUrl(/\/api\/bulk/, body);
  SC.RunLoop.end();

  observeOnce(todo, 'id', function() {
    var body = {
      'todos': [10],
      'projects': [5]
    };
    FakeServer.registerUrl(/\/api\/bulk/, body);

    SC.RunLoop.begin();
    todo.destroy();
    project.destroy();
    SC.RunLoop.end();

    when(
      observeUntilStatus(todo, SC.Record.DESTROYED, function() {
        equals(store.statusString(todo.get('storeKey')), 'DESTROYED_CLEAN');
      }),
      observeUntilStatus(project, SC.Record.DESTROYED, function() {
        equals(store.statusString(todo.get('storeKey')), 'DESTROYED_CLEAN');
      })
    ).then(function() {
      var request = FakeServer.server.get('lastRequest');
      var body = {
        'todos': [10],
        'projects': [5]
      };
      equals(SC.json.encode(request.get('body')), SC.json.encode(body));
      equals(request.get('address'), '/api/bulk');
      equals(request.get('type'), 'DELETE');
      start();
    });
  });
});

// test("destroyRecords: call dataSourceDidError on invalid records", function() {
//   expect(2);
//   stop(5000);

//   SC.RunLoop.begin();
//   var todo = store.createRecord(Todo, {title: "Foo", done: true}),
//       project = store.createRecord(Project, {name: "Sproutcore todos"});

//   var body = {
//     'todos': [
//       {'id': 10, 'title': 'Foo', done: true, '_storeKey': todo.get('storeKey')}
//     ], 'projects': [
//       {'id': 5, 'name': "Sproutcore todos", '_storeKey': project.get('storeKey') }
//     ]
//   };

//   stubNextResponse({body: body}, function() {
//     SC.RunLoop.end();

//     todo.addObserver('id', function() {
//       var body = {};

//       SC.RunLoop.begin();
//       todo.destroy();
//       project.destroy();

//       stubNextResponse({body: body}, function() {
//         SC.RunLoop.end();

//         observeOnce(todo, 'status', function() {
//           equals(store.statusString(todo.get('storeKey')), 'ERROR');
//           equals(store.statusString(project.get('storeKey')), 'ERROR');
//         });
//       });
//     });
//   });
// });


test("destroyRecords: call dataSourceDidError on all records in case of not valid response", function() {
  expect(2);
  stop(5000);

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
  FakeServer.registerUrl(/\/api\/bulk/, body);
  SC.RunLoop.end();

  observeOnce(todo, 'id', function() {
    FakeServer.registerUrl(/\/api\/bulk/, {}, 500);

    SC.RunLoop.begin();
    todo.destroy();
    project.destroy();
    SC.RunLoop.end();

    when(
      observeUntilStatus(todo, SC.Record.ERROR, function() {
        equals(store.statusString(todo.get('storeKey')), 'ERROR');
      }),
      observeUntilStatus(project, SC.Record.ERROR, function() {
        equals(store.statusString(project.get('storeKey')), 'ERROR');
      })
    ).then(function() {
      start();
    });
  });
});
