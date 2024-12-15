require "open3"

class Builders::LocalSync < SiteBuilder
  def build
    return unless config["local_sync"]

    hook :site, :post_read do
      config["local_sync"].each do |sync|
        from = sync.fetch("from")
        to = sync.fetch("to")
        rsync_options = sync.fetch("rsync_options", "-av --delete")

        Bridgetown.logger.info "Local Sync", "syncing #{from} to #{to}..."
        capture "rsync #{rsync_options} #{from} #{to}"
      end
    end
  end

  def capture(cmd)
    stdout, stderr, status = Open3.capture3(cmd)
    raise "Command failed: #{cmd}\n#{stderr}" unless status.success?
    stdout
  end
end
