if ENV["TESTS"]
  # we're running tests, run rack app for it
  require File.expand_path('../lib/test_app', __FILE__)
  ENV["TESTS"] = nil
end

config :all,
  :required => ['sproutcore/datastore'],
  :test_required  => ['sproutcore/foundation', 'sproutcore/datastore'],
  :debug_required => ['sproutcore/foundation', 'sproutcore/datastore']

# CORE FRAMEWORKS
config :foundation, :required => []

# WRAPPER FRAMEWORKS
config :rails_data_source, :required => [:foundation]

mode :tests do
  proxy '/api/bulk', :to => 'localhost:9021', :url => '/api/bulk'
  proxy '/clear_database', :to => 'localhost:9021', :url => '/clear_database'
end
