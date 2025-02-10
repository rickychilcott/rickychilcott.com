class Bridgetown::Converters::Markdown::CommonMark
  def initialize(config)
    require "commonmarker"

    @config = config
  rescue LoadError
    warn "You are missing a library required for Markdown. Please run:"
    warn "  bundle add commonmarker"
    raise "Missing dependency: commonmarker"
  end

  def convert(content)
    puts "Converting content with CommonMark"

    ::Commonmarker.to_html(content, options: {
      parse: {
        smart: true,
        relaxed_autolinks: true
      },
      render: {
        unsafe: true
      },
      extension: {
        tagfilter: false,
        spoiler: true,
        alerts: true,
        underline: true
      },
      plugins: {
        syntax_highlighter: {
          theme: "InspiredGitHub"
        }
      }
    }).html_safe
  end
end
