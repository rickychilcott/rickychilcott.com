class Builders::Purgecss < SiteBuilder
  def build
    return if config[:watch] # don't run in "watch mode"

    hook :site, :post_write do
      purgecss_file = site.in_root_dir("purgecss.config.js")

      unless File.exist?(purgecss_file)
        config_js = <<~PURGE
          module.exports = {
            content: ['frontend/javascript/*.js','./output/**/*.html'],
            output: "./output/_bridgetown/static"
          }
        PURGE
        File.write(purgecss_file, config_js.strip)
      end

      manifest_file = File.join(site.frontend_bundling_path, "manifest.json")

      if File.exist?(manifest_file)
        manifest = JSON.parse(File.read(manifest_file))

        if Bridgetown::Utils.frontend_bundler_type == :esbuild
          css_file = (manifest["styles/index.css"] || manifest["styles/index.scss"]).split("/").last
          css_path = ["output", "_bridgetown", "static", css_file].join("/")
        else
          css_file = manifest["main.css"].split("/").last
          css_path = ["output", "_bridgetown", "static", "css", css_file].join("/")
        end

        info "Purging #{css_file}"
        oldsize = File.stat(css_path).size / 1000
        system "./node_modules/.bin/purgecss -c purgecss.config.js -css #{css_path}"
        newsize = File.stat(css_path).size / 1000

        if newsize < oldsize
          info "Done! File size reduced from #{oldsize}kB to #{newsize}kB"
        else
          info "Done. No apparent change in file size (#{newsize}kB)."
        end
      end
    end
  end
end
