---
published: 2025-09-19
layout: post
title: Mastering PostgreSQL JSONB Queries in Rails
tags:
  - postgresql
  - sql
  - rails
  - jsonb
  - database
abstract: Learn how to effectively query PostgreSQL JSONB columns in Rails applications, from basic operations to advanced scoping patterns. Includes real-world examples from a production application.
kind: technical
sitemap: true
---
As Rails developers, we often rely on ActiveRecord's powerful ORM to handle our database interactions. However, when working with PostgreSQL's JSONB columns, we sometimes need to drop down to raw SQL to unlock the full potential of these flexible data structures.

In this article, we'll explore how to effectively query JSONB columns in Rails, using real examples from a production application that manages organization settings.

## The Problem: Flexible Settings Storage

Consider an `OrganizationSettings` model that stores various feature flags and configuration options. Instead of creating individual columns for each setting, we use a JSONB column for flexibility:

```ruby
create_table "organization_settings", force: :cascade do |t|
  t.jsonb "settings", default: {}, null: false
  t.integer "owner_id", null: false
  t.datetime "created_at", precision: nil, null: false
  t.datetime "updated_at", precision: nil, null: false
  t.string "owner_type", null: false
  t.index ["owner_type", "owner_id"], name: "index_organization_settings_on_owner"
end
```

The `settings` column contains a hash of configuration options:

```ruby
{
  "show_logo" => true,
  "allow_tags" => false,
  "enable_links" => true,
  "enable_notes" => true,
  "primary_color" => "",
  "tertiary_color" => "",
  "secondary_color" => "",
  "enable_strategies" => false,
  "allow_filter_items" => false,
  "enable_attachments" => true,
  "hide_metrics_subapp" => false,
  "hide_reports_subapp" => false,
  "hide_toolbox_subapp" => false,
  "tease_metrics_subapp" => false,
  "always_show_full_name" => false,
  "hide_documents_subapp" => false,
  "hide_discussion_subapp" => false,
  "goal_champion_count_max" => 2,
  "plan_champion_count_max" => 2,
  "allow_metric_pdf_download" => false,
  "allow_report_pdf_download" => false,
  "metric_champion_count_max" => 2,
  "allow_goal_request_mailers" => false,
  "allow_gpu_recency_filtering" => false,
  "strategy_champion_count_max" => 2,
  "allow_metric_request_mailers" => false,
  "focus_area_champion_count_max" => 2,
  "allow_goal_timeframe_filtering" => false,
  "show_email_address_for_members" => true,
  "skip_concierge_onboarding_offer" => false,
  "allow_goal_progress_update_to_team_members" => true,
  "allow_metric_measurement_update_to_advisors" => false,
  "allow_metric_measurement_update_to_champions" => true
}
```

## Basic JSONB Querying

### The Naive Approach

When you need to find all organizations with a specific setting enabled, you might start with:

```ruby
Organization
  .joins(:setting)
  .joins(:logo_attachment) # ensures presence of logo
  .where("organization_settings.settings ->> ? = ?", "show_logo", "true")
```

This works, but the PostgreSQL operators `->>` and `->` are cryptic and make the code hard to understand.

### Creating Reusable Scopes

Let's create a more maintainable approach with custom scopes:

```ruby
class OrganizationSetting < ApplicationRecord
  scope :setting_equals, ->(key, val = true) {
    where("settings ->> ? = ?", key.to_s, val.to_s)
  }
end
```

Now our query becomes much clearer:

```ruby
Organization
  .joins(:setting)
  .joins(:logo_attachment) # ensures presence of logo
  .merge(OrganizationSetting.setting_equals(:show_logo, true))
```

## Advanced JSONB Querying

### Multiple Settings at Once

What if we need to query for multiple settings simultaneously? We can enhance our scope to accept multiple key-value pairs:

```ruby
class OrganizationSetting < ApplicationRecord
  scope :setting_equals, ->(**kwargs) {
    raise ArgumentError, "Provide at least one setting" if kwargs.empty?

    where("settings @> ?", kwargs.to_json)
  }
end
```

The `@>` operator checks if the left JSONB value contains the right JSONB value. This allows us to write elegant queries like:

```ruby
# Find organizations with both features enabled
OrganizationSetting.setting_equals(
  show_logo: true,
  enable_links: true
)

# Find organizations with specific limits
OrganizationSetting.setting_equals(
  goal_champion_count_max: 2,
  plan_champion_count_max: 2
)
```

### Understanding the Operators

PostgreSQL provides several JSONB operators that are useful in different scenarios:

- `->` - Returns JSON object field as JSON
- `->>` - Returns JSON object field as text
- `@>` - Does the left JSONB value contain the right JSONB value?
- `<@` - Does the left JSONB value exist within the right JSONB value?
- `?` - Does the key exist as a top-level key?
- `?&` - Do all of these keys exist as top-level keys?
- `?|` - Do any of these keys exist as top-level keys?

### Type Casting Considerations

JSONB stores everything as text, so be careful with type comparisons:

```ruby
# This might not work as expected
OrganizationSetting.where("settings ->> 'goal_champion_count_max' = ?", 2)

# Better: cast to the appropriate type
OrganizationSetting.where("(settings ->> 'goal_champion_count_max')::integer = ?", 2)

# Or use the @> operator which handles type coercion
OrganizationSetting.where("settings @> ?", { goal_champion_count_max: 2 }.to_json)
```

## Performance Considerations

### Indexing JSONB Columns

For frequently queried JSONB fields, consider adding specific indexes:

```ruby
# GIN index for general JSONB queries
add_index :organization_settings, :settings, using: :gin

# Expression index for specific fields
add_index :organization_settings,
  "((settings->>'allow_goal_request_mailers')::boolean)",
  where: "deleted_at IS NULL",
  name: "idx_org_settings_allow_mailers_true"
```

### Query Performance Analysis

Always analyze your queries to understand their performance characteristics:

```ruby
OrganizationSetting.setting_equals(allow_goal_request_mailers: true).explain
```

This will show you the query plan and help identify when indexes are being used effectively.

## Best Practices

### 1. Use Scopes for Reusability

Instead of writing raw SQL in your controllers or services, create descriptive scopes that encapsulate the JSONB query logic.

### 2. Consider Type Safety

Be explicit about type casting when comparing JSONB values to ensure predictable results.

### 3. Index Strategically

Add indexes for frequently queried JSONB paths, but don't over-index as JSONB indexes can be large.

### 4. Test Edge Cases

JSONB queries can behave differently with null values, missing keys, and type mismatches. Test these scenarios thoroughly.

### 5. Document Complex Queries

When using advanced JSONB operators, add comments explaining the intent and expected behavior.

## Alternative Approaches

### Separate Columns for Critical Settings

For settings that are queried frequently, consider extracting them to separate columns:

```ruby
# Add a column for frequently queried settings
add_column :organization_settings, :show_logo, :boolean, default: false

# Keep the JSONB for less frequently queried settings
# This gives you the best of both worlds
```

### Using Rails' Store Accessor

For a more Rails-like approach, you can use `store_accessor`:

```ruby
class OrganizationSetting < ApplicationRecord
  store_accessor :settings, :show_logo, :enable_links, :allow_tags

  # Now you can query like regular attributes
  scope :with_logo_enabled, -> { where(show_logo: true) }
end
```

## Conclusion

PostgreSQL's JSONB columns offer incredible flexibility for storing semi-structured data, but they require careful consideration when querying. By creating reusable scopes, understanding the available operators, and implementing proper indexing strategies, you can build robust applications that leverage the full power of JSONB while maintaining good performance and code readability.

The key is to start simple with basic queries and gradually introduce more sophisticated patterns as your application's needs evolve. Always measure performance and consider alternative approaches when JSONB queries become a bottleneck.
