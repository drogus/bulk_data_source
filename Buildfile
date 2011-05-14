config :all,
       :required => ['sproutcore/datastore', 'sproutcore/ajax'],
       :test_required  => ['sproutcore/foundation', 'sproutcore/datastore', 'sproutcore/ajax'],
       :debug_required => ['sproutcore/foundation', 'sproutcore/datastore', 'sproutcore/ajax']

# CORE FRAMEWORKS
config :foundation, :required => []

# WRAPPER FRAMEWORKS
config :bulk_data_source, :required => [:foundation]
