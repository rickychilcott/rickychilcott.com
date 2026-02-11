Bundler.require(:default, Bridgetown.environment)

Bridgetown.configure do |config|
  # You can configure the inflector used by Zeitwerk. In v2.0,
  # ActiveSupport::Inflector will become the default.
  #
  # config.inflector = ActiveSupport::Inflector
  #
  # Add new inflection rules using the following format. Inflections
  # are locale specific, and you may define rules for as many different
  # locales as you wish. All of these examples are active by default:
  # ActiveSupport::Inflector.inflections(:en) do |inflect|
  #   inflect.plural /^(ox)$/i, "\\1en"
  #   inflect.singular /^(ox)en/i, "\\1"
  #   inflect.irregular "person", "people"
  #   inflect.uncountable %w( fish sheep )
  # end
  #
  # These inflection rules are supported but not enabled by default:
  # ActiveSupport::Inflector.inflections(:en) do |inflect|
  #   inflect.acronym "RESTful"
  # end

  init :"bridgetown-quick-search"
  init :"bridgetown-sitemap"
  init :dotenv

  # Uncomment to use Bridgetown SSR (aka dynamic rendering of content via Roda):
  #
  # init :ssr
  #

  # Uncomment to use file-based dynamic template routing via Roda (make sure you
  # uncomment the gem dependency in your `Gemfile` as well):
  #
  # init :"bridgetown-routes"
  #

  # We also recommend that if you're using Roda routes you include this plugin
  # so you can get a generated routes list in `.routes.json`. You can then run
  # `bin/bridgetown roda:routes` to print the routes. (This will require you to
  # comment your route blocks. See example in `server/routes/hello.rb.sample`.)
  #
  # only :server do
  #   init :parse_routes
  # end
  #

  # For more documentation on how to configure your site using this initializers file,
  # visit: https://edge.bridgetownrb.com/docs/configuration/initializers/
end
