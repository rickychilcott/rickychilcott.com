class SiteBuilder < Bridgetown::Builder
  private

  def info(*args)
    Bridgetown.logger.info(builder_name, *args)
  end

  def warn(*args)
    Bridgetown.logger.warn(builder_name, *args)
  end

  def builder_name
    self.class.name.split("::").slice(1..).join("::")
  end
end
