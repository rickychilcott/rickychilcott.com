require "open3"

class Builders::Gist < SiteBuilder
  def build
    helper :gist do |gist_id, file|
      gist_script_tag(gist_id, file)
    end
  end

  def gist_script_tag(gist_id, filename = nil)
    url = "https://gist.github.com/#{gist_id}.js"
    url = "#{url}?file=#{filename}" unless filename.to_s.empty?

    "<script src=\"#{url}\"></script>".html_safe
  end
end
