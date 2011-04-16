require 'rubygems'
require 'bundler'
Bundler.setup

require "active_record/railtie"
require "action_controller/railtie"
require 'sproutcore/rails'

# without that line Rails throws ConnectionNotEstablished error
# TODO: investigate
ENV["RAILS_ENV"] = 'production'

Rails.backtrace_cleaner.remove_silencers!

class Rails::Application::Configuration
  # just to trick rails
  def database_configuration
    {'production' => {'adapter' => 'sqlite3', 'database' => "db/db.sqlite3"}}
  end
end

module TestApp
  class Application < Rails::Application
    routes.draw do
      sproutcore("/api/bulk")
      match "/clear_database" => "main#clear_database"
    end

    config.active_support.deprecation = :notify
    config.secret_token = "99138d86a49ebbda9a602ea8423d2b3a99138d86a49ebbda9a602ea8423d2b3a"
  end
end

class Todo < ActiveRecord::Base
end

class MainController < ActionController::Base
  def clear_database
    Todo.destroy_all
    render :nothing => true
  end
end

Sproutcore::Engine.resources :todos
Rails.application.initialize!

unless ActiveRecord::Base.connection.tables.include?("todos")
  class CreateTodos < ActiveRecord::Migration
    def self.up
      create_table(:todos) do |t|
        t.string :title
        t.boolean :done
      end
    end
  end

  ActiveRecord::Migration.verbose = false
  CreateTodos.migrate(:up)
end

require 'rack/handler/webrick'
Thread.abort_on_exception = true
Thread.new do
  # TODO: Thin fails to start, probably because it's also used by sproutcore, check if there
  #       is any possibility to run 2 instances in one process
  Rack::Handler::WEBrick.run(Rails.application, :Port => '9021', :AccessLog => [], :Logger => WEBrick::Log::new(nil, 0))
end.run
