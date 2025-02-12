class Article < Bridgetown::Component
  def initialize(title:, date:, url:, body:)
    @title, @date, @url, @body = title, date, url, body
  end
end
