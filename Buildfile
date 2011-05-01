config :all,
  :required => ['sproutcore/datastore'],
  :test_required  => ['sproutcore/foundation', 'sproutcore/datastore'],
  :debug_required => ['sproutcore/foundation', 'sproutcore/datastore']

# CORE FRAMEWORKS
config :foundation, :required => []

# WRAPPER FRAMEWORKS
config :bulk_data_source, :required => [:foundation]
