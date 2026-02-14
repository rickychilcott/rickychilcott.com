class Article < Bridgetown::Component
  def initialize(title:, date:, url:, body:, word_count: 0)
    @title, @date, @url, @body = title, date, url, body
    @reading_time = [(word_count / 200.0).ceil, 1].max
  end
end
