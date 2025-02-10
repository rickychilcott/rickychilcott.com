source "https://rubygems.org"
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

gem "dotenv", "~> 3.0", require: "dotenv/load"

gem "bridgetown", "2.0.0.beta3"
# gem "bridgetown-routes", "2.0.0.beta3"

# Puma is the Rack-compatible web server used by Bridgetown
# (you can optionally limit this to the "development" group)
gem "puma", "< 7"

# Uncomment to use the Inspectors API to manipulate the output
# of your HTML or XML resources:
# gem "nokogiri", "~> 1.13"

# Or for faster parsing of HTML-only resources via Inspectors, use Nokolexbor:
# gem "nokolexbor", "~> 0.4"

gem "bridgetown-quick-search", "~> 3.0"
gem "commonmarker", "~> 2.0"
gem "faraday", "~> 2.0"

group :development do
  gem "standardrb", "~> 1.0"

  gem "ferrum", "~> 0.16"
end

group :production do
  gem "down", "~> 5.2"
end