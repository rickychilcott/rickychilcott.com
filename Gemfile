source "https://rubygems.org"
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

gem "bridgetown-sitemap", "~> 3.0"
gem "bridgetown", "~> 2.0"
gem "commonmarker", "~> 2.0"
gem "htmlcompressor", "~> 0.4"
gem "dotenv", "~> 3.0", require: "dotenv/load"
gem "faraday", "~> 2.0"
gem "nokogiri"
gem "reverse_markdown", "~> 3.0"
gem "truncato", "~> 0.7"

group :development do
  gem "puma", "~> 7"
  gem "standardrb", "~> 1.0"

  gem "ferrum", "~> 0.16"
end

group :production do
  gem "down", "~> 5.2"
end
