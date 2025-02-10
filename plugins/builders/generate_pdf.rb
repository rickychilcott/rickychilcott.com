class Builders::GeneratePdf < SiteBuilder
  def build
    return if pdf_config.empty?

    hook :site, :post_write, priority: :low do
      pdf_config.each do |config|
        input, output, options = config["input"], config["output"], config["options"] || {}
        input_file = destination.join(input)
        output_file = destination.join(output)
        output_filename = output_file.basename.to_s

        options[:paper_width] ||= 8.5
        options[:paper_height] ||= 11.0

        if !input_file.exist?
          warn "Input file not found: #{input}"
          next
        end

        content = input_file.read

        info "Generating PDF: #{output_file}"

        pdf_adapter
          .new(content, filename: output_filename, options:)
          .write_file(output_file)
      end
    end
  end

  private

  def pdf_adapter
    return Api2Pdf if Bridgetown.environment.production?

    LocalFerrum
  end

  def pdf_config
    site.config.dig("generate_pdf")
  end

  def destination = Pathname.new(site.destination)

  class Api2Pdf
    require "dotenv/load"
    API2PDF_API_KEY = ENV.fetch("API2PDF_API_KEY")

    def initialize(html, filename:, options: {})
      @html = html
      @filename = filename
      @options = options
    end

    def write_file(path)
      pdf_content = pdf_file.read

      File.write(path, pdf_content)
    end

    private

    def pdf_file
      require "down"
      Down.open(converted_url)
    end

    def converted_url
      @converted_url ||=
        faraday_connection
          .post("/chrome/pdf/html") do |req|
            body = api_2_pdf_options.to_json
            req.body = body
          end
          .body
          .fetch("FileUrl")
    end

    attr_reader :html, :filename, :options

    def faraday_connection
      @faraday_connection ||=
        Faraday.new(url: "https://v2.api2pdf.com") do |f|
          f.headers = {Authorization: API2PDF_API_KEY}
          f.request :json
          f.response :json
        end
    end

    def api_2_pdf_options
      # See https://app.swaggerhub.com/apis-docs/api2pdf/api2pdf/2.0.0#/Headless%20Chrome/chromePdfFromHtmlPost
      # and https://www.api2pdf.com/documentation/advanced-options-headless-chrome/

      {
        html:,
        inline: true,
        fileName: filename,
        options: {
          marginTop: options.delete(:margin_top),
          marginLeft: options.delete(:margin_left),
          marginBottom: options.delete(:margin_bottom),
          marginRight: options.delete(:margin_right),
          printBackground: options.delete(:print_background),
          **options
        }.compact,
        useCustomStorage: false
      }
    end
  end

  class LocalFerrum
    def initialize(html, filename:, options:)
      @html = html
      @filename = filename
      @options = options.dup
      @browser = Ferrum::Browser.new
    end

    def write_file(path)
      options[:path] = path

      page = browser.create_page
      page.content = html
      page.pdf(**options)
    end

    private

    attr_reader :html, :filename, :options, :browser
  end
end
