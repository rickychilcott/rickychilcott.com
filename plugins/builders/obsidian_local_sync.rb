require "open3"
require "active_support/core_ext/object/inclusion"

class Builders::ObsidianLocalSync < SiteBuilder
  REGEX_WIKILINK = /(?<!!)\[\[([^\]]+?)(?:\|([^\]]+))?\]\]/
  REGEX_IMAGE = /!\[\[(.+?)\]\]/

  def build
    return if ENV["BRIDGETOWN_ENV"] == "production"
    return unless locations

    hook :site, :post_read do
      locations.each do |sync_options|
        from = Pathname.new(base_path).join(sync_options.fetch("from"))
        to = source_dir.join(sync_options.fetch("to"))
        rsync_options = sync_options.fetch("rsync_options", "-av --delete")

        info "syncing #{from}/ to #{to}/..."
        execute "rsync #{rsync_options} #{from}/ #{to}/"
      end
    end

    generator :copy_wikilinks
    generator :copy_images
  end

  private

  def source_dir = Pathname.new(site.in_source_dir)

  def locations = config.dig("obsidian_local_sync", "locations")

  def base_path = config.dig("obsidian_local_sync", "vault_base_path")

  def execute(cmd)
    stdout, stderr, status = Open3.capture3(cmd)
    raise "Command failed: #{cmd}\n#{stderr}" unless status.success?
    stdout
  end

  def copy_wikilinks
    line_matching(REGEX_WIKILINK, skip_code_blocks: true) do |match|
      raise NotImplementedError, "copying wikilinks is not yet supported"
      # wikilink = Regexp.last_match(1)
      # wikilink_title = Regexp.last_match(2) || wikilink
      # "[#{wikilink_title}](#{url_for("_posts/#{wikilink}.md")})"
    end
  end

  def copy_images
    line_matching(REGEX_IMAGE, skip_code_blocks: true) do |match|
      raise NotImplementedError, "copying images is not yet supported"
      # image = Regexp.last_match(1)
      # "![](/#{image})"
    end
  end

  private

  def line_matching(regex, skip_code_blocks: false, &block)
    collections.each do |collection|
      collection.resources.each do |resource|
        lines = resource.content.split("\n")

        in_code_block = false
        lines.each do |line|
          # toggle in_code_block if skip_code_blocks is true and line starts with ```
          in_code_block = !in_code_block if skip_code_blocks && line.start_with?("```")

          next if in_code_block

          line.gsub!(regex, &block)
        end
      end
    end
  end

  def collections
    @collections ||= begin
      location_destination_paths = locations.map { it.fetch("to") }

      site
        .collections
        .map { _2 }
        .select { it.relative_path.in?(location_destination_paths) }
    end
  end

  def url_for(...)
    Bridgetown::RubyTemplateView::Helpers.new(resource, site).url_for(...)
  end
end
