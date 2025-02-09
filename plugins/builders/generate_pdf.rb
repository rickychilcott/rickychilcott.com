class Builders::GeneratePdf < SiteBuilder
  def build
    return if pdf_config.empty?

    hook :site, :post_write, priority: :low do
      require "ferrum"
      browser = Ferrum::Browser.new
      page = browser.create_page

      pdf_config.each do |config|
        input, output, options = config["input"], config["output"], config["options"] || {}
        input_file = destination.join(input)
        path = destination.join(output).to_s

        options[:path] = path
        options[:paper_width] ||= 8.5
        options[:paper_height] ||= 11.0

        if !input_file.exist?
          warn "Input file not found: #{input}"
          next
        end

        content = input_file.read

        info "Generating PDF: #{path}"
        page = browser.create_page
        page.content = content
        page.pdf(**options)
      end
    end
  end

  private

  def pdf_config
    site.config.dig("generate_pdf")
  end

  def destination = Pathname.new(site.destination)
end
