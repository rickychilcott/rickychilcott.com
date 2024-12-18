require "dotenv/load"
require "faraday"
require "active_support/all"

class Builders::PrStats < SiteBuilder
  AUTHOR = "rickychilcott"
  GITHUB_PAT = ENV.fetch("GITHUB_PAT")
  PR_STATS_FILE = "src/_data/pr_stats.yml"

  def build
    hook :site, :post_read do
      if 2.hours.ago.after?(File.mtime(PR_STATS_FILE))
        info "PR stats file is up to date"
        next
      end

      info "Writing PR stats to #{PR_STATS_FILE}"
      YAML.dump(pr_data, File.open(PR_STATS_FILE, "w"))
    end
  end

  private

  def pr_data
    merged_prs_by_repo.map do |repo, prs|
      prs =
        prs
          .map do |pr|
            pr
              .slice(:pr_created_at, :pr_title, :pr_url, :pr_id)
              .stringify_keys
              .transform_keys { |key| key.gsub("pr_", "") }
          end

      {
        "name" => repo[:repository],
        "repository_name" => repo[:repository_name],
        "url" => repo[:repository_url],
        "prs" => prs
      }
    end
  end

  def github
    Faraday.new(url: "https://api.github.com") do |faraday|
      faraday.headers["Accept"] = "application/vnd.github+json"
      faraday.headers["Authorization"] = GITHUB_PAT
      faraday.headers["X-GitHub-Api-Version"] = "2022-11-28"

      faraday.response :json
      faraday.use Faraday::Response::RaiseError
    end
  end

  def merged_prs_by_repo
    merged_prs
      .map do |pr|
        {
          pr_created_at: Time.parse(pr.dig("created_at")),
          pr_title: pr.dig("title"),
          pr_url: pr.dig("html_url"),
          pr_id: pr.dig("id"),
          repository: pr.dig("repository_url").split("/").slice(-2, 2).join("/"),
          repository_name: pr.dig("repository_url").split("/").last,
          repository_url: pr.dig("repository_url")
        }
      end
      .sort_by { |pr| pr[:pr_created_at] }
      .reverse
      .group_by { |pr| pr.slice(:repository, :repository_name, :repository_url) }
  end

  def merged_prs = get_prs.select { |pr| pr.dig("state") == "closed" && pr.dig("pull_request", "merged_at") }

  def get_prs(author = AUTHOR, page = 1)
    response =
      github
        .get("/search/issues?q=author:#{author}+type:pr&page=#{page}")
        .body

    return response["items"] if response["items"].empty?

    response["items"] + get_prs(author, page + 1)
  end
end
