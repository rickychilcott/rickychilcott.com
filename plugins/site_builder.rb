class SiteBuilder < Bridgetown::Builder
  private

  def info(*args)
    Bridgetown.logger.info(self.class.name, *args)
  end
end
