var store, fooId, barId;

SC.TestStore = SC.Store.extend({
});

var Todo = SC.Record.extend({
  primaryKey: 'id',
  title: SC.Record.attr(String),
  isDone: SC.Record.attr(Boolean, { defaultValue: NO, key: "done" })
});

Todo.mixin({
  resourceName: 'todo',
  pluralResourceName: 'todos'
});

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
  expect(3);
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
